# ✅ Vercel Deployment Checklist

## Pre-Deployment Verification

### 1. ✅ Configuration Files

- [x] **next.config.mjs** - Sudah dikonfigurasi dengan benar
  - ESLint: ignoreDuringBuilds = true (untuk menghindari build error)
  - TypeScript: ignoreBuildErrors = false (untuk memastikan type safety)
  - reactStrictMode: true
  - swcMinify: true

- [x] **vercel.json** - Sudah dikonfigurasi
  - Build Command: `pnpm build`
  - Install Command: `pnpm install --frozen-lockfile`
  - Node Version: 20.x
  - Framework: Next.js

- [x] **package.json** - Sudah dikonfigurasi
  - packageManager: "pnpm@10.0.0"
  - engines: node >=20.0.0, pnpm >=8.0.0
  - Semua dependencies sudah terdaftar

- [x] **.npmrc** - Sudah dikonfigurasi
  - strict-peer-dependencies=false
  - auto-install-peers=true
  - production=false (untuk memastikan devDependencies terinstall)

- [x] **tsconfig.json** - Sudah dikonfigurasi dengan benar

- [x] **.gitignore** - Sudah include .env* files

### 2. ✅ Code Quality

- [x] **No Linter Errors** - Semua file sudah di-check, tidak ada error
- [x] **TypeScript** - Semua type sudah benar
- [x] **API Routes** - Semua route sudah memiliki error handling
- [x] **Console Logs** - Hanya console.error untuk logging (acceptable)

### 3. ✅ Dependencies

- [x] **React 19 RC** - Sudah dikonfigurasi dengan benar
- [x] **Next.js 15** - Latest version
- [x] **Supabase** - @supabase/ssr dan @supabase/supabase-js
- [x] **All Dependencies** - Semua dependencies compatible

### 4. ✅ Environment Variables (Harus di-set di Vercel Dashboard)

**PENTING**: Set environment variables di Vercel Dashboard → Settings → Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**Catatan**: 
- `NEXT_PUBLIC_APP_URL` bisa di-set setelah deploy pertama kali
- Atau set ke domain custom jika menggunakan custom domain

## 🚀 Deployment Steps

### Step 1: Commit All Changes

```bash
# Pastikan semua perubahan sudah di-commit
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Verify Lock File

```bash
# Pastikan pnpm-lock.yaml sudah di-commit
git status | grep pnpm-lock.yaml
```

Jika belum, commit:
```bash
git add pnpm-lock.yaml
git commit -m "Add pnpm lock file"
git push
```

### Step 3: Setup Vercel Project

1. Buka [Vercel Dashboard](https://vercel.com)
2. Klik **"Add New Project"** atau pilih project yang sudah ada
3. Import repository dari GitHub/GitLab/Bitbucket
4. Vercel akan auto-detect Next.js project

### Step 4: Configure Build Settings

**PENTING**: Set manual di Vercel Dashboard karena Vercel mungkin mengabaikan `installCommand` di `vercel.json`

1. Buka **Vercel Dashboard → Project Settings → General**
2. Scroll ke bagian **"Build & Development Settings"**
3. Set:
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm build`
   - **Install Command**: `pnpm install --frozen-lockfile`
   - **Output Directory**: `.next` (auto-detect)
   - **Node.js Version**: `20.x`

### Step 5: Set Environment Variables

1. Buka **Vercel Dashboard → Project Settings → Environment Variables**
2. Tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL Supabase project Anda
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key Anda
   - `NEXT_PUBLIC_APP_URL` = Akan di-set setelah deploy pertama (atau domain custom)

**PENTING**: 
- Set untuk semua environments (Production, Preview, Development)
- Atau set hanya untuk Production jika perlu

### Step 6: Deploy

1. Klik **"Deploy"** atau push commit baru untuk trigger auto-deploy
2. Tunggu build process selesai
3. Monitor build logs untuk memastikan tidak ada error

### Step 7: Post-Deployment

1. **Copy Production URL** setelah deploy berhasil
2. **Update Environment Variable**:
   - Buka Vercel Dashboard → Settings → Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` dengan production URL
   - Redeploy untuk apply perubahan

3. **Test Production**:
   - Buka production URL
   - Test login dengan user admin
   - Test semua fitur utama:
     - [ ] Login/Logout
     - [ ] CRUD User (Admin)
     - [ ] Create/Edit Order
     - [ ] Scan QR Code
     - [ ] Update Status Order
     - [ ] Download Receipt

## 🔧 Troubleshooting

### Build Error: "pnpm install exited with 1"

**Solusi**:
1. Pastikan `pnpm-lock.yaml` sudah di-commit
2. Pastikan Node.js version = 20.x di Vercel settings
3. Cek Vercel Build Logs untuk error detail
4. Pastikan Install Command = `pnpm install --frozen-lockfile`

### Build Error: TypeScript Errors

**Solusi**:
- Cek `next.config.mjs` - `ignoreBuildErrors: false` berarti TypeScript errors akan block build
- Fix semua TypeScript errors sebelum deploy
- Atau set `ignoreBuildErrors: true` sementara (tidak recommended)

### Build Error: ESLint Errors

**Solusi**:
- Sudah di-handle dengan `ignoreDuringBuilds: true` di `next.config.mjs`
- ESLint errors tidak akan block build

### Runtime Error: "Missing Supabase"

**Solusi**:
- Pastikan environment variables sudah di-set dengan benar
- Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` benar
- Redeploy setelah set environment variables

### Runtime Error: Database Connection

**Solusi**:
- Pastikan Supabase project masih aktif
- Pastikan database schema sudah dijalankan (`DATABASE_SCHEMA.sql`)
- Pastikan RLS sudah di-disable (`FIX_RLS.sql`)
- Cek Supabase Dashboard untuk connection status

### QR Code Not Working

**Solusi**:
- Pastikan `NEXT_PUBLIC_APP_URL` sudah di-set dengan production URL
- Redeploy setelah update `NEXT_PUBLIC_APP_URL`
- Test QR code dengan production URL

## 📋 Quick Checklist

Sebelum deploy, pastikan:

- [x] Semua code sudah di-commit dan push
- [x] `pnpm-lock.yaml` sudah di-commit
- [x] Tidak ada TypeScript errors (check dengan `pnpm build`)
- [x] Environment variables sudah disiapkan
- [x] Database schema sudah dijalankan di Supabase
- [x] RLS sudah di-disable di Supabase
- [x] User admin pertama sudah dibuat

## ✅ Current Status

- ✅ **Configuration**: Semua file config sudah benar
- ✅ **Code Quality**: No linter errors, TypeScript OK
- ✅ **Dependencies**: Semua dependencies compatible
- ✅ **Build Config**: Vercel config sudah optimal
- ⚠️ **Environment Variables**: HARUS di-set di Vercel Dashboard
- ⚠️ **Database**: HARUS setup di Supabase

## 🎯 Ready to Deploy!

Project sudah siap untuk deploy ke Vercel. Ikuti langkah-langkah di atas dan pastikan environment variables sudah di-set sebelum deploy.
