import { query, queryOne, execute } from "@/lib/Mysql/server";
import { generateQrToken } from "@/lib/utils/qr-token";
import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let sql = `
      SELECT 
        o.*,
        u.id as created_by_user_id,
        u.nama as created_by_user_nama,
        u.username as created_by_user_username
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) {
      sql += " AND o.status = ?";
      params.push(status);
    }

    if (search) {
      sql += " AND (o.order_id_marketplace LIKE ? OR o.nama_pembeli LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    sql += " ORDER BY o.created_at DESC";

    const orders = await query<Order[]>(sql, params);

    // Fetch order items for each order
    const ordersWithItems: OrderWithItems[] = await Promise.all(
      orders.map(async (order) => {
        const items = await query<OrderItem[]>(
          "SELECT * FROM order_items WHERE order_id = ?",
          [order.id]
        );

        return {
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
      })
    );

    return NextResponse.json(ordersWithItems);
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    
    if (error.message?.includes("Missing MySQL") || error.message?.includes("Missing DATABASE")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "Buat file .env.local di root project dengan MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, dan MYSQL_DATABASE"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Gagal mengambil data order", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      order_id_marketplace,
      nama_pembeli,
      platform_penjualan,
      tanggal_pemesanan,
      total_harga,
      keterangan,
      expedisi,
      resi,
      order_items,
      created_by,
    } = body;

    // Validasi required fields
    if (
      !order_id_marketplace ||
      !nama_pembeli ||
      !platform_penjualan ||
      !tanggal_pemesanan ||
      !expedisi ||
      !created_by ||
      !order_items ||
      !Array.isArray(order_items) ||
      order_items.length === 0
    ) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // Ensure all required fields are not undefined
    if (
      order_id_marketplace === undefined ||
      nama_pembeli === undefined ||
      platform_penjualan === undefined ||
      tanggal_pemesanan === undefined ||
      expedisi === undefined ||
      created_by === undefined
    ) {
      return NextResponse.json(
        { error: "Data tidak lengkap: field required tidak boleh undefined" },
        { status: 400 }
      );
    }

    // Calculate total_harga from order_items if not provided
    let calculatedTotalHarga: number = 0;
    if (total_harga !== undefined && total_harga !== null && total_harga !== '') {
      const parsed = parseFloat(total_harga.toString());
      if (!isNaN(parsed)) {
        calculatedTotalHarga = parsed;
      }
    }
    if (calculatedTotalHarga === 0 || isNaN(calculatedTotalHarga)) {
      calculatedTotalHarga = order_items.reduce((sum: number, item: any) => {
        const qty = parseInt(item.qty) || 0;
        const hargaSatuan = parseFloat(item.harga_satuan) || 0;
        return sum + (qty * hargaSatuan);
      }, 0);
    }
    // Ensure calculatedTotalHarga is a valid number
    if (isNaN(calculatedTotalHarga) || calculatedTotalHarga < 0) {
      calculatedTotalHarga = 0;
    }

    // Validasi anti-duplikasi order_id_marketplace
    const existingOrder = await queryOne<Order>(
      "SELECT id, order_id_marketplace, nama_pembeli, status FROM orders WHERE order_id_marketplace = ?",
      [order_id_marketplace]
    );

    if (existingOrder) {
      return NextResponse.json(
        { 
          error: "Order ID marketplace sudah terdaftar",
          details: `Order ID "${order_id_marketplace}" sudah digunakan untuk order dengan pembeli "${existingOrder.nama_pembeli}" (Status: ${existingOrder.status})`
        },
        { status: 409 }
      );
    }

    // Generate QR token
    const qr_token = generateQrToken();

    // Validate resi uniqueness if provided
    if (resi && resi.trim()) {
      const existingResi = await queryOne<Order>(
        "SELECT id FROM orders WHERE resi = ?",
        [resi.trim()]
      );

      if (existingResi) {
        return NextResponse.json(
          { error: "Resi sudah terdaftar untuk order lain" },
          { status: 409 }
        );
      }
    }

    // Generate UUID for order
    const orderId = crypto.randomUUID();

    // Insert order
    const insertOrderSql = `
      INSERT INTO orders (
        id, order_id_marketplace, nama_pembeli, platform_penjualan,
        status, tanggal_pemesanan, total_harga, keterangan,
        expedisi, resi, qr_token, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Ensure all parameters are not undefined (convert to null if needed)
    // Double check all values before passing to execute
    const insertParams = [
      orderId || null,
      order_id_marketplace || null,
      nama_pembeli || null,
      platform_penjualan || null,
      "DIBUAT",
      tanggal_pemesanan || null,
      (calculatedTotalHarga !== undefined && !isNaN(calculatedTotalHarga)) ? calculatedTotalHarga : 0,
      (keterangan === undefined || keterangan === null || keterangan === '') ? null : keterangan,
      expedisi || null,
      (resi && resi.trim()) ? resi.trim() : null,
      qr_token || null,
      created_by || null,
    ];
    
    // Final check: ensure no undefined values
    const finalParams = insertParams.map(p => p === undefined ? null : p);
    
    await execute(insertOrderSql, finalParams);

    // Insert order items
    if (order_items && Array.isArray(order_items) && order_items.length > 0) {
      const itemsToInsert = order_items
        .filter((item: any) => item.nama_produk && item.qty && item.harga_satuan)
        .map((item: any) => ({
          order_id: orderId,
          nama_produk: item.nama_produk,
          qty: parseInt(item.qty) || 0,
          harga_satuan: parseFloat(item.harga_satuan) || 0,
        }));

      if (itemsToInsert.length > 0) {
        const insertItemsSql = `
          INSERT INTO order_items (id, order_id, nama_produk, qty, harga_satuan)
          VALUES ${itemsToInsert.map(() => "(?, ?, ?, ?, ?)").join(", ")}
        `;
        
        const itemsParams = itemsToInsert.flatMap(item => [
          crypto.randomUUID(),
          item.order_id ?? null,
          item.nama_produk ?? null,
          item.qty ?? 0,
          item.harga_satuan ?? 0,
        ]);

        await execute(insertItemsSql, itemsParams);
      }
    }

    // Fetch complete order with items
    const completeOrder = await queryOne<Order>(
      `SELECT o.*, u.id as created_by_user_id, u.nama as created_by_user_nama, u.username as created_by_user_username
       FROM orders o
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (!completeOrder) {
      throw new Error("Failed to fetch created order");
    }

    const items = await query<OrderItem[]>(
      "SELECT * FROM order_items WHERE order_id = ?",
      [orderId]
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

    return NextResponse.json(orderWithItems, { status: 201 });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat order" },
      { status: 500 }
    );
  }
}
