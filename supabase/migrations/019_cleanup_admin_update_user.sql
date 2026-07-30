-- 1. Drop old 3-param overload that conflicts with 4-param version
DROP FUNCTION IF EXISTS admin_update_user(p_user_id uuid, p_name text, p_role text);

-- 2. Add nip field to admin_list_users output for frontend edit form
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(json_build_object(
    'id', u.id, 'email', u.email, 'nip', u.email, 'name', u.name,
    'role', u.role, 'created_at', u.created_at
  )) INTO v_result FROM users u ORDER BY u.created_at DESC;
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
