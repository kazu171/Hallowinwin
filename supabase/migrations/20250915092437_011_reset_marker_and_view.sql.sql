-- Add a reset marker to voting_settings and make vote_counts respect it

ALTER TABLE voting_settings
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ;

-- Recreate vote_counts view to filter votes after last_reset_at
DROP VIEW IF EXISTS vote_counts;

CREATE VIEW vote_counts AS
WITH reset_cte AS (
  SELECT COALESCE((SELECT last_reset_at FROM voting_settings LIMIT 1), '-infinity'::timestamptz) AS reset_at
)
SELECT 
  c.id,
  c.name,
  c.category,
  c.description,
  c.instagram,
  ci.image_url,
  COALESCE(v.vote_count, 0) AS vote_count
FROM contestants c
LEFT JOIN (
  SELECT 
    contestant_id,
    COUNT(*) AS vote_count
  FROM votes, reset_cte r
  WHERE votes.created_at >= r.reset_at
  GROUP BY contestant_id
) v ON c.id = v.contestant_id
LEFT JOIN (
  SELECT DISTINCT ON (contestant_id)
    contestant_id,
    image_url
  FROM contestant_images
  WHERE is_primary = true
  ORDER BY contestant_id, created_at DESC
) ci ON c.id = ci.contestant_id
WHERE c.is_active = true
ORDER BY vote_count DESC;

GRANT SELECT ON vote_counts TO anon;
GRANT SELECT ON vote_counts TO authenticated;

;
