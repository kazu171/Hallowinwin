-- unlimited_votingのデフォルト値をfalseに変更

-- 1. 既存のレコードを制限投票に更新
UPDATE voting_settings 
SET unlimited_voting = false;

-- 2. 確認用クエリ
SELECT 
  'Updated voting settings:' as info,
  is_voting_active,
  unlimited_voting,
  max_votes_per_ip,
  updated_at
FROM voting_settings;;
