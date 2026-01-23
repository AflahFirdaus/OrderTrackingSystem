import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get user_id from cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get user from database berdasarkan user_id dari cookie
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, nama, username, role")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Database error:", userError);
      // If table doesn't exist, return helpful error
      if (userError.code === "PGRST116" || userError.message?.includes("relation") || userError.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database table 'users' tidak ditemukan. Pastikan Anda sudah menjalankan DATABASE_SCHEMA.sql di Supabase.",
            details: userError.message 
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error getting user:", error);
    
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
      { error: "Gagal mengambil data user", details: error.message },
      { status: 500 }
    );
  }
}
