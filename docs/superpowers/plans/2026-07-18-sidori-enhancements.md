# SIDORI Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 14 enhancement items for SIDORI app.

**Architecture:** React SPA with shadcn/ui, Supabase backend (supabase-sidori), Google Drive via GAS.

**Tech Stack:** React 18, TypeScript, shadcn/ui, Tailwind CSS, Supabase, PostgreSQL

## Global Constraints

- Pakai `supabase-sidori` MCP server untuk semua operasi DB.
- Migrasi SQL: jalankan via `supabase-sidori_apply_migration`.
- GAS script path: `D:\Code\sidori\gas\` (Google Apps Script).
- Ikuti pattern komponen yang sudah ada (shadcn/ui + lucide-react).
- I18n: Bahasa Indonesia.

---

### Task 1: Database Migration — Field Baru + Table Menu Kegiatan

**Files:**
- Create: `supabase/migrations/015_menu_kegiatan_and_fields.sql`

**Interfaces:**
- Produces: table `menu_kegiatan`, table `kategori_dokumen`, field `output_km` di `irrigation_areas`

- [ ] **Step 1: Tulis migration SQL**

```sql
-- ============================================================
-- SIDORI - Menu Kegiatan (master data) + field baru
-- ============================================================

-- 1. TABLE: menu_kegiatan
CREATE TABLE IF NOT EXISTS menu_kegiatan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

INSERT INTO menu_kegiatan (name, slug) VALUES
  ('Peningkatan', 'peningkatan'),
  ('Pembangunan', 'pembangunan')
ON CONFLICT (slug) DO NOTHING;

