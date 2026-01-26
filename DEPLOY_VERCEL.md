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

Vercel akan auto-detect:
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build` (atau `npm run build`)
- **Output Directory**: `.next`
- **Install Command**: `pnpm install` (atau `npm install`)

Jika menggunakan pnpm, pastikan:
- Vercel auto-detect pnpm dari `package.json`
- Atau set **Install Command** ke `pnpm install`

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

Jika build error, cek:
- Environment variables sudah di-set dengan benar
- Dependencies sudah terinstall dengan benar
- TypeScript errors (jika ada)

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
