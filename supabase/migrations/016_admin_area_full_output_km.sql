-- ============================================================
-- SIDORI - Update RPC admin_create_area_full / admin_update_area_full dengan output_km & status_verifikasi
-- ============================================================

CREATE OR REPLACE FUNCTION admin_create_area_full(
  p_name text,
  p_irrigation_type_id uuid,
  p_menu_kegiatan text,
  p_kecamatan text,
  p_desa text,
  p_outcome_ha numeric,
  p_pagu_rp numeric,
  p_tahun_anggaran integer,
  p_output_km numeric DEFAULT NULL,
  p_status_verifikasi text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO irrigation_areas (name, irrigation_type_id, menu_kegiatan, kecamatan, desa, outcome_ha, pagu_rp, tahun_anggaran, output_km, status_verifikasi, status)
  VALUES (p_name, p_irrigation_type_id, p_menu_kegiatan, p_kecamatan, p_desa, p_outcome_ha, p_pagu_rp, p_tahun_anggaran, p_output_km, p_status_verifikasi, 'active')
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
  p_tahun_anggaran integer,
  p_output_km numeric DEFAULT NULL,
  p_status_verifikasi text DEFAULT NULL
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
    tahun_anggaran = p_tahun_anggaran,
    output_km = p_output_km,
    status_verifikasi = p_status_verifikasi
  WHERE id = p_area_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
