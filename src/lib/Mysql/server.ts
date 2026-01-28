// lib/server.ts
import { pool } from "@/lib/Mysql/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

// Helper function to convert undefined to null for SQL parameters
// MySQL doesn't accept undefined, must use null for SQL NULL
function sanitizeParams(params?: unknown[]): unknown[] | undefined {
  if (!params || params.length === 0) return params;
  return params.map(param => {
    // Convert undefined to null
    if (param === undefined) {
      return null;
    }
    // Handle NaN for numbers - convert to 0 for numeric fields
    if (typeof param === 'number' && isNaN(param)) {
      return 0;
    }
    return param;
  });
}

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const [rows] = await pool.query<T>(sql, sanitizeParams(params));
  return rows;
}

export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows.length > 0 ? (rows[0] as T) : null;
}

export async function execute(sql: string, params?: unknown[]): Promise<ResultSetHeader> {
  const sanitized = sanitizeParams(params);
  if (!sanitized) {
    const [result] = await pool.execute<ResultSetHeader>(sql);
    return result;
  }
  const [result] = await pool.execute<ResultSetHeader>(sql, sanitized);
  return result;
}
