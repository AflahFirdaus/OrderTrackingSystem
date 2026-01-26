import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { OrderStatus } from "@/types/database";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resi: string }> }
) {
  try {
    // Only admin can access this endpoint
    await requireAdmin();

    const { resi } = await params;
    const supabase = await createClient();

    if (!resi || !resi.trim()) {
      return NextResponse.json(
        { error: "Resi tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Find order by resi
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        created_by_user:users!orders_created_by_fkey (id, nama, username)
      `)
      .eq("resi", resi.trim())
      .single();

    if (orderError || !order) {
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

    return NextResponse.json({
      order,
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
    const supabase = await createClient();

    if (!resi || !resi.trim()) {
      return NextResponse.json(
        { error: "Resi tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Find order by resi
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("resi", resi.trim())
      .single();

    if (orderError || !order) {
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
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "PACKING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select(`
        *,
        order_items (*),
        created_by_user:users!orders_created_by_fkey (id, nama, username)
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
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
