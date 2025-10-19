-- voting_settingsテーブルの権限とRLSポリシーを修正

-- 1. anonロールにINSERT権限を付与
GRANT INSERT ON voting_settings TO anon;

-- 2. authenticatedロールにも全権限を確認
GRANT ALL PRIVILEGES ON voting_settings TO authenticated;

-- 3. RLSポリシーを確認し、必要に応じて作成
-- anonロールがvoting_settingsを読み取り・更新できるポリシー
DROP POLICY IF EXISTS "Allow anon to read voting_settings" ON voting_settings;
CREATE POLICY "Allow anon to read voting_settings" ON voting_settings
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anon to update voting_settings" ON voting_settings;
CREATE POLICY "Allow anon to update voting_settings" ON voting_settings
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to insert voting_settings" ON voting_settings;
CREATE POLICY "Allow anon to insert voting_settings" ON voting_settings
  FOR INSERT TO anon
  WITH CHECK (true);

-- 4. authenticatedロールのポリシー
DROP POLICY IF EXISTS "Allow authenticated full access to voting_settings" ON voting_settings;
CREATE POLICY "Allow authenticated full access to voting_settings" ON voting_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. 初期データを挿入（存在しない場合のみ）
INSERT INTO voting_settings (
  voting_start_time,
  voting_end_time,
  is_voting_active,
  max_votes_per_ip
)
SELECT 
  '2024-10-31T18:00:00+09:00'::timestamptz,
  '2024-10-31T22:00:00+09:00'::timestamptz,
  false,
  1
WHERE NOT EXISTS (SELECT 1 FROM voting_settings);

-- 6. 権限確認
SELECT 
  'Permissions check:' as info,
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'voting_settings'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- 7. ポリシー確認
SELECT 
  'RLS Policies:' as info,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'voting_settings';