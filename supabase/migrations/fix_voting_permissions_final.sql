-- 投票機能の権限問題を完全に修正するマイグレーション

-- 1. votesテーブルの権限を確認・修正
GRANT SELECT, INSERT ON votes TO anon;
GRANT ALL PRIVILEGES ON votes TO authenticated;

-- 2. contestantsテーブルの権限を確認・修正
GRANT SELECT ON contestants TO anon;
GRANT ALL PRIVILEGES ON contestants TO authenticated;

-- 3. voting_settingsテーブルの権限を確認・修正
GRANT SELECT, UPDATE, INSERT ON voting_settings TO anon;
GRANT ALL PRIVILEGES ON voting_settings TO authenticated;

-- 4. vote_countsビューの権限を確認・修正
GRANT SELECT ON vote_counts TO anon;
GRANT SELECT ON vote_counts TO authenticated;

-- 5. votesテーブルのRLSポリシーを再作成
DROP POLICY IF EXISTS "Allow anon to read votes" ON votes;
CREATE POLICY "Allow anon to read votes" ON votes
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anon to insert votes" ON votes;
CREATE POLICY "Allow anon to insert votes" ON votes
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to votes" ON votes;
CREATE POLICY "Allow authenticated full access to votes" ON votes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. contestantsテーブルのRLSポリシーを再作成
DROP POLICY IF EXISTS "Allow anon to read contestants" ON contestants;
CREATE POLICY "Allow anon to read contestants" ON contestants
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access to contestants" ON contestants;
CREATE POLICY "Allow authenticated full access to contestants" ON contestants
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. 初期データを確認・挿入
INSERT INTO voting_settings (
  voting_start_time,
  voting_end_time,
  is_voting_active,
  max_votes_per_ip
)
SELECT 
  '2024-10-31T18:00:00+09:00'::timestamptz,
  '2024-10-31T22:00:00+09:00'::timestamptz,
  true,  -- 投票を有効にする
  1
WHERE NOT EXISTS (SELECT 1 FROM voting_settings);

-- 8. 既存の設定がある場合は投票を有効にする
UPDATE voting_settings 
SET is_voting_active = true, 
    updated_at = NOW()
WHERE is_voting_active = false;

-- 9. テスト用候補者データを挿入（存在しない場合のみ）
INSERT INTO contestants (name, description, category, is_active)
SELECT 
  'テスト候補者1',
  'ハロウィン仮装テスト用候補者です',
  'テスト',
  true
WHERE NOT EXISTS (SELECT 1 FROM contestants WHERE name = 'テスト候補者1');

INSERT INTO contestants (name, description, category, is_active)
SELECT 
  'テスト候補者2',
  'ハロウィン仮装テスト用候補者です',
  'テスト',
  true
WHERE NOT EXISTS (SELECT 1 FROM contestants WHERE name = 'テスト候補者2');

-- 10. 権限確認クエリ
SELECT 
  'Final permissions check:' as info,
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('votes', 'contestants', 'voting_settings')
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- 11. RLSポリシー確認
SELECT 
  'RLS policies check:' as info,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('votes', 'contestants', 'voting_settings')
ORDER BY tablename, policyname;

-- 12. データ確認
SELECT 'Voting settings:' as info, * FROM voting_settings;
SELECT 'Contestants count:' as info, COUNT(*) as total FROM contestants WHERE is_active = true;
SELECT 'Votes count:' as info, COUNT(*) as total FROM votes;