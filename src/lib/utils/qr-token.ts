import { randomBytes } from "crypto";

/** Karakter untuk barcode 1D (CODE128): huruf besar + angka */
const BARCODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generate token untuk barcode 1D (10-20 karakter).
 * Digunakan untuk order tracking; cocok untuk scanner barcode fisik.
 */
export function generateQrToken(): string {
  const length = 10 + Math.floor((randomBytes(1)[0] / 256) * 11); // 10-20
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += BARCODE_CHARS[bytes[i] % BARCODE_CHARS.length];
  }
  return result;
}

export function getQrUrl(token: string): string {
  if (typeof window !== "undefined") {
    // Client-side
    return `${window.location.origin}/scan/${token}`;
  }
  // Server-side
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/scan/${token}`;
}
