import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear session cookies
  response.cookies.delete("user_id");
  response.cookies.delete("user_role");

  return response;
}
