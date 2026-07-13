CREATE OR REPLACE FUNCTION rpc_insert_document(
  p_irrigation_area_id UUID,
  p_category_id UUID,
  p_file_name TEXT,
  p_file_url TEXT,
  p_year INTEGER,
  p_file_size BIGINT,
  p_uploaded_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO documents (irrigation_area_id, category_id, file_name, file_url, year, file_size, uploaded_by)
  VALUES (p_irrigation_area_id, p_category_id, p_file_name, p_file_url, p_year, p_file_size, p_uploaded_by)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
