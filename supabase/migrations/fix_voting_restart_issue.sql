-- 投票再開機能の問題を修正するためのマイグレーション

-- 1. voting_settingsテーブルに初期データが存在するか確認し、なければ挿入
INSERT INTO voting_settings (
  voting_start_time,
  voting_end_time,
  is_voting_active,
  max_votes_per_ip
)
SELECT 
  '2024-10-31 18:00:00+09'::timestamptz,
  '2024-10-31 22:00:00+09'::timestamptz,
  false,
  1
WHERE NOT EXISTS (SELECT 1 FROM voting_settings);

-- 2. anonロールに必要な権限を付与
GRANT SELECT, UPDATE ON voting_settings TO anon;

-- 3. authenticatedロールに全権限を付与
GRANT ALL PRIVILEGES ON voting_settings TO authenticated;

-- 4. 現在の設定を確認（デバッグ用）
SELECT 
  'Current voting_settings:' as info,
  id,
  is_voting_active,
  voting_start_time,
  voting_end_time,
  max_votes_per_ip,
  created_at,
  updated_at
FROM voting_settings;

-- 5. 権限確認
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