import { queryOne } from "@/lib/Mysql/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

interface User extends RowDataPacket {
  id: string;
  nama: string;
  username: string;
  role: string;
}

export async function GET() {
  try {
    // Get user_id from cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database berdasarkan user_id dari cookie
    const user = await queryOne<User>(
      "SELECT id, nama, username, role FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error getting user:", error);
    
    // Check if it's an environment variable error
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
      { error: "Gagal mengambil data user", details: error.message },
      { status: 500 }
    );
  }
}
