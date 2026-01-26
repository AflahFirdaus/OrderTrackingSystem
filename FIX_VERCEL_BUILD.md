# Fix Vercel Build Error: "pnpm install exited with 1"

## Masalah

Build gagal di Vercel dengan error:
```
Command "pnpm install" exited with 1
```

## Penyebab

1. **Sharp dependency di-ignore**: Next.js memerlukan `sharp` untuk image optimization, tapi sebelumnya di-ignore di `package.json`
2. **Konfigurasi Vercel tidak optimal**: Tidak ada file `vercel.json` untuk konfigurasi build
3. **Node.js version tidak eksplisit**: Tidak ada spesifikasi Node.js version di `package.json`

## Solusi yang Sudah Diterapkan

### 1. Update `package.json`
- ✅ Hapus `sharp` dari `ignoredBuiltDependencies` (Next.js memerlukannya)
- ✅ Tambahkan `engines` untuk spesifikasi Node.js dan pnpm version

### 2. Buat `vercel.json`
- ✅ Konfigurasi build command untuk pnpm
- ✅ Install command dengan `--frozen-lockfile` untuk reproducibility
- ✅ Node.js version 20.x

**PENTING**: Untuk Next.js projects, Vercel mungkin mengabaikan `installCommand` di `vercel.json`. 
**Solusi**: Set Install Command manual di Vercel Dashboard → Settings → General → Install Command: `pnpm install --frozen-lockfile`

### 3. Buat `.npmrc`
- ✅ Konfigurasi pnpm untuk auto-install peers
- ✅ Disable strict peer dependencies untuk menghindari konflik
- ✅ Set `production=false` untuk memastikan devDependencies terinstall

### 4. Update `package.json`
- ✅ Tambahkan `packageManager: "pnpm@10.0.0"` untuk ensure version consistency

## Langkah Deploy Ulang

1. **Commit semua perubahan**:
   ```bash
   git add .
   git commit -m "Fix Vercel build configuration"
   git push
   ```

2. **Pastikan `pnpm-lock.yaml` sudah di-commit**:
   ```bash
   git status  # Cek apakah pnpm-lock.yaml sudah tracked
   ```

3. **Deploy ulang di Vercel**:
   - Buka Vercel Dashboard
   - Klik "Redeploy" pada deployment yang gagal
   - Atau push commit baru untuk trigger auto-deploy

## Verifikasi

Setelah deploy, cek:
- ✅ Build berhasil tanpa error
- ✅ Semua dependencies terinstall dengan benar
- ✅ Application berjalan normal

## Troubleshooting Tambahan

Jika masih error, cek:

1. **Vercel Build Logs**:
   - Buka Vercel Dashboard → Deployments → Klik deployment yang gagal
   - Scroll ke bagian "Build Logs"
   - Cari error message spesifik

2. **Lock file sync**:
   ```bash
   # Di local, regenerate lock file
   rm pnpm-lock.yaml
   pnpm install
   git add pnpm-lock.yaml
   git commit -m "Update pnpm lock file"
   git push
   ```

3. **Node.js version**:
   - Pastikan Vercel menggunakan Node.js 20.x
   - Bisa di-set di Vercel Dashboard → Settings → General → Node.js Version

4. **React RC version**:
   - Jika masih error terkait React, pertimbangkan update ke stable version
   - Tapi untuk sekarang, React RC seharusnya sudah compatible

## File yang Ditambahkan/Dimodifikasi

- ✅ `vercel.json` - Konfigurasi Vercel
- ✅ `.npmrc` - Konfigurasi pnpm
- ✅ `package.json` - Update engines dan ignoredBuiltDependencies
- ✅ `DEPLOY_VERCEL.md` - Update dokumentasi
