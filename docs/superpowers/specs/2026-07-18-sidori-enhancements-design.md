# SIDORI - Enhancement Design

## 1. Upload Performance (Poin 1)
- **Issue:** Upload lambat walau <5MB.
- **Plan:** Investigasi bottleneck — kemungkinan kompresi gambar di browser (resize canvas) + upload Base64 ke GAS. Tambah opsi upload langsung tanpa kompresi untuk file non-gambar, optimasi chunk size. Jika GAS endpoint lambat, pertimbangkan upload langsung ke Google Drive API.

## 2. Drive Storage Organization (Poin 2)
**Current:** `Tahun > Jenis Irigasi > Kategori Dokumen`
**New:** `Tahun > Jenis Irigasi > Daerah Irigasi (nama DI)`
- Ubah folder path di GAS upload script.
- File tetap punya metadata kategori di database, tapi folder Drive tidak lagi per kategori.

## 3. Review Dokumen — Grouping + Catatan (Poin 3, 11)
- Card review dikelompokkan: **Jenis Irigasi > Daerah Irigasi** (accordion/grouped list).
- Admin bisa tulis catatan perbaikan (textarea per dokumen saat review → "Tidak Sesuai").
- Tampilkan metadata dokumen: tahun, kategori, ukuran, uploader.
- Catatan disimpan di `documents.notes`.

## 4. Form Daerah Irigasi — Output Km + Status Verifikasi (Poin 4, 13)
- Tambah field `output_km numeric` ke `irrigation_areas`.
- Ubah `status` jadi `status_verifikasi` atau field baru dengan nilai `usulan_baru` / `stock_program`.
- Tampil di Riwayat (dengan total) dan Dashboard.

## 5. Menu Kegiatan — Master Data (Poin 5)
- Halaman admin baru: **Menu Kegiatan**.
- CRUD kategori dokumen per menu kegiatan (Peningkatan/Pembangunan).
- Hitung total kategori dinamis, bukan hardcode `CATEGORY_TOTAL`.

## 6. Navigasi Admin (Poin 6)
Urutan sidebar admin:
1. Daerah Irigasi (`/admin/areas`)
2. Menu Kegiatan (`/admin/kegiatan` — baru)
3. Review Dokumen (`/admin/review`)
4. Manajemen Pengguna (`/admin/users`)

## 7. Edit NIP (Poin 7)
- Field NIP di edit user **tidak disabled** untuk admin.

## 8-9. Kategorisasi Tahun — Upload & Admin Areas (Poin 8, 9)
- Daftar DI dikelompokkan per tahun (accordion/tabs).
- Berlaku di AreaDocumentsPage (upload) dan AdminAreasPage.

## 10. User: Hapus Dokumen Rejected + Lihat Catatan (Poin 10)
- Jika status dokumen = `rejected`, tombol hapus muncul untuk user (bukan hanya admin).
- Tampilkan catatan admin (`notes`) di kartu dokumen.

## 12. Usulan Kegiatan — Kategorisasi Tahun
- Sama seperti poin 8-9, dikelompokkan per tahun.

## 13. Riwayat — Kolom Baru
- Tambah kolom: **Status Verifikasi** (`usulan_baru` / `stock_program`), **Output (Km)** dengan total.
- Status `stock_program` tampilkan label "Dijadikan stock program".

## 14. Dashboard — Output Km, Warna Card, Layout
- Tambah card "Total Output (Km)" dan "Output (Km) Disetujui".
- Warna fill card solid (tidak transparan) untuk mode terang.
- Card diperkecil ukurannya.

## Files to Modify
- `src/types/index.ts` — tipe IrrigationArea
- `src/pages/admin/AdminAreasPage.tsx` — grouping tahun, field baru
- `src/pages/admin/AdminReviewPage.tsx` — grouping, catatan, metadata
- `src/pages/admin/AdminUsersPage.tsx` — NIP bisa diedit
- `src/pages/AreaDocumentsPage.tsx` — grouping tahun, user hapus rejected
- `src/pages/DashboardPage.tsx` — Output Km, warna, layout
- `src/pages/RiwayatPage.tsx` — kolom baru
- `src/pages/UsulanPage.tsx` — grouping tahun
- `src/components/layout/Sidebar.tsx` — urutan admin
- `src/components/layout/BottomNav.tsx` — urutan admin
- `src/pages/admin/AdminKegiatanPage.tsx` — **baru**
- `supabase/migrations/015_...sql` — migrasi DB
- GAS script — struktur folder Drive

## Database Changes
- `irrigation_areas`: tambah `output_km numeric`, ganti `status` atau field baru `status_verifikasi`
- `menu_kegiatan` + `kategori_dokumen` jadi master data (table baru)
- `documents.notes` sudah ada, dipakai untuk catatan review
