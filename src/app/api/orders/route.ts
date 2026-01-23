import { createClient } from "@/lib/supabase/server";
import { generateQrToken } from "@/lib/utils/qr-token";
import { NextResponse } from "next/server";
import type { Order, OrderItem } from "@/types/database";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        created_by_user:users!orders_created_by_fkey (id, nama, username)
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `order_id_marketplace.ilike.%${search}%,nama_pembeli.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      // If table doesn't exist
      if (error.code === "PGRST116" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database table 'orders' tidak ditemukan. Pastikan Anda sudah menjalankan DATABASE_SCHEMA.sql di Supabase.",
            details: error.message 
          },
          { status: 500 }
        );
      }
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    
    if (error.message?.includes("Missing Supabase")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "Buat file .env.local di root project dengan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY"
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
    const supabase = await createClient();
    const body = await request.json();

    const {
      order_id_marketplace,
      nama_pembeli,
      platform_penjualan,
      tanggal_pemesanan,
      total_harga,
      keterangan,
      expedisi,
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

    // Calculate total_harga from order_items if not provided
    let calculatedTotalHarga = total_harga;
    if (!calculatedTotalHarga || calculatedTotalHarga === 0) {
      calculatedTotalHarga = order_items.reduce((sum: number, item: any) => {
        const qty = parseInt(item.qty) || 0;
        const hargaSatuan = parseFloat(item.harga_satuan) || 0;
        return sum + (qty * hargaSatuan);
      }, 0);
    }

    // Validasi anti-duplikasi order_id_marketplace
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("order_id_marketplace", order_id_marketplace)
      .single();

    if (existingOrder) {
      return NextResponse.json(
        { error: "Order ID marketplace sudah terdaftar" },
        { status: 409 }
      );
    }

    // Generate QR token
    const qr_token = generateQrToken();

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_id_marketplace,
        nama_pembeli,
        platform_penjualan,
        status: "DIBUAT",
        tanggal_pemesanan,
        total_harga: calculatedTotalHarga,
        keterangan: keterangan || null,
        expedisi,
        qr_token,
        created_by,
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Insert order items
    if (order_items && Array.isArray(order_items) && order_items.length > 0) {
      const itemsToInsert: Omit<OrderItem, "id" | "created_at" | "updated_at">[] =
        order_items.map((item: any) => ({
          order_id: order.id,
          nama_produk: item.nama_produk,
          qty: item.qty,
          harga_satuan: item.harga_satuan,
        }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) {
        // Rollback order jika items gagal
        await supabase.from("orders").delete().eq("id", order.id);
        throw itemsError;
      }
    }

    // Fetch complete order with items
    const { data: completeOrder } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        created_by_user:users!orders_created_by_fkey (id, nama, username)
      `)
      .eq("id", order.id)
      .single();

    return NextResponse.json(completeOrder, { status: 201 });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat order" },
      { status: 500 }
    );
  }
}
