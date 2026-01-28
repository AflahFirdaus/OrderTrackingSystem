import { query, queryOne, execute } from "@/lib/Mysql/server";
import { requireAuth } from "@/lib/auth";
import { canProcessOrder, getNextStatus } from "@/lib/constants";
import { NextResponse } from "next/server";
import type { UserRole } from "@/types/database";
import type { RowDataPacket } from "mysql2/promise";

interface Order extends RowDataPacket {
  id: string;
  order_id_marketplace: string;
  nama_pembeli: string;
  platform_penjualan: string;
  status: string;
  tanggal_pemesanan: string;
  total_harga: number;
  keterangan: string | null;
  expedisi: string;
  resi: string | null;
  qr_token: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
  created_by_user_nama?: string;
  created_by_user_username?: string;
}

interface OrderItem extends RowDataPacket {
  id: string;
  order_id: string;
  nama_produk: string;
  qty: number;
  harga_satuan: number;
  created_at: string;
  updated_at: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Get current user
    const userData = await requireAuth();
    const userRole = userData.role as UserRole;

    // Find order by QR token
    const order = await queryOne<Order>(
      `SELECT o.*, u.id as created_by_user_id, u.nama as created_by_user_nama, u.username as created_by_user_username
       FROM orders o
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.qr_token = ?`,
      [token]
    );

    if (!order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 }
      );
    }

    const items = await query<OrderItem[]>(
      "SELECT * FROM order_items WHERE order_id = ?",
      [order.id]
    );

    const orderWithItems = {
      ...order,
      order_items: items,
      created_by_user: order.created_by_user_id
        ? {
            id: order.created_by_user_id,
            nama: order.created_by_user_nama,
            username: order.created_by_user_username,
          }
        : undefined,
    };

    // Check if user can process this order
    const canProcess = canProcessOrder(userRole, order.status as any);
    
    // Special message for gudang trying to scan already processed order
    let warningMessage = null;
    if (userRole === "gudang" && order.status !== "DIBUAT") {
      // All statuses except DIBUAT means order has been processed
      if (order.status === "DITERIMA_GUDANG" || order.status === "PACKING" || order.status === "DIKIRIM" || order.status === "SELESAI" || order.status === "DIBATALKAN") {
        warningMessage = "Orderan telah di proses gudang";
      }
    }

    return NextResponse.json({
      order: orderWithItems,
      user: userData,
      canProcess,
      nextStatus: canProcess ? getNextStatus(order.status as any) : null,
      warningMessage,
    });
  } catch (error) {
    console.error("Error scanning QR:", error);
    return NextResponse.json(
      { error: "Gagal memproses scan QR" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Get current user
    const userData = await requireAuth();
    const userRole = userData.role as UserRole;

    // Find order by QR token
    const order = await queryOne<Order>(
      "SELECT * FROM orders WHERE qr_token = ?",
      [token]
    );

    if (!order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validate if user can process this order
    if (!canProcessOrder(userRole, order.status as any)) {
      // Special message for gudang trying to scan already processed order
      let errorMessage = `Anda tidak dapat memproses order dengan status ${order.status}`;
      
      if (userRole === "gudang" && order.status !== "DIBUAT") {
        // All statuses except DIBUAT means order has been processed
        if (order.status === "DITERIMA_GUDANG" || order.status === "PACKING" || order.status === "DIKIRIM" || order.status === "SELESAI" || order.status === "DIBATALKAN") {
          errorMessage = "Orderan telah di proses gudang. Tidak dapat diproses ulang.";
        }
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 403 }
      );
    }

    // Get next status
    const nextStatus = getNextStatus(order.status as any);
    if (!nextStatus) {
      return NextResponse.json(
        { error: "Status order sudah final" },
        { status: 400 }
      );
    }

    // Update order status
    await execute(
      "UPDATE orders SET status = ? WHERE id = ?",
      [nextStatus, order.id]
    );

    // Fetch updated order
    const updatedOrder = await queryOne<Order>(
      `SELECT o.*, u.id as created_by_user_id, u.nama as created_by_user_nama, u.username as created_by_user_username
       FROM orders o
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = ?`,
      [order.id]
    );

    if (!updatedOrder) {
      throw new Error("Failed to fetch updated order");
    }

    const items = await query<OrderItem[]>(
      "SELECT * FROM order_items WHERE order_id = ?",
      [order.id]
    );

    const orderWithItems = {
      ...updatedOrder,
      order_items: items,
      created_by_user: updatedOrder.created_by_user_id
        ? {
            id: updatedOrder.created_by_user_id,
            nama: updatedOrder.created_by_user_nama,
            username: updatedOrder.created_by_user_username,
          }
        : undefined,
    };

    return NextResponse.json({
      success: true,
      order: orderWithItems,
      message: `Order berhasil diproses. Status: ${nextStatus}`,
    });
  } catch (error: any) {
    console.error("Error processing order:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses order" },
      { status: 500 }
    );
  }
}
