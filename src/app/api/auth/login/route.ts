import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password harus diisi" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Cari user berdasarkan username di tabel users
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, nama, username, password, role")
      .eq("username", username)
      .single();

    if (userError) {
      console.error("Database error saat login:", userError);
      
      // Check if table doesn't exist
      if (userError.code === "PGRST116" || userError.message?.includes("relation") || userError.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database table 'users' tidak ditemukan. Pastikan Anda sudah menjalankan DATABASE_SCHEMA.sql di Supabase.",
            details: userError.message 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: "Username atau password salah", details: userError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.log("User tidak ditemukan untuk username:", username);
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    // Verifikasi password (plain text comparison untuk sekarang)
    // TODO: Untuk production, gunakan bcrypt untuk compare password
    console.log("Checking password for user:", username);
    console.log("Stored password:", user.password);
    console.log("Input password:", password);
    
    if (user.password !== password) {
      console.log("Password tidak match");
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }
    
    console.log("Login berhasil untuk user:", username);

    // Set session cookie dengan user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        nama: user.nama,
        username: user.username,
        role: user.role,
      },
    });

    // Set cookie untuk session (simpan user_id dan role)
    response.cookies.set("user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set("user_role", user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    
    // Check if it's an environment variable error
    if (error.message?.includes("Missing Supabase")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "Buat file .env.local di root project dengan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY"
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
