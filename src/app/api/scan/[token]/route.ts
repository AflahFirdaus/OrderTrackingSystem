import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { canProcessOrder, getNextStatus } from "@/lib/constants";
import { NextResponse } from "next/server";
import type { UserRole } from "@/types/database";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Get current user
    const userData = await requireAuth();
    const userRole = userData.role as UserRole;

    // Find order by QR token
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*),
        created_by_user:users!orders_created_by_fkey (id, nama, username)
      `)
      .eq("qr_token", token)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 }
      );
    }

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
      order,
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
    const supabase = await createClient();

    // Get current user
    const userData = await requireAuth();
    const userRole = userData.role as UserRole;

    // Find order by QR token
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("qr_token", token)
      .single();

    if (orderError || !order) {
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
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: nextStatus,
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
