import { queryOne } from "@/lib/Mysql/server";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

interface User extends RowDataPacket {
  id: string;
  nama: string;
  username: string;
  password: string;
  role: string;
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password harus diisi" },
        { status: 400 }
      );
    }

    const userData = await queryOne<User>(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (!userData) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    // Verifikasi password (plain text comparison untuk internal company)
    if (userData.password !== password) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    // Set session cookie dengan user data
    const response = NextResponse.json({
      user: {
        id: userData.id,
        nama: userData.nama,
        username: userData.username,
        role: userData.role,
      },
    });

    // Set cookie untuk session (simpan user_id dan role)
    response.cookies.set("user_id", userData.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set("user_role", userData.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    
    // Check if it's an environment variable error
    if (error.message?.includes("Missing Mysql")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "Buat file .env.local di root project dengan MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, dan MYSQL_DATABASE"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan saat login", details: error.toString() },
      { status: 500 }
    );
  }
}
