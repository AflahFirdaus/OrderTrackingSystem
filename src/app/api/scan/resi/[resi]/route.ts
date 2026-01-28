import { query, queryOne, execute } from "@/lib/Mysql/server";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { OrderStatus } from "@/types/database";
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
  { params }: { params: Promise<{ resi: string }> }
) {
  try {
    // Only admin can access this endpoint
    await requireAdmin();

    const { resi } = await params;

    if (!resi || !resi.trim()) {
      return NextResponse.json(
        { error: "Resi tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Find order by resi
    const order = await queryOne<Order>(
      `SELECT o.*, u.id as created_by_user_id, u.nama as created_by_user_nama, u.username as created_by_user_username
       FROM orders o
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.resi = ?`,
      [resi.trim()]
    );

    if (!order) {
      return NextResponse.json(
        { error: "Resi tidak ditemukan" },
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

    // Validate order status
    const currentStatus = order.status as OrderStatus;
    
    // Cannot process cancelled orders
    if (currentStatus === "DIBATALKAN") {
      return NextResponse.json(
        { error: "Order dengan status DIBATALKAN tidak dapat diproses" },
        { status: 400 }
      );
    }

    // Cannot process orders that are already PACKING or beyond
    if (currentStatus === "PACKING" || currentStatus === "DIKIRIM" || currentStatus === "SELESAI") {
      return NextResponse.json(
        { 
          error: `Order dengan status ${currentStatus} tidak dapat diubah ulang menjadi PACKING`,
          order: orderWithItems
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      order: orderWithItems,
      canProcess: true,
    });
  } catch (error: any) {
    console.error("Error scanning resi:", error);
    
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: "Hanya admin yang dapat mengakses fitur ini" },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: "Gagal memproses scan resi", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resi: string }> }
) {
  try {
    // Only admin can access this endpoint
    await requireAdmin();

    const { resi } = await params;

    if (!resi || !resi.trim()) {
      return NextResponse.json(
        { error: "Resi tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Find order by resi
    const order = await queryOne<Order>(
      "SELECT * FROM orders WHERE resi = ?",
      [resi.trim()]
    );

    if (!order) {
      return NextResponse.json(
        { error: "Resi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validate order status
    const currentStatus = order.status as OrderStatus;
    
    // Cannot process cancelled orders
    if (currentStatus === "DIBATALKAN") {
      return NextResponse.json(
        { error: "Order dengan status DIBATALKAN tidak dapat diproses" },
        { status: 400 }
      );
    }

    // Cannot process orders that are already PACKING or beyond
    if (currentStatus === "PACKING" || currentStatus === "DIKIRIM" || currentStatus === "SELESAI") {
      return NextResponse.json(
        { 
          error: `Order dengan status ${currentStatus} tidak dapat diubah ulang menjadi PACKING`,
          order 
        },
        { status: 400 }
      );
    }

    // Update order status to PACKING
    await execute(
      "UPDATE orders SET status = 'PACKING' WHERE id = ?",
      [order.id]
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
      message: "Order berhasil diproses. Status diubah menjadi PACKING.",
    });
  } catch (error: any) {
    console.error("Error processing resi:", error);
    
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { error: "Hanya admin yang dapat mengakses fitur ini" },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Gagal memproses resi" },
      { status: 500 }
    );
  }
}
