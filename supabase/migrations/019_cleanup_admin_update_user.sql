-- 1. Drop old 3-param overload that conflicts with 4-param version
DROP FUNCTION IF EXISTS admin_update_user(p_user_id uuid, p_name text, p_role text);

-- 1b. Fix admin_update_user: UPDATE users SET email was wrong (no email column), should be nip
CREATE OR REPLACE FUNCTION admin_update_user(p_user_id uuid, p_name text, p_role text, p_nip text DEFAULT NULL)
RETURNS json AS $$
BEGIN
  UPDATE users SET name = p_name, role = p_role WHERE id = p_user_id;
  IF p_nip IS NOT NULL THEN
    UPDATE users SET nip = p_nip WHERE id = p_user_id;
  END IF;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add nip field + fix email from auth.users (public.users has no email column)
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(json_build_object(
    'id', u.id, 'email', au.email, 'nip', u.nip, 'name', u.name,
    'role', u.role, 'created_at', u.created_at
  ) ORDER BY u.created_at DESC) INTO v_result
  FROM public.users u LEFT JOIN auth.users au ON u.id = au.id;
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