-- 2. TABLE: kategori_dokumen (per menu kegiatan)
CREATE TABLE IF NOT EXISTS kategori_dokumen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_kegiatan_id uuid REFERENCES menu_kegiatan(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO kategori_dokumen (menu_kegiatan_id, name, sort_order)
SELECT mk.id, values.name, values.sort_order
FROM menu_kegiatan mk
CROSS JOIN (VALUES
  ('Data Calon Petani & Calon Lahan', 1),
  ('Data Sumber Air', 2),
  ('Dokumen Lingkungan (SPPL)', 3),
  ('Gambar Desain', 4),
  ('Gambar Area Kerja dan Akses Jalan', 5),
  ('KAK', 6),
  ('RAB', 7),
  ('SPTJM Kesiapan Lahan dari Pemerintah Daerah', 8)
) AS values(name, sort_order)
WHERE mk.slug = 'peningkatan'
ON CONFLICT DO NOTHING;

INSERT INTO kategori_dokumen (menu_kegiatan_id, name, sort_order)
SELECT mk.id, values.name, values.sort_order
FROM menu_kegiatan mk
CROSS JOIN (VALUES
  ('Data Calon Petani & Calon Lahan', 1),
  ('Data Sumber Air', 2),
  ('Dokumen Lingkungan (SPPL)', 3),
  ('Gambar Desain', 4),
  ('Gambar Area Kerja dan Akses Jalan', 5),
  ('KAK', 6),
  ('RAB', 7),
  ('SPTJM Kesiapan Lahan dari Pemerintah Daerah', 8),
  ('Surat Izin Penggunaan Lahan', 9)
) AS values(name, sort_order)
WHERE mk.slug = 'pembangunan'
ON CONFLICT DO NOTHING;

-- 3. IRRIGATION_AREAS: tambah output_km + status_verifikasi
ALTER TABLE irrigation_areas
  ADD COLUMN IF NOT EXISTS output_km numeric,
  ADD COLUMN IF NOT EXISTS status_verifikasi text CHECK (status_verifikasi IN ('usulan_baru', 'stock_program'));

-- 4. RPC baru untuk CRUD kategori_dokumen
CREATE OR REPLACE FUNCTION admin_list_kategori_dokumen()
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(json_build_object(
    'id', kd.id,
    'menu_kegiatan_id', kd.menu_kegiatan_id,
    'menu_kegiatan', mk.name,
    'menu_slug', mk.slug,
    'name', kd.name,
    'sort_order', kd.sort_order
  ) ORDER BY mk.name, kd.sort_order) INTO v_result
  FROM kategori_dokumen kd
  JOIN menu_kegiatan mk ON mk.id = kd.menu_kegiatan_id;
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_insert_kategori_dokumen(
  p_menu_kegiatan_id uuid,
  p_name text,
  p_sort_order int
)
RETURNS json AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO kategori_dokumen (menu_kegiatan_id, name, sort_order)
  VALUES (p_menu_kegiatan_id, p_name, p_sort_order)
  RETURNING id INTO v_id;
  RETURN json_build_object('success', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_kategori_dokumen(
  p_id uuid,
  p_name text,
  p_sort_order int
)
RETURNS json AS $$
BEGIN
  UPDATE kategori_dokumen SET name = p_name, sort_order = p_sort_order WHERE id = p_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_kategori_dokumen(p_id uuid)
RETURNS json AS $$
BEGIN
  DELETE FROM kategori_dokumen WHERE id = p_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Apply migration**

Jalankan via `supabase-sidori_apply_migration`.

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update types**

```typescript
export interface MenuKegiatan {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface KategoriDokumen {
  id: string;
  menu_kegiatan_id: string;
  menu_kegiatan?: string;
  menu_slug?: string;
  name: string;
  sort_order: number;
}

export interface IrrigationArea {
  id: string;
  name: string;
  irrigation_type_id: string;
  status: "active" | "approved" | "stock_program";
  status_verifikasi?: "usulan_baru" | "stock_program";
  output_km?: number;
  // ... existing fields
  created_at: string;
}
```

---

### Task 3: Update GAS Script — Folder Structure

**Files:**
- Modify: `gas/` (sesuaikan dengan script GAS yang ada)

- [ ] **Step 1: Ubah folder path di GAS**

Ubah struktur folder dari:
```
Tahun / Jenis Irigasi / Kategori Dokumen
```
menjadi:
```
Tahun / Jenis Irigasi / Daerah Irigasi
```

---

### Task 4: Halaman Admin Menu Kegiatan (Baru)

**Files:**
- Create: `src/pages/admin/AdminKegiatanPage.tsx`
- Modify: `src/App.tsx` (route baru)

- [ ] **Step 1: Buat halaman AdminKegiatanPage**

CRUD untuk `kategori_dokumen` per menu kegiatan. List semua kategori, bisa tambah/edit/hapus.

Pattern: ikuti AdminAreasPage (dialog + form).

```typescript
export default function AdminKegiatanPage() {
  // list kategori_dokumen via admin_list_kategori_dokumen
  // CRUD via RPC
  // Tampilkan grouped by menu kegiatan
}
```

- [ ] **Step 2: Tambah route di App.tsx**

```typescript
import AdminKegiatanPage from "./pages/admin/AdminKegiatanPage";
// ...
<Route path="admin/kegiatan" element={<ProtectedRoute adminOnly><AdminKegiatanPage /></ProtectedRoute>} />
```

---

### Task 5: Update Navigasi — Sidebar + BottomNav

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/BottomNav.tsx`

**Urutan admin:**
1. Daerah Irigasi (`/admin/areas`)
2. Menu Kegiatan (`/admin/kegiatan`)
3. Review Dokumen (`/admin/review`)
4. Pengguna (`/admin/users`)

- [ ] **Step 1: Update Sidebar.tsx adminItems**

```typescript
const adminItems = [
  { to: "/admin/areas", icon: MapPin, label: "Daerah Irigasi" },
  { to: "/admin/kegiatan", icon: ListChecks, label: "Menu Kegiatan" },
  { to: "/admin/review", icon: FileCheck, label: "Review Dokumen" },
  { to: "/admin/users", icon: Users, label: "Pengguna" },
];
```

- [ ] **Step 2: Update BottomNav.tsx adminItems**

```typescript
const adminItems = [
  { to: "/admin/areas", icon: MapPin, label: "Area" },
  { to: "/admin/kegiatan", icon: ListChecks, label: "Kegiatan" },
  { to: "/admin/review", icon: FileCheck, label: "Review" },
  { to: "/admin/users", icon: Users, label: "Pengguna" },
];
```

---

### Task 6: Admin Daerah Irigasi — Grouping Tahun + Field Baru

**Files:**
- Modify: `src/pages/admin/AdminAreasPage.tsx`

**Changes:**
- Group daerah irigasi per tahun (accordion/tabs).
- Tambah field **Output (Km)** di form.
- Tambah field **Status Verifikasi** (`usulan_baru` / `stock_program`) di form.
- Kirim `output_km` dan `status_verifikasi` ke RPC.

---

### Task 7: Review Dokumen — Grouping + Catatan + Metadata

**Files:**
- Modify: `src/pages/admin/AdminReviewPage.tsx`

**Changes:**
- Group by **Jenis Irigasi > Daerah Irigasi**.
- Tambah textarea untuk catatan perbaikan saat reject.
- Tampilkan metadata: tahun dokumen, kategori, uploader.
- Simpan notes via `admin_review_document` RPC (update `documents.notes`).

---

### Task 8: Admin Users — NIP Bisa Diedit

**Files:**
- Modify: `src/pages/admin/AdminUsersPage.tsx`

**Changes:**
- Field NIP di dialog edit: `disabled` dihapus, admin bisa ubah NIP.
- Kirim `p_nip` ke `admin_update_user` RPC (tambah parameter jika belum ada).

- [ ] **Step 1: Migration — update RPC**

```sql
CREATE OR REPLACE FUNCTION admin_update_user(
  p_user_id uuid,
  p_name text,
  p_role text,
  p_nip text DEFAULT NULL
)
RETURNS json AS $$
BEGIN
  UPDATE users SET name = p_name, role = p_role WHERE id = p_user_id;
  IF p_nip IS NOT NULL THEN
    UPDATE users SET nip = p_nip WHERE id = p_user_id;
  END IF;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Task 9: Upload Dokumen — Grouping Tahun + User Hapus Rejected

**Files:**
- Modify: `src/pages/AreaDocumentsPage.tsx`

**Changes:**
- Group dokumen per tahun (accordion/tabs).
- Jika `doc.status === "rejected"`:
  - Tampilkan catatan admin (`doc.notes`).
  - Tombol hapus muncul untuk user (bukan hanya admin).
- Batalkan constraint unique category (karena user bisa upload ulang setelah hapus).

---

### Task 10: Usulan Kegiatan — Grouping Tahun

**Files:**
- Modify: `src/pages/UsulanPage.tsx`

**Changes:**
- Group daerah irigasi per tahun di kedua tab (Menunggu Verifikasi & Hasil Verifikasi).

---

### Task 11: Riwayat — Kolom Baru

**Files:**
- Modify: `src/pages/RiwayatPage.tsx`

**Changes:**
- Tambah kolom **Status Verifikasi** (`usulan_baru` / `stock_program`).
- Tambah kolom **Output (Km)**.
- Baris total: jumlah Output (Km).
- Untuk `status = stock_program` tampilkan "Dijadikan stock program".

---

### Task 12: Dashboard — Output Km + Warna + Layout

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Changes:**
- Tambah indikator "Total Output (Km)" dan "Output Disetujui (Km)".
- Warna fill card solid (ganti `bg-white/90` dll jadi warna solid dengan `dark:` variant).
- Card diperkecil (adjust grid: `lg:grid-cols-4` atau padding diperkecil).

---

### Task 13: Update Document Categories Query — Pakai KategoriDokumen Table

**Files:**
- Modify: `src/pages/AreaDocumentsPage.tsx` (query categories)

**Changes:**
- Ganti query `document_categories` jadi `kategori_dokumen` join `menu_kegiatan`.
- Filter kategori berdasarkan `menu_kegiatan_id` area.
- Total kategori dihitung dinamis (bukan hardcode).
