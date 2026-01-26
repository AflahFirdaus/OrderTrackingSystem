import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if user is admin
    const currentUser = await requireAdmin();

    const supabase = await createClient();

    const body = await request.json();
    const updateData: any = {};

    if (body.nama) updateData.nama = body.nama;
    if (body.username) updateData.username = body.username;
    if (body.password) updateData.password = body.password;
    if (body.role) updateData.role = body.role;

    // Check username uniqueness if username is being updated
    if (body.username) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", body.username)
        .neq("id", id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: "Username sudah digunakan" },
          { status: 409 }
        );
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select("id, nama, username, role, created_at, updated_at")
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengupdate user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if user is admin
    const currentUser = await requireAdmin();

    const supabase = await createClient();

    // Prevent deleting own account
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus akun sendiri" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus user" },
      { status: 500 }
    );
  }
}
