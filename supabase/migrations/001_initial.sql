-- ============================================================
-- SIDORI - Database Schema
-- Sistem Inventarisasi Dokumen Perencanaan Irigasi
-- ============================================================

-- 1. TABLES
-- ---------

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'user')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE irrigation_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE irrigation_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  irrigation_type_id uuid REFERENCES irrigation_types(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'approved', 'stock_program')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  irrigation_area_id uuid REFERENCES irrigation_areas(id) ON DELETE CASCADE,
  category_id uuid REFERENCES document_categories(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'review' CHECK (status IN ('review', 'rejected', 'approved')),
  notes text,
  uploaded_by uuid REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_documents_area ON documents(irrigation_area_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. AUTH FUNCTIONS
-- -----------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION auth_login(p_email text, p_password text)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_user FROM users WHERE email = p_email LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Email atau password salah');
  END IF;

  IF v_user.password_hash != crypt(p_password, v_user.password_hash) THEN
    RETURN json_build_object('success', false, 'error', 'Email atau password salah');
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO sessions (user_id, token, expires_at)
  VALUES (v_user.id, v_token, now() + interval '7 days');

  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'user', json_build_object(
      'id', v_user.id, 'email', v_user.email,
      'name', v_user.name, 'role', v_user.role,
      'created_at', v_user.created_at
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_check_session(p_token text)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT u.* INTO v_user
  FROM sessions s JOIN users u ON u.id = s.user_id
  WHERE s.token = p_token AND s.expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false);
  END IF;

  RETURN json_build_object(
    'success', true,
    'user', json_build_object(
      'id', v_user.id, 'email', v_user.email,
      'name', v_user.name, 'role', v_user.role,
      'created_at', v_user.created_at
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ADMIN FUNCTIONS
-- ------------------

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(json_build_object(
    'id', u.id, 'email', u.email, 'name', u.name,
    'role', u.role, 'created_at', u.created_at
  )) INTO v_result FROM users u ORDER BY u.created_at DESC;
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_create_user(p_email text, p_name text, p_password text, p_role text)
RETURNS json AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO users (email, name, password_hash, role)
  VALUES (p_email, p_name, crypt(p_password, gen_salt('bf')), p_role)
  RETURNING id INTO v_id;
  RETURN json_build_object('success', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS json AS $$
BEGIN
  DELETE FROM users WHERE id = p_user_id AND role != 'super_admin';
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_change_password(p_user_id uuid, p_new_password text)
RETURNS json AS $$
BEGIN
  UPDATE users SET password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_user_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. SEED DATA
-- ------------

INSERT INTO irrigation_types (name) VALUES
  ('Irigasi Air Permukaan'),
  ('Irigasi Air Tanah');

INSERT INTO document_categories (name, sort_order) VALUES
  ('Data Calon Petani & Calon Lahan', 1),
  ('Data Sumber Air', 2),
  ('Dokumen Lingkungan (SPPL)', 3),
  ('Gambar Desain', 4),
  ('Gambar Area Kerja dan Akses Jalan', 5),
  ('KAK', 6),
  ('RAB', 7),
  ('SPTJM Kesiapan Lahan dari Pemerintah Daerah', 8),
  ('Surat Izin Penggunaan Lahan', 9);

INSERT INTO users (email, name, password_hash, role)
VALUES ('admin', 'Administrator', crypt('admin123', gen_salt('bf')), 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- 5. STORAGE
-- ----------

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
