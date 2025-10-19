-- 投票機能のデバッグ用SQL

-- 1. votesテーブルの権限確認
SELECT 
  'votes table permissions:' as info,
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'votes'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- 2. votesテーブルのRLSポリシー確認
SELECT 
  'votes RLS policies:' as info,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'votes';

-- 3. contestantsテーブルの確認
SELECT 
  'contestants count:' as info,
  COUNT(*) as total_contestants,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_contestants
FROM contestants;

-- 4. 現在の投票設定確認
SELECT 
  'current voting settings:' as info,
  id,
  is_voting_active,
  voting_start_time,
  voting_end_time,
  max_votes_per_ip,
  created_at,
  updated_at
FROM voting_settings;

-- 5. 既存の投票データ確認
SELECT 
  'existing votes:' as info,
  COUNT(*) as total_votes,
  COUNT(DISTINCT voter_ip) as unique_voters,
  COUNT(DISTINCT contestant_id) as voted_contestants
FROM votes;

-- 6. テスト用の投票データ挿入（実際の投票処理をシミュレート）
-- INSERT INTO votes (contestant_id, voter_ip) 
-- SELECT 
--   (SELECT id FROM contestants WHERE is_active = true LIMIT 1),
--   '192.168.1.100'::inet
-- WHERE NOT EXISTS (
--   SELECT 1 FROM votes 
--   WHERE voter_ip = '192.168.1.100'::inet
-- );