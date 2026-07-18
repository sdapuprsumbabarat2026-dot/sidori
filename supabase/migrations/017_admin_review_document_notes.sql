CREATE OR REPLACE FUNCTION admin_review_document(
  p_doc_id uuid,
  p_status text,
  p_reviewed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS json AS $$
BEGIN
  UPDATE documents SET
    status = p_status,
    reviewed_by = p_reviewed_by,
    updated_at = now(),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_doc_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
