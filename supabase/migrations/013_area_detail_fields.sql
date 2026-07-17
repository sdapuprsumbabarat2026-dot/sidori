-- ============================================================
-- SIDORI - Tambahan field Daerah Irigasi + kategori dokumen per menu
-- ============================================================

-- 1. IRRIGATION_AREAS: tambah field detail usulan
-- -------------------------------------------------
ALTER TABLE irrigation_areas
  ADD COLUMN IF NOT EXISTS tahun_anggaran integer NOT NULL DEFAULT EXTRACT(year FROM now()),
  ADD COLUMN IF NOT EXISTS menu_kegiatan text CHECK (menu_kegiatan IN ('peningkatan', 'pembangunan')),
  ADD COLUMN IF NOT EXISTS kecamatan text,
  ADD COLUMN IF NOT EXISTS desa text,
  ADD COLUMN IF NOT EXISTS outcome_ha numeric,
  ADD COLUMN IF NOT EXISTS pagu_rp numeric;

CREATE INDEX IF NOT EXISTS idx_irrigation_areas_tahun ON irrigation_areas(tahun_anggaran);
CREATE INDEX IF NOT EXISTS idx_irrigation_areas_menu ON irrigation_areas(menu_kegiatan);

-- 2. DOCUMENT_CATEGORIES: kategori berbeda untuk menu Peningkatan vs Pembangunan
-- -------------------------------------------------------------------------------
ALTER TABLE document_categories
  ADD COLUMN IF NOT EXISTS menu_kegiatan text CHECK (menu_kegiatan IN ('peningkatan', 'pembangunan'));

INSERT INTO document_categories (name, sort_order, menu_kegiatan) VALUES
  ('Data Calon Petani & Calon Lahan', 1, 'peningkatan'),
  ('Data Sumber Air', 2, 'peningkatan'),
  ('Dokumen Lingkungan (SPPL)', 3, 'peningkatan'),
  ('Gambar Desain', 4, 'peningkatan'),
  ('Gambar Area Kerja dan Akses Jalan', 5, 'peningkatan'),
  ('KAK', 6, 'peningkatan'),
  ('RAB', 7, 'peningkatan'),
  ('SPTJM Kesiapan Lahan dari Pemerintah Daerah', 8, 'peningkatan'),
  ('Data Calon Petani & Calon Lahan', 1, 'pembangunan'),
  ('Data Sumber Air', 2, 'pembangunan'),
  ('Dokumen Lingkungan (SPPL)', 3, 'pembangunan'),
  ('Gambar Desain', 4, 'pembangunan'),
  ('Gambar Area Kerja dan Akses Jalan', 5, 'pembangunan'),
  ('KAK', 6, 'pembangunan'),
  ('RAB', 7, 'pembangunan'),
  ('SPTJM Kesiapan Lahan dari Pemerintah Daerah', 8, 'pembangunan'),
  ('Surat Izin Penggunaan Lahan', 9, 'pembangunan')
ON CONFLICT DO NOTHING;

-- 3. RPC: admin_create_area_full / admin_update_area_full (form lengkap)
CREATE OR REPLACE FUNCTION admin_create_area_full(
  p_name text,
  p_irrigation_type_id uuid,
  p_menu_kegiatan text,
  p_kecamatan text,
  p_desa text,
  p_outcome_ha numeric,
  p_pagu_rp numeric,
  p_tahun_anggaran integer
)
RETURNS json AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO irrigation_areas (name, irrigation_type_id, menu_kegiatan, kecamatan, desa, outcome_ha, pagu_rp, tahun_anggaran, status)
  VALUES (p_name, p_irrigation_type_id, p_menu_kegiatan, p_kecamatan, p_desa, p_outcome_ha, p_pagu_rp, p_tahun_anggaran, 'active')
  RETURNING id INTO v_id;
  RETURN json_build_object('success', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_area_full(
  p_area_id uuid,
  p_name text,
  p_irrigation_type_id uuid,
  p_menu_kegiatan text,
  p_kecamatan text,
  p_desa text,
  p_outcome_ha numeric,
  p_pagu_rp numeric,
  p_tahun_anggaran integer
)
RETURNS json AS $$
BEGIN
  UPDATE irrigation_areas SET
    name = p_name,
    irrigation_type_id = p_irrigation_type_id,
    menu_kegiatan = p_menu_kegiatan,
    kecamatan = p_kecamatan,
    desa = p_desa,
    outcome_ha = p_outcome_ha,
    pagu_rp = p_pagu_rp,
    tahun_anggaran = p_tahun_anggaran
  WHERE id = p_area_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: riwayat daerah irigasi per user (untuk Manajemen Pengguna)
CREATE OR REPLACE FUNCTION admin_user_area_history(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(json_build_object(
    'id', d.id,
    'file_name', d.file_name,
    'status', d.status,
    'created_at', d.created_at,
    'area_name', a.name,
    'area_id', a.id
  ) ORDER BY d.created_at DESC) INTO v_result
  FROM documents d
  JOIN irrigation_areas a ON a.id = d.irrigation_area_id
  WHERE d.uploaded_by = p_user_id;
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
