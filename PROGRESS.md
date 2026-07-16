# SIDORI — Progress Revisi (D:\Code\sidori)

_Status: SEMUA item requirement awal SUDAH DIKERJAKAN dari sisi kode frontend + migration SQL. Lihat "Belum diverifikasi" di bawah untuk yang perlu dicek/dites user._

## ✅ Sudah selesai (seluruh sesi)

### Database
1. **Migration**: `supabase/migrations/013_area_detail_fields.sql` — **SUDAH DIJALANKAN user di Supabase SQL Editor** ✅
   - Kolom baru `irrigation_areas`: `tahun_anggaran`, `menu_kegiatan`, `kecamatan`, `desa`, `outcome_ha`, `pagu_rp`
   - Kolom baru `document_categories`: `menu_kegiatan` + 17 kategori baru (8 peningkatan, 9 pembangunan)
   - RPC baru: `admin_create_area_full`, `admin_update_area_full`, `admin_user_area_history`

### Assets
2. Logo asli user dipindah ke `public/logo-kabupaten.png` & `public/logo-pupr.png`

### Halaman User
3. **LoginPage.tsx** — split-panel: kiri identitas instansi (logo + teks + motif SVG orisinal), kanan form login
4. **DashboardPage.tsx** — rewrite penuh: selector Tahun, welcome text, Daerah Irigasi per jenis, Status Dokumen (Menunggu Review/Sesuai), Status Usulan per jenis (Disetujui/Tidak Disetujui), Total Pagu & Outcome (+ keterangan disetujui), Pengguna. Statistik lama redundan dihapus.
5. **UsulanPage.tsx** → "Usulan Kegiatan" — "Menunggu Verifikasi" / "Hasil Verifikasi", tombol Disetujui/Tidak Disetujui, keterangan "(Dijadikan Stock Program)", total kategori dinamis per menu_kegiatan (8/9)
6. **IrrigationTypesPage.tsx** → judul "Upload Dokumen"
7. **AreaDocumentsPage.tsx** — kategori dokumen filter sesuai `menu_kegiatan` area, nama uploader ditampilkan ("Diupload oleh {nama}")
8. **RiwayatPage.tsx** (BARU) — `/riwayat`, filter Tahun, tabel No/Nama DI/Jenis DI/Menu/Kecamatan/Desa/Outcome/Pagu/Keterangan + total, klik baris → dokumen
9. **StatusBadge.tsx** — label: active="Menunggu Verifikasi", stock_program="Tidak Disetujui"

### Navigasi
10. **Sidebar.tsx** & **BottomNav.tsx** — label diupdate, nav "Riwayat Daerah Irigasi" ditambahkan
11. **App.tsx** — route `/riwayat` ditambahkan

### Halaman Admin
12. **AdminReviewPage.tsx** — tombol "Sesuai"/"Tidak Sesuai" (value DB tetap approved/rejected), nama uploader ditampilkan
13. **AdminAreasPage.tsx** — REWRITE form lengkap: Nama, Jenis DI, Menu Kegiatan, Kecamatan, Desa, Outcome (Ha), Pagu (Rp), Tahun Anggaran, Status. Pakai RPC `admin_create_area_full`/`admin_update_area_full` + `admin_update_area` (untuk status jika berbeda dari default)
14. **AdminUsersPage.tsx** — tambah tab ke-3 "Riwayat" di dialog Edit Pengguna, load via RPC `admin_user_area_history(p_user_id)`, tampil list dokumen yang pernah diupload user tsb + nama daerah irigasi + tanggal

## ⚠️ Belum diverifikasi / perlu dicek user (BUKAN error kode, tapi asumsi yang perlu dikonfirmasi)

1. **`npm run dev` belum pernah dijalankan sepanjang sesi ini** — cek dulu apakah ada error TypeScript/import sebelum dianggap selesai total. Kemungkinan kecil ada typo import atau field yang belum sinkron dengan skema live.
2. **Tabel `irrigation_types`** — form Admin Daerah Irigasi asumsi ada 2 row: "Daerah Irigasi Air Tanah" & "Daerah Irigasi Air Permukaan" (sesuai requirement awal). Kalau nama di DB beda persis, dropdown tetap jalan (ambil dari DB langsung) tapi cek penamaannya konsisten dengan ekspektasi user.
3. **RPC lama `admin_review_document`, `admin_delete_document`, `admin_delete_area`, `admin_delete_user`, `admin_list_users`, `admin_create_user`, `admin_update_user`, `admin_change_password`** — dipakai apa adanya (tidak diubah), asumsi parameter masih sama seperti sebelum sesi ini dimulai (tidak diverifikasi ulang skemanya di sesi ini, hanya di awal-awal sebelum migration 013).
4. **Bottom nav utk admin** jadi 7 item (4 utama + 3 admin) — bisa terlihat padat di layar HP kecil. Belum dites visual langsung.
5. **Form Admin Daerah Irigasi**: field Kecamatan/Desa/Outcome/Pagu dibuat `required` — kalau user mau boleh dikosongkan untuk data lama, perlu disesuaikan.
6. **Dialog Edit Daerah Irigasi** sekarang punya `max-h-[70vh] overflow-y-auto` karena form jadi panjang — pastikan tampilan tetap rapi di mobile.

## 📝 Catatan teknis penting (untuk sesi Claude berikutnya)

- **Tools yang benar untuk edit file di komputer user** (D:\Code\sidori): pakai `Filesystem:*` atau `filesystem:*` (dua tool beda huruf besar/kecil, SAMA fungsinya, targetnya komputer user via MCP). JANGAN pakai `str_replace`/`create_file`/`view` bawaan biasa — itu untuk sandbox Claude sendiri, BUKAN komputer user.
- User declined akses `Supabase:list_tables` (MCP langsung ke DB) — jangan coba lagi kecuali diminta. Kerja dari schema yang user kasih manual di chat / baca dari file migration.
- Struktur DB real (per skema yang user kasih manual + migration 013):
  - `users` (id, nip, name, password_hash, role: super_admin|user)
  - `irrigation_types` (id, name)
  - `irrigation_areas` (id, name, irrigation_type_id, status: active|approved|stock_program, tahun_anggaran, menu_kegiatan, kecamatan, desa, outcome_ha, pagu_rp)
  - `document_categories` (id, name, sort_order, menu_kegiatan)
  - `documents` (id, irrigation_area_id, category_id, file_name, file_url, status: review|rejected|approved, notes, uploaded_by, reviewed_by, year, file_size, file_id)
  - `sessions` (id, user_id, token, expires_at)
- Auth custom (bukan Supabase Auth) — NIP + password_hash, session token di tabel `sessions`.
- Upload dokumen pakai Google Apps Script (GAS), bukan Supabase Storage — lihat `.env`: `VITE_GAS_URL`, `VITE_GAS_API_KEY`.
- RPC baru dari migration 013 wajib dipakai untuk field lengkap area (`admin_create_area_full`/`admin_update_area_full`), RPC lama (`admin_create_area`/`admin_update_area`) tetap ada khusus untuk update status saja (dipakai UsulanPage & AdminAreasPage untuk field status).
