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

    // Session cookie: tidak pakai maxAge agar otomatis logout saat tab/browser ditutup
    response.cookies.set("user_id", userData.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    response.cookies.set("user_role", userData.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message || "Terjadi kesalahan saat login";
    console.error("Login error:", message, err);

    if (message.includes("Missing MySQL") || message.includes("MYSQL_")) {
      return NextResponse.json(
        {
          error: "Konfigurasi database belum lengkap",
          details: message,
          hint: "Pastikan .env berisi MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE",
        },
        { status: 500 }
      );
    }

    if (message.includes("ECONNREFUSED") || message.includes("connect")) {
      return NextResponse.json(
        {
          error: "Tidak dapat terhubung ke database",
          details: message,
          hint: "Pastikan MySQL berjalan dan host/port di .env benar.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: message,
        details: err.toString(),
      },
      { status: 500 }
    );
  }
}
