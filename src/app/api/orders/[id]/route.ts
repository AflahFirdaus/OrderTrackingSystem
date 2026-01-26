import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { canProcessOrder, getNextStatus } from "@/lib/constants";
import { NextResponse } from "next/server";
import type { OrderStatus, UserRole } from "@/types/database";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        created_by_user:users!orders_created_by_fkey (id, nama, username)
      `)
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(data);
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
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const currentUser = await requireAuth();
    const userRole = currentUser.role as UserRole;

    // Get current order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError || !order) {
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

      // Update order
      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(body.expedisi && { expedisi: body.expedisi }),
          ...(body.keterangan !== undefined && { keterangan: body.keterangan }),
        })
        .eq("id", id)
        .select(`
          *,
          order_items (*),
          created_by_user:users!orders_created_by_fkey (id, nama, username)
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json(updatedOrder);
    }

    // Update other fields (only admin)
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate order_id_marketplace uniqueness if being updated
    if (body.order_id_marketplace && body.order_id_marketplace !== order.order_id_marketplace) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, order_id_marketplace, nama_pembeli, status")
        .eq("order_id_marketplace", body.order_id_marketplace)
        .neq("id", id)
        .single();

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
      const { data: existingResi } = await supabase
        .from("orders")
        .select("id")
        .eq("resi", body.resi.trim())
        .neq("id", id) // Exclude current order
        .single();

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
    
    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        ...orderUpdateData,
        total_harga: calculatedTotalHarga !== undefined ? calculatedTotalHarga : orderUpdateData.total_harga,
        resi: body.resi !== undefined ? (body.resi && body.resi.trim() ? body.resi.trim() : null) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        order_items (*),
        created_by_user:users!orders_created_by_fkey (id, nama, username)
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update order_items if provided
    if (order_items && Array.isArray(order_items)) {
      // Delete existing order items
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", id);

      if (deleteError) {
        throw deleteError;
      }

      // Insert new order items
      if (order_items.length > 0) {
        const itemsToInsert = order_items
          .filter((item: any) => item.nama_produk && item.qty && item.harga_satuan)
          .map((item: any) => ({
            order_id: id,
            nama_produk: item.nama_produk,
            qty: parseInt(item.qty),
            harga_satuan: parseFloat(item.harga_satuan),
          }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from("order_items")
            .insert(itemsToInsert);

          if (itemsError) {
            throw itemsError;
          }
        }
      }
    }

    // Fetch complete updated order with items
    const { data: completeOrder } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        created_by_user:users!orders_created_by_fkey (id, nama, username)
      `)
      .eq("id", id)
      .single();

    return NextResponse.json(completeOrder);
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengupdate order" },
      { status: 500 }
    );
  }
}
