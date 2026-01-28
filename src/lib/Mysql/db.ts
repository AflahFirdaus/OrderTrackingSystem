// lib/db.ts
import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: mysql.Pool | undefined;
}

function getDatabaseConfig() {
  const host = process.env.MYSQL_HOST || process.env.DATABASE_HOST;
  const user = process.env.MYSQL_USER || process.env.DATABASE_USER;
  const password = process.env.MYSQL_PASSWORD || process.env.DATABASE_PASSWORD;
  const database = process.env.MYSQL_DATABASE || process.env.DATABASE_NAME;
  const port = parseInt(process.env.MYSQL_PORT || process.env.DATABASE_PORT || "3306");

  // Support DATABASE_URL format (mysql://user:password@host:port/database)
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.startsWith("mysql://")) {
    return { uri: databaseUrl };
  }

  if (!host || !user || !password || !database) {
    throw new Error(
      "Missing MySQL configuration. Please set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE in .env.local"
    );
  }

  return {
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    decimalNumbers: true, // DECIMAL jadi number, bukan string
  };
}

export const pool: mysql.Pool =
  global.__mysqlPool ??
  mysql.createPool(getDatabaseConfig());

if (process.env.NODE_ENV !== "production") global.__mysqlPool = pool;
