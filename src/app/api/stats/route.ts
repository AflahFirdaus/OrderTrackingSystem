import { query } from "@/lib/Mysql/server";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

interface CountResult extends RowDataPacket {
  count: number;
}

interface RevenueResult extends RowDataPacket {
  total_revenue: number;
}

interface StatusResult extends RowDataPacket {
  status: string;
}

export async function GET() {
  try {
    // Check authentication
    await requireAuth();

    // Get total orders
    const ordersCount = await query<CountResult[]>(
      "SELECT COUNT(*) as count FROM orders"
    );
    const totalOrders = ordersCount[0]?.count || 0;

    // Get total users
    const usersCount = await query<CountResult[]>(
      "SELECT COUNT(*) as count FROM users"
    );
    const totalUsers = usersCount[0]?.count || 0;

    // Get total order items
    const itemsCount = await query<CountResult[]>(
      "SELECT COUNT(*) as count FROM order_items"
    );
    const totalOrderItems = itemsCount[0]?.count || 0;

    // Get total revenue (sum of all order total_harga, excluding cancelled orders)
    const revenueResult = await query<RevenueResult[]>(
      "SELECT COALESCE(SUM(total_harga), 0) as total_revenue FROM orders WHERE status != 'DIBATALKAN'"
    );
    const totalRevenue = revenueResult[0]?.total_revenue || 0;

    // Get orders by status
    const ordersByStatusData = await query<StatusResult[]>(
      "SELECT status FROM orders"
    );

    const statusCounts: Record<string, number> = {};
    ordersByStatusData.forEach((order) => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    return NextResponse.json({
      totalOrders,
      totalUsers,
      totalOrderItems,
      totalRevenue: Number(totalRevenue),
      ordersByStatus: statusCounts,
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
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
      { error: "Gagal mengambil statistik", details: error.message },
      { status: 500 }
    );
  }
}
