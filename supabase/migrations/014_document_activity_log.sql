-- ============================================================
-- SIDORI - Log aktivitas dokumen (upload / hapus / review)
-- Ditampilkan di halaman "Upload Dokumen" supaya admin & user bisa lihat
-- siapa melakukan apa terhadap dokumen.
-- ============================================================

CREATE TABLE IF NOT EXISTS document_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid, -- boleh null kalau dokumennya sudah dihapus
  irrigation_area_id uuid REFERENCES irrigation_areas(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  category_name text,
  action text NOT NULL CHECK (action IN ('upload', 'delete', 'approved', 'rejected')),
  performed_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_activity_log_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_activity_log_area ON document_activity_log(irrigation_area_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON document_activity_log(created_at DESC);

ALTER TABLE document_activity_log ENABLE ROW LEVEL SECURITY;

-- Pola sama seperti tabel documents (anon insert/select karena app pakai auth custom, bukan Supabase Auth)
CREATE POLICY "anon_insert_activity_log" ON document_activity_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_activity_log" ON document_activity_log FOR SELECT TO anon USING (true);
