-- Add instagram field to contestants table
ALTER TABLE contestants ADD COLUMN instagram VARCHAR(255);

-- Update the vote_counts view to include instagram field
DROP VIEW IF EXISTS vote_counts;

CREATE VIEW vote_counts AS
SELECT 
  c.id,
  c.name,
  c.category,
  c.description,
  c.instagram,
  ci.image_url,
  COALESCE(v.vote_count, 0) as vote_count
FROM contestants c
LEFT JOIN (
  SELECT 
    contestant_id,
    COUNT(*) as vote_count
  FROM votes
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
ORDER BY vote_count DESC;;
