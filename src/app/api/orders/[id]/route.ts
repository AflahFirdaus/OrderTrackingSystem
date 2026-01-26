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

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        ...body,
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

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengupdate order" },
      { status: 500 }
    );
  }
}
