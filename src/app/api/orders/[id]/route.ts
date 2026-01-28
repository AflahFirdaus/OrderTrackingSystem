import { query, queryOne, execute } from "@/lib/Mysql/server";
import { requireAuth } from "@/lib/auth";
import { canProcessOrder, getNextStatus } from "@/lib/constants";
import { NextResponse } from "next/server";
import type { OrderStatus, UserRole } from "@/types/database";
import type { RowDataPacket } from "mysql2/promise";
import crypto from "crypto";

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

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  created_by_user?: {
    id: string;
    nama: string;
    username: string;
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await queryOne<Order>(
      `SELECT o.*, u.id as created_by_user_id, u.nama as created_by_user_nama, u.username as created_by_user_username
       FROM orders o
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    const items = await query<OrderItem[]>(
      "SELECT * FROM order_items WHERE order_id = ?",
      [id]
    );

    const orderWithItems: OrderWithItems = {
      ...order,
      order_items: items,
      created_by_user: order.created_by_user_id
        ? {
            id: order.created_by_user_id as string,
            nama: order.created_by_user_nama as string,
            username: order.created_by_user_username as string,
          }
        : undefined,
    };

    return NextResponse.json(orderWithItems);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get current user
    const currentUser = await requireAuth();
    const userRole = currentUser.role as UserRole;

    // Get current order
    const order = await queryOne<Order>(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    );

    if (!order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 }
      );
    }

    // Handle status update
    if (body.status) {
      const newStatus = body.status as OrderStatus;

      // Admin can cancel or set any status
      if (userRole === "admin") {
        if (newStatus === "DIBATALKAN") {
          // Admin can cancel any order
        } else {
          // Admin can set any status
        }
      } else {
        // Gudang and Packing can only process orders
        if (!canProcessOrder(userRole, order.status as OrderStatus)) {
          return NextResponse.json(
            {
              error: `Anda tidak dapat memproses order dengan status ${order.status}`,
            },
            { status: 403 }
          );
        }

        // Get next status based on role
        const nextStatus = getNextStatus(order.status as OrderStatus);
        if (!nextStatus || newStatus !== nextStatus) {
          return NextResponse.json(
            { error: "Status tidak valid untuk proses ini" },
            { status: 400 }
          );
        }
      }

      // Build update SQL
      const updateFields: string[] = ["status = ?"];
      const updateParams: unknown[] = [newStatus];

      if (body.expedisi) {
        updateFields.push("expedisi = ?");
        updateParams.push(body.expedisi);
      }

      if (body.keterangan !== undefined) {
        updateFields.push("keterangan = ?");
        updateParams.push(body.keterangan);
      }

      updateParams.push(id);

      await execute(
        `UPDATE orders SET ${updateFields.join(", ")} WHERE id = ?`,
        updateParams
      );

      // Fetch updated order
      const updatedOrder = await queryOne<Order>(
        `SELECT o.*, u.id as created_by_user_id, u.nama as created_by_user_nama, u.username as created_by_user_username
         FROM orders o
         LEFT JOIN users u ON o.created_by = u.id
         WHERE o.id = ?`,
        [id]
      );

      if (!updatedOrder) {
        throw new Error("Failed to fetch updated order");
      }

      const items = await query<OrderItem[]>(
        "SELECT * FROM order_items WHERE order_id = ?",
        [id]
      );

      const orderWithItems: OrderWithItems = {
        ...updatedOrder,
        order_items: items,
        created_by_user: updatedOrder.created_by_user_id
          ? {
              id: updatedOrder.created_by_user_id as string,
              nama: updatedOrder.created_by_user_nama as string,
              username: updatedOrder.created_by_user_username as string,
            }
          : undefined,
      };

      return NextResponse.json(orderWithItems);
    }

    // Update other fields (only admin)
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate order_id_marketplace uniqueness if being updated
    if (body.order_id_marketplace && body.order_id_marketplace !== order.order_id_marketplace) {
      const existingOrder = await queryOne<Order>(
        "SELECT id, order_id_marketplace, nama_pembeli, status FROM orders WHERE order_id_marketplace = ? AND id != ?",
        [body.order_id_marketplace, id]
      );

      if (existingOrder) {
        return NextResponse.json(
          { 
            error: "Order ID marketplace sudah terdaftar",
            details: `Order ID "${body.order_id_marketplace}" sudah digunakan untuk order dengan pembeli "${existingOrder.nama_pembeli}" (Status: ${existingOrder.status})`
          },
          { status: 409 }
        );
      }
    }

    // Validate resi uniqueness if resi is being updated
    if (body.resi && body.resi.trim()) {
      const existingResi = await queryOne<Order>(
        "SELECT id FROM orders WHERE resi = ? AND id != ?",
        [body.resi.trim(), id]
      );

      if (existingResi) {
        return NextResponse.json(
          { error: "Resi sudah terdaftar untuk order lain" },
          { status: 409 }
        );
      }
    }

    // Calculate total_harga from order_items if order_items is provided
    let calculatedTotalHarga = body.total_harga;
    if (body.order_items && Array.isArray(body.order_items) && body.order_items.length > 0) {
      calculatedTotalHarga = body.order_items.reduce((sum: number, item: any) => {
        const qty = parseInt(item.qty) || 0;
        const hargaSatuan = parseFloat(item.harga_satuan) || 0;
        return sum + (qty * hargaSatuan);
      }, 0);
    }

    // Prepare order update data (exclude order_items from order update)
    const { order_items, ...orderUpdateData } = body;
    
    // Build update SQL dynamically
    const updateFields: string[] = [];
    const updateParams: unknown[] = [];

    if (orderUpdateData.order_id_marketplace !== undefined) {
      updateFields.push("order_id_marketplace = ?");
      updateParams.push(orderUpdateData.order_id_marketplace);
    }
    if (orderUpdateData.nama_pembeli !== undefined) {
      updateFields.push("nama_pembeli = ?");
      updateParams.push(orderUpdateData.nama_pembeli);
    }
    if (orderUpdateData.platform_penjualan !== undefined) {
      updateFields.push("platform_penjualan = ?");
      updateParams.push(orderUpdateData.platform_penjualan);
    }
    if (orderUpdateData.tanggal_pemesanan !== undefined) {
      updateFields.push("tanggal_pemesanan = ?");
      updateParams.push(orderUpdateData.tanggal_pemesanan);
    }
    if (calculatedTotalHarga !== undefined) {
      updateFields.push("total_harga = ?");
      updateParams.push(calculatedTotalHarga);
    }
    if (orderUpdateData.keterangan !== undefined) {
      updateFields.push("keterangan = ?");
      updateParams.push(orderUpdateData.keterangan);
    }
    if (orderUpdateData.expedisi !== undefined) {
      updateFields.push("expedisi = ?");
      updateParams.push(orderUpdateData.expedisi);
    }
    if (body.resi !== undefined) {
      updateFields.push("resi = ?");
      updateParams.push(body.resi && body.resi.trim() ? body.resi.trim() : null);
    }

    if (updateFields.length > 0) {
      updateParams.push(id);
      await execute(
        `UPDATE orders SET ${updateFields.join(", ")} WHERE id = ?`,
        updateParams
      );
    }

    // Update order_items if provided
    if (order_items && Array.isArray(order_items)) {
      // Delete existing order items
      await execute(
        "DELETE FROM order_items WHERE order_id = ?",
        [id]
      );

      // Insert new order items
      if (order_items.length > 0) {
        const itemsToInsert = order_items
          .filter((item: any) => item.nama_produk && item.qty && item.harga_satuan)
          .map((item: any) => ({
            id: crypto.randomUUID(),
            order_id: id,
            nama_produk: item.nama_produk,
            qty: parseInt(item.qty),
            harga_satuan: parseFloat(item.harga_satuan),
          }));

        if (itemsToInsert.length > 0) {
          const insertItemsSql = `
            INSERT INTO order_items (id, order_id, nama_produk, qty, harga_satuan)
            VALUES ${itemsToInsert.map(() => "(?, ?, ?, ?, ?)").join(", ")}
          `;
          
          const itemsParams = itemsToInsert.flatMap(item => [
            item.id,
            item.order_id,
            item.nama_produk,
            item.qty,
            item.harga_satuan,
          ]);

          await execute(insertItemsSql, itemsParams);
        }
      }
    }

    // Fetch complete updated order with items
    const completeOrder = await queryOne<Order>(
      `SELECT o.*, u.id as created_by_user_id, u.nama as created_by_user_nama, u.username as created_by_user_username
       FROM orders o
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (!completeOrder) {
      throw new Error("Failed to fetch updated order");
    }

    const items = await query<OrderItem[]>(
      "SELECT * FROM order_items WHERE order_id = ?",
      [id]
    );

    const orderWithItems: OrderWithItems = {
      ...completeOrder,
      order_items: items,
      created_by_user: completeOrder.created_by_user_id
        ? {
            id: completeOrder.created_by_user_id as string,
            nama: completeOrder.created_by_user_nama as string,
            username: completeOrder.created_by_user_username as string,
          }
        : undefined,
    };

    return NextResponse.json(orderWithItems);
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengupdate order" },
      { status: 500 }
    );
  }
}
