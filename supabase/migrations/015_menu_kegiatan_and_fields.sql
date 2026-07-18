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

-- 5. Update admin_update_user to accept p_nip
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
    UPDATE users SET email = p_nip WHERE id = p_user_id;
  END IF;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
