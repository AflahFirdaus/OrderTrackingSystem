# Setup MySQL untuk Order Tracking System

## Prerequisites

- MySQL 8.0 atau lebih tinggi
- Node.js 20.x atau lebih tinggi
- pnpm 8.x atau lebih tinggi

## 1. Setup Database

### Buat Database

```sql
CREATE DATABASE order_tracking_system;
USE order_tracking_system;
```

### Jalankan Schema

Jalankan file `DATABASE_SCHEMA_MYSQL.sql` di MySQL:

```bash
mysql -u your_username -p order_tracking_system < DATABASE_SCHEMA_MYSQL.sql
```

Atau copy-paste isi file `DATABASE_SCHEMA_MYSQL.sql` ke MySQL client (phpMyAdmin, MySQL Workbench, dll).

## 2. Environment Variables

Buat file `.env.local` di root project dengan konfigurasi berikut:

```env
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=order_tracking_system
MYSQL_PORT=3306

# Atau gunakan DATABASE_URL format
# DATABASE_URL=mysql://username:password@host:port/database

# App URL (untuk QR Code)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Format DATABASE_URL (Alternatif)

Jika menggunakan `DATABASE_URL`, formatnya:
```
DATABASE_URL=mysql://username:password@host:port/database
```

Contoh:
```
DATABASE_URL=mysql://root:password123@localhost:3306/order_tracking_system
```

## 3. Install Dependencies

```bash
pnpm install
```

## 4. Create Admin User

Setelah database setup, buat user admin pertama:

```sql
INSERT INTO users (id, nama, username, password, role) 
VALUES (UUID(), 'Admin', 'admin', 'admin123', 'admin');
```

**PENTING**: Ganti password dengan password yang aman!

## 5. Run Development Server

```bash
pnpm dev
```

## Perbedaan dengan Supabase

### Schema Changes

1. **UUID**: 
   - PostgreSQL: `gen_random_uuid()` sebagai DEFAULT
   - MySQL: Generate UUID di application layer menggunakan `crypto.randomUUID()`

2. **ENUM Types**:
   - PostgreSQL: `CHECK` constraints
   - MySQL: `ENUM` types (lebih efisien)

3. **Timestamps**:
   - PostgreSQL: `TIMESTAMP WITH TIME ZONE`
   - MySQL: `TIMESTAMP` dengan `ON UPDATE CURRENT_TIMESTAMP`

4. **Partial Unique Index**:
   - PostgreSQL: Support `WHERE resi IS NOT NULL` di unique index
   - MySQL: Tidak support, uniqueness di-handle di application layer

### Query Changes

Semua query sudah di-migrate dari Supabase syntax ke raw SQL:
- `supabase.from('table').select()` → `query("SELECT * FROM table")`
- `supabase.from('table').insert()` → `execute("INSERT INTO table ...")`
- `supabase.from('table').update()` → `execute("UPDATE table ...")`
- `supabase.from('table').delete()` → `execute("DELETE FROM table ...")`

## Troubleshooting

### Error: "Missing MySQL configuration"

Pastikan semua environment variables sudah di-set di `.env.local`:
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

Atau gunakan `DATABASE_URL`.

### Error: "Access denied for user"

1. Pastikan username dan password benar
2. Pastikan user memiliki akses ke database
3. Pastikan MySQL server berjalan

### Error: "Table doesn't exist"

Pastikan sudah menjalankan `DATABASE_SCHEMA_MYSQL.sql` di database.

### Connection Pool Error

Jika mendapat error connection pool:
- Pastikan MySQL server berjalan
- Cek `connectionLimit` di `src/lib/Mysql/db.ts` (default: 10)
- Pastikan MySQL max_connections cukup tinggi

## Production Deployment

Untuk production (Vercel, dll), set environment variables di hosting platform:

```
MYSQL_HOST=your-production-host
MYSQL_USER=your-production-user
MYSQL_PASSWORD=your-production-password
MYSQL_DATABASE=your-production-database
MYSQL_PORT=3306
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**PENTING**: 
- Jangan commit `.env.local` ke git
- Gunakan environment variables di hosting platform
- Pastikan database accessible dari hosting platform (whitelist IP jika perlu)
