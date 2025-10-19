-- 投票を有効化して「注目の仮装」ページとして表示するためのマイグレーション

-- 1. 投票を有効化
UPDATE voting_settings 
SET 
  is_voting_active = true,
  voting_start_time = NOW(),
  voting_end_time = NOW() + INTERVAL '4 hours',
  updated_at = NOW()
WHERE id = (SELECT id FROM voting_settings LIMIT 1);

-- 2. 設定確認
SELECT 
  'Updated voting settings for attention page:' as info,
  is_voting_active,
  unlimited_voting,
  max_votes_per_ip,
  voting_start_time,
  voting_end_time,
  updated_at
FROM voting_settings;

-- 3. 投票データの確認
SELECT 
  'Current vote counts:' as info,
  COUNT(*) as total_votes
FROM votes;

-- 4. 候補者と投票数の確認
SELECT 
  'Contestants with vote counts:' as info,
  c.name,
  COALESCE(COUNT(v.id), 0) as vote_count
FROM contestants c
LEFT JOIN votes v ON c.id = v.contestant_id
GROUP BY c.id, c.name
ORDER BY vote_count DESC;;
