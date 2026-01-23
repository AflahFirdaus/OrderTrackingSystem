import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check authentication
    await requireAuth();

    const supabase = await createClient();

    // Get total orders
    const { count: totalOrders, error: ordersError } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    if (ordersError) {
      throw ordersError;
    }

    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (usersError) {
      throw usersError;
    }

    // Get total order items
    const { count: totalOrderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*", { count: "exact", head: true });

    if (itemsError) {
      throw itemsError;
    }

    // Get total revenue (sum of all order total_harga)
    const { data: ordersData, error: revenueError } = await supabase
      .from("orders")
      .select("total_harga")
      .neq("status", "DIBATALKAN"); // Exclude cancelled orders

    if (revenueError) {
      throw revenueError;
    }

    const totalRevenue = ordersData?.reduce((sum, order) => {
      return sum + (parseFloat(order.total_harga.toString()) || 0);
    }, 0) || 0;

    // Get orders by status
    const { data: ordersByStatus } = await supabase
      .from("orders")
      .select("status");

    const statusCounts: Record<string, number> = {};
    ordersByStatus?.forEach((order) => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    return NextResponse.json({
      totalOrders: totalOrders || 0,
      totalUsers: totalUsers || 0,
      totalOrderItems: totalOrderItems || 0,
      totalRevenue,
      ordersByStatus: statusCounts,
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: "Gagal mengambil statistik", details: error.message },
      { status: 500 }
    );
  }
}
