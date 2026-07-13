CREATE POLICY "anon_insert_documents" ON documents FOR INSERT TO anon WITH CHECK (true);
