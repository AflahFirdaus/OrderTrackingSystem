import { cookies } from "next/headers";
import { queryOne } from "@/lib/Mysql/server";
import type { RowDataPacket } from "mysql2/promise";

interface User extends RowDataPacket {
  id: string;
  nama: string;
  username: string;
  role: string;
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return null;
    }

    const user = await queryOne<User>(
      "SELECT id, nama, username, role FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
