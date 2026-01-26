# Panduan Deploy ke Vercel

## ✅ Pre-Deployment Checklist

- [x] Debug logs sudah dihapus
- [x] Password plain text sesuai kebutuhan (internal company)
- [x] Error handling sudah aman
- [x] Cookie security sudah benar
- [x] Environment variables sudah disiapkan

## 🚀 Langkah Deploy ke Vercel

### 1. Persiapan Repository

Pastikan project sudah di-push ke GitHub/GitLab/Bitbucket:

```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### 2. Setup Vercel Project

1. Buka [Vercel Dashboard](https://vercel.com)
2. Klik **"Add New Project"**
3. Import repository dari GitHub/GitLab/Bitbucket
4. Vercel akan auto-detect Next.js project

### 3. Konfigurasi Environment Variables

Di Vercel Dashboard → Project Settings → Environment Variables, tambahkan:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**PENTING**: 
- Ganti `NEXT_PUBLIC_APP_URL` dengan URL Vercel setelah deploy pertama kali
- Atau set ke domain custom jika menggunakan custom domain

### 4. Build Settings

**IMPORTANT**: Untuk Next.js projects, Vercel mungkin mengabaikan `installCommand` di `vercel.json`. 

**Solusi**: Set Install Command manual di Vercel Dashboard:
1. Buka Vercel Dashboard → Project Settings → General
2. Scroll ke bagian "Build & Development Settings"
3. Set **Install Command** ke: `pnpm install --frozen-lockfile`
4. Set **Build Command** ke: `pnpm build`
5. Set **Node.js Version** ke: `20.x`

Atau gunakan konfigurasi di `vercel.json` (sudah dikonfigurasi):
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build`
- **Output Directory**: `.next` (auto-detect)
- **Install Command**: `pnpm install --frozen-lockfile`
- **Node Version**: 20.x

**Catatan**:
- File `package.json` sudah specify `packageManager: "pnpm@10.0.0"` untuk ensure version consistency
- File `.npmrc` sudah dikonfigurasi dengan `production=false` untuk memastikan devDependencies terinstall

### 5. Deploy

1. Klik **"Deploy"**
2. Tunggu build process selesai
3. Setelah deploy berhasil, copy production URL
4. Update `NEXT_PUBLIC_APP_URL` di Environment Variables dengan URL production

### 6. Setup Database

Pastikan:
- [ ] Database schema sudah dijalankan di Supabase (`DATABASE_SCHEMA.sql`)
- [ ] RLS sudah di-disable (jalankan `FIX_RLS.sql`)
- [ ] User admin pertama sudah dibuat

### 7. Test Production

1. Buka production URL
2. Test login dengan user admin
3. Test semua fitur utama:
   - [ ] Login/Logout
   - [ ] CRUD User (Admin)
   - [ ] Input Order
   - [ ] Scan QR Code
   - [ ] Update Status Order

## 🔧 Troubleshooting

### Build Error

Jika build error dengan `pnpm install`, cek:

1. **Lock file**: Pastikan `pnpm-lock.yaml` sudah di-commit ke repository
   ```bash
   git add pnpm-lock.yaml
   git commit -m "Add pnpm lock file"
   git push
   ```

2. **Node.js version**: Pastikan menggunakan Node.js 20.x (sudah dikonfigurasi di `vercel.json`)

3. **Dependencies**: Pastikan semua dependencies compatible
   - React RC version mungkin perlu di-update ke stable jika ada masalah
   - Cek Vercel Build Logs untuk error detail

4. **Environment variables**: Pastikan semua env vars sudah di-set dengan benar

5. **Sharp dependency**: Jika error terkait `sharp`, pastikan tidak di-ignore (sudah diperbaiki di `package.json`)

### Runtime Error

Jika ada error di production:
- Cek Vercel Function Logs
- Pastikan Supabase credentials benar
- Pastikan database sudah setup

### Database Connection Error

- Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` benar
- Pastikan Supabase project masih aktif
- Cek Supabase Dashboard untuk connection status

## 📝 Post-Deployment

1. **Update QR Code URL**: 
   - QR Code akan otomatis menggunakan `NEXT_PUBLIC_APP_URL`
   - Pastikan URL sudah di-update setelah deploy

2. **Test QR Code**:
   - Generate QR Code dari order baru
   - Scan QR Code dan pastikan redirect ke production URL

3. **Monitor**:
   - Cek Vercel Analytics untuk traffic
   - Monitor error logs di Vercel Dashboard

## 🔒 Security Notes

- ✅ Cookie menggunakan `secure` flag di production
- ✅ Cookie menggunakan `httpOnly` flag
- ✅ Error messages tidak expose sensitive data
- ✅ Debug logs sudah dihapus
- ⚠️ Password plain text (sesuai kebutuhan internal company)

## 📞 Support

Jika ada masalah saat deploy:
1. Cek Vercel Build Logs
2. Cek Vercel Function Logs
3. Pastikan semua environment variables sudah di-set
4. Pastikan database sudah setup dengan benar
