-- ============================================================
-- SIDORI - Change documents.category_id FK to kategori_dokumen
-- ============================================================

-- 1. Drop old FK constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_id_fkey;

-- 2. Update existing documents to reference kategori_dokumen IDs
-- Match by category name for rows where document_categories still has the old name
UPDATE documents d
SET category_id = kd.id
FROM document_categories dc
JOIN kategori_dokumen kd ON kd.name = dc.name
WHERE d.category_id = dc.id;

-- 3. Add new FK to kategori_dokumen
ALTER TABLE documents
  ADD CONSTRAINT documents_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES kategori_dokumen(id) ON DELETE CASCADE;
