# Order Tracking System

Sistem tracking order dari marketplace (Shopee, Tokopedia, Blibli) untuk mencegah duplikasi order dan mengatur alur kerja: Admin → Gudang → Packing → Ekspedisi.

## Fitur Utama

- ✅ **Anti Duplikasi Order** - Validasi order_id_marketplace untuk mencegah order terinput lebih dari sekali
- ✅ **QR Code Tracking** - Setiap order memiliki QR Code unik untuk tracking antar divisi
- ✅ **Role-Based Access** - Admin, Gudang, dan Packing dengan hak akses berbeda
- ✅ **Status Management** - Alur status order yang terkontrol (DIBUAT → DITERIMA_GUDANG → PACKING → DIKIRIM → SELESAI)
- ✅ **Real-time Tracking** - Tracking order real-time dengan status update

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - PostgreSQL database & authentication
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Shadcn UI](https://ui.shadcn.com/) - UI components

## Quick Start

Lihat [SETUP.md](./SETUP.md) untuk panduan setup lengkap.

1. Install dependencies

```bash
pnpm install
```

2. Setup environment variables (lihat `.env.example`)

3. Setup database (jalankan `DATABASE_SCHEMA.sql` di Supabase)

4. Run development server

```bash
pnpm dev
```

## Dokumentasi

- [SETUP.md](./SETUP.md) - Panduan setup lengkap
- [DATABASE_SCHEMA.sql](./DATABASE_SCHEMA.sql) - Schema database

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
