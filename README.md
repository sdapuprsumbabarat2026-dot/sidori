# SIDORI — Sistem Informasi Dokumen Irigasi

Web app untuk inventarisasi dan pengelolaan dokumen irigasi. Upload dokumen ke Google Drive, review oleh admin, tracking status dokumen per kategori.

## Stack

- **Frontend**: Vite 6 + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Postgres, RPC, RLS)
- **Storage**: Google Drive via Google Apps Script (GAS)
- **Deploy**: Vercel

## Fitur

- Login custom (NIP + password) — tanpa Supabase Auth
- Dashboard rekapitulasi daerah irigasi per status
- Daftar jenis irigasi → daerah irigasi → dokumen
- Upload dokumen per kategori (9 kategori per daerah)
- Auto-upload ke Google Drive (folder `SIDORI/Temp/`)
- Review dokumen oleh admin (setujui/tolak)
- Approve → file pindah ke `SIDORI/{year}/{irigationType}/{category}`
- Tolak → file dihapus dari Drive
- Admin: kelola pengguna, daerah irigasi, review dokumen
- Halaman Usulan — daftar daerah siap ditentukan statusnya (Disetujui / Stock Program)
- Status area: `active` → `approved` / `stock_program`
- Error boundary + ProtectionRoute (role-based)

## Env

```env
VITE_SUPABASE_URL=https://gaqusoowrtzcruzpkwun.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_GAS_URL=https://script.google.com/macros/s/AKfycbzMikVSYy0Fnn3AxfWbbxLt7KLmTfzVDxGh7pzG4S1saWP0UGaY_zqTDqaT-xUltrsHUg/exec
VITE_GAS_API_KEY=sidori-2026
```

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## DB Migrations

Supabase migrations di `supabase/migrations/`. Jalanin via Supabase CLI atau MCP.

## GAS

Script di `gas/Code.gs`. Deploy sebagai Web App — Google Apps Script.

## Struktur Folder

```
src/
  pages/           — halaman aplikasi
  components/      — UI components + layout
  store/           — auth store (zustand)
  hooks/           — custom hooks
  lib/             — supabase client, utils
  types/           — TypeScript types
gas/
  Code.gs          — Google Apps Script (upload/delete/move)
supabase/
  migrations/      — SQL migrations
```
