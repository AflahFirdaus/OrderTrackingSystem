import { query, queryOne, execute } from "@/lib/Mysql/server";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import crypto from "crypto";

interface User extends RowDataPacket {
  id: string;
  nama: string;
  username: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    // Check if user is admin
    await requireAdmin();

    const users = await query<User[]>(
      "SELECT id, nama, username, role, created_at, updated_at FROM users ORDER BY created_at DESC"
    );

    return NextResponse.json(users || []);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
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
      { error: "Gagal mengambil data users", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check if user is admin
    await requireAdmin();

    const body = await request.json();
    const { nama, username, password, role } = body;

    if (!nama || !username || !password || !role) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await queryOne<User>(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: "Username sudah digunakan" },
        { status: 409 }
      );
    }

    // Generate UUID for user
    const userId = crypto.randomUUID();

    // Password disimpan plain text untuk internal company
    await execute(
      "INSERT INTO users (id, nama, username, password, role) VALUES (?, ?, ?, ?, ?)",
      [userId, nama, username, password, role]
    );

    // Fetch created user
    const newUser = await queryOne<User>(
      "SELECT id, nama, username, role, created_at, updated_at FROM users WHERE id = ?",
      [userId]
    );

    if (!newUser) {
      throw new Error("Failed to fetch created user");
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || "Gagal membuat user" },
      { status: 500 }
    );
  }
}
