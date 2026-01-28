import { queryOne, execute } from "@/lib/Mysql/server";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

interface User extends RowDataPacket {
  id: string;
  nama: string;
  username: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if user is admin
    const currentUser = await requireAdmin();

    const body = await request.json();
    const updateFields: string[] = [];
    const updateParams: unknown[] = [];

    if (body.nama !== undefined) {
      updateFields.push("nama = ?");
      updateParams.push(body.nama);
    }
    if (body.username !== undefined) {
      updateFields.push("username = ?");
      updateParams.push(body.username);
    }
    if (body.password !== undefined) {
      updateFields.push("password = ?");
      updateParams.push(body.password);
    }
    if (body.role !== undefined) {
      updateFields.push("role = ?");
      updateParams.push(body.role);
    }

    // Check username uniqueness if username is being updated
    if (body.username) {
      const existingUser = await queryOne<User>(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [body.username, id]
      );

      if (existingUser) {
        return NextResponse.json(
          { error: "Username sudah digunakan" },
          { status: 409 }
        );
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data yang diupdate" },
        { status: 400 }
      );
    }

    updateParams.push(id);
    await execute(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      updateParams
    );

    // Fetch updated user
    const updatedUser = await queryOne<User>(
      "SELECT id, nama, username, role, created_at, updated_at FROM users WHERE id = ?",
      [id]
    );

    if (!updatedUser) {
      throw new Error("Failed to fetch updated user");
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    
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

    // Prevent deleting own account
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus akun sendiri" },
        { status: 400 }
      );
    }

    await execute("DELETE FROM users WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    
    return NextResponse.json(
      { error: error.message || "Gagal menghapus user" },
      { status: 500 }
    );
  }
}
