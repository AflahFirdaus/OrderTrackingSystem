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

    return NextResponse.json({
      order,
      user: userData,
      canProcess,
      nextStatus: canProcess ? getNextStatus(order.status as any) : null,
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
      return NextResponse.json(
        {
          error: `Anda tidak dapat memproses order dengan status ${order.status}`,
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
