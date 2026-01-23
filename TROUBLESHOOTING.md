# Troubleshooting Guide

## Error 500: Internal Server Error

### 1. Missing Supabase Environment Variables

**Error Message:**
```
Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Solusi:**
1. Buat file `.env.local` di root project
2. Tambahkan konfigurasi berikut:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Dapatkan URL dan Anon Key dari:
   - Supabase Dashboard → Settings → API
   - Copy "Project URL" dan "anon public" key

4. Restart development server:
```bash
pnpm dev
```

### 2. Database Table Not Found

**Error Message:**
```
Database table 'users' tidak ditemukan. Pastikan Anda sudah menjalankan DATABASE_SCHEMA.sql di Supabase.
```

**Solusi:**
1. Buka Supabase Dashboard
2. Pergi ke SQL Editor
3. Copy seluruh isi file `DATABASE_SCHEMA.sql`
4. Paste dan jalankan di SQL Editor
5. Pastikan semua tabel berhasil dibuat:
   - `users`
   - `orders`
   - `order_items`

### 3. Unauthorized Error

**Error Message:**
```
Unauthorized
```

**Kemungkinan Penyebab:**
- User belum login
- Session expired
- Supabase Auth belum dikonfigurasi dengan benar

**Solusi:**
1. Pastikan Anda sudah login di `/login`
2. Jika belum ada user, buat user admin pertama di Supabase SQL Editor:

```sql
INSERT INTO users (nama, username, password, role)
VALUES ('Admin', 'admin', 'admin123', 'admin');
```

3. Login dengan username: `admin`, password: `admin123`

### 4. Forbidden Error (403)

**Error Message:**
```
Forbidden
```

**Kemungkinan Penyebab:**
- User tidak memiliki role `admin`
- Mencoba mengakses endpoint yang memerlukan admin access

**Solusi:**
- Pastikan user memiliki role `admin` di database
- Atau gunakan user dengan role yang sesuai

## Setup Checklist

- [ ] File `.env.local` sudah dibuat dengan Supabase credentials
- [ ] Database schema sudah dijalankan di Supabase SQL Editor
- [ ] User admin pertama sudah dibuat
- [ ] Development server sudah di-restart setelah setup `.env.local`
- [ ] Supabase project sudah aktif dan accessible

## Verifikasi Setup

### 1. Cek Environment Variables

Jalankan di terminal:
```bash
# Windows PowerShell
$env:NEXT_PUBLIC_SUPABASE_URL
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY

# Linux/Mac
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Jika tidak muncul, pastikan file `.env.local` ada di root project.

### 2. Cek Database Tables

Di Supabase Dashboard → Table Editor, pastikan ada:
- `users`
- `orders`
- `order_items`

### 3. Test Connection

Coba akses:
- `http://localhost:3000/login` - Harus bisa diakses
- Login dengan user admin
- Cek console browser untuk error

## Common Issues

### Issue: "Cannot read property 'filter' of undefined"

**Penyebab:** API mengembalikan error object, bukan array

**Solusi:** Sudah diperbaiki di code. Pastikan:
1. Environment variables sudah di-set
2. Database sudah dibuat
3. Restart development server

### Issue: Middleware redirect loop

**Penyebab:** Middleware mencoba redirect ke `/login` tapi user belum ada

**Solusi:**
1. Buat user admin pertama di database
2. Atau sementara disable middleware untuk testing

### Issue: QR Code tidak muncul

**Penyebab:** Library `qrcode.react` belum terinstall

**Solusi:**
```bash
pnpm add qrcode.react
```

## Getting Help

Jika masih ada masalah:
1. Cek console browser untuk error details
2. Cek terminal/server logs untuk error details
3. Pastikan semua checklist di atas sudah dilakukan
4. Cek file `SETUP.md` untuk panduan lengkap
