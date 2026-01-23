# Setup Order Tracking System

## Prerequisites

- Node.js 18+ dan pnpm
- Supabase account (gratis)
- PostgreSQL database (via Supabase)

## Langkah Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Supabase

1. Buat project baru di [Supabase](https://supabase.com)
2. Dapatkan URL dan Anon Key dari Settings > API
3. Jalankan SQL schema dari file `DATABASE_SCHEMA.sql` di SQL Editor Supabase

### 3. Konfigurasi Environment Variables

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Setup Database

Jalankan SQL schema dari `DATABASE_SCHEMA.sql` di Supabase SQL Editor.

### 5. Buat User Admin Pertama

Jalankan query berikut di Supabase SQL Editor untuk membuat user admin pertama:

```sql
INSERT INTO users (nama, username, password, role)
VALUES ('Admin', 'admin', 'admin123', 'admin');
```

**PENTING**: Untuk production, pastikan password di-hash dengan bcrypt!

### 6. Jalankan Development Server

```bash
pnpm dev
```

Akses aplikasi di `http://localhost:3000`

## Struktur Database

### Tabel `users`
- `id` (UUID)
- `nama` (VARCHAR)
- `username` (VARCHAR, UNIQUE)
- `password` (VARCHAR) - **Harus di-hash di production**
- `role` (admin, gudang, packing)
- `created_at`, `updated_at`

### Tabel `orders`
- `id` (UUID)
- `order_id_marketplace` (VARCHAR, UNIQUE) - **Anti duplikasi**
- `nama_pembeli` (VARCHAR)
- `platform_penjualan` (Shopee, Tokopedia, Blibli)
- `status` (DIBUAT, DITERIMA_GUDANG, PACKING, DIKIRIM, SELESAI, DIBATALKAN)
- `tanggal_pemesanan` (DATE)
- `total_harga` (DECIMAL)
- `keterangan` (TEXT, nullable)
- `expedisi` (VARCHAR)
- `qr_token` (VARCHAR, UNIQUE)
- `created_by` (UUID, FK ke users)
- `created_at`, `updated_at`

### Tabel `order_items`
- `id` (UUID)
- `order_id` (UUID, FK ke orders)
- `nama_produk` (VARCHAR)
- `qty` (INTEGER)
- `harga_satuan` (DECIMAL)
- `created_at`, `updated_at`

## Fitur

### Admin
- ✅ CRUD User
- ✅ Input Order
- ✅ Generate QR Code
- ✅ Tracking Order
- ✅ Update Status Order (semua status termasuk DIBATALKAN)

### Gudang
- ✅ Scan QR Code
- ✅ Melihat detail order
- ✅ Proses order dengan status DIBUAT → DITERIMA_GUDANG

### Packing
- ✅ Scan QR Code
- ✅ Melihat detail order
- ✅ Proses order dengan status DITERIMA_GUDANG → PACKING

## Alur Status Order

```
DIBUAT
  ↓ (Gudang)
DITERIMA_GUDANG
  ↓ (Packing)
PACKING
  ↓ (Admin)
DIKIRIM
  ↓ (Admin)
SELESAI

DIBATALKAN (hanya Admin, bisa dari status apapun)
```

## QR Code

- QR Code berisi URL: `https://domain.com/scan/{qr_token}`
- Token unik di-generate saat order dibuat
- Sistem mencari order berdasarkan `qr_token`
- Validasi role dan status saat scan

## Security Notes

1. **Password Hashing**: Saat ini password disimpan plain text. Untuk production, implementasikan bcrypt hashing di API `/api/users` dan `/api/auth/login`.

2. **Row Level Security**: Schema sudah include RLS policies untuk Supabase. Pastikan RLS diaktifkan sesuai kebutuhan.

3. **Environment Variables**: Jangan commit file `.env.local` ke repository.

## Troubleshooting

### Error: "Unauthorized"
- Pastikan user sudah login
- Check Supabase credentials di `.env.local`

### Error: "Order ID marketplace sudah terdaftar"
- Order dengan `order_id_marketplace` yang sama sudah ada
- Ini adalah fitur anti-duplikasi

### Error: "Anda tidak dapat memproses order dengan status X"
- Validasi status order sesuai role
- Gudang hanya bisa proses status DIBUAT
- Packing hanya bisa proses status DITERIMA_GUDANG

## Production Checklist

- [ ] Hash password dengan bcrypt
- [ ] Setup proper authentication dengan Supabase Auth
- [ ] Enable Row Level Security di Supabase
- [ ] Setup environment variables di hosting platform
- [ ] Update `NEXT_PUBLIC_APP_URL` dengan domain production
- [ ] Setup SSL/HTTPS
- [ ] Backup database reguler
