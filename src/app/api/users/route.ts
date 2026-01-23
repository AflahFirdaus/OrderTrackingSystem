import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if user is admin
    await requireAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users")
      .select("id, nama, username, role, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      if (error.code === "PGRST116" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database table 'users' tidak ditemukan. Pastikan Anda sudah menjalankan DATABASE_SCHEMA.sql di Supabase.",
            details: error.message 
          },
          { status: 500 }
        );
      }
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    
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
      { error: "Gagal mengambil data users", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check if user is admin
    await requireAdmin();

    const supabase = await createClient();

    const body = await request.json();
    const { nama, username, password, role } = body;

    if (!nama || !username || !password || !role) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Username sudah digunakan" },
        { status: 409 }
      );
    }

    // TODO: Hash password dengan bcrypt
    // For now, we'll store it as plain text (NOT RECOMMENDED FOR PRODUCTION)
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        nama,
        username,
        password, // Should be hashed
        role,
      })
      .select("id, nama, username, role, created_at, updated_at")
      .single();

    if (insertError) {
      throw insertError;
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
