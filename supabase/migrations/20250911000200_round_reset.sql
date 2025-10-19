-- Round-based voting reset

-- 1) Add current_round to voting_settings
ALTER TABLE voting_settings
ADD COLUMN IF NOT EXISTS current_round integer NOT NULL DEFAULT 0;

-- 2) Add vote_round to votes
ALTER TABLE votes
ADD COLUMN IF NOT EXISTS vote_round integer NOT NULL DEFAULT 0;

-- 3) Replace unique index to be per-round
DROP INDEX IF EXISTS idx_votes_unique_ip_contestant;
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_unique_ip_contestant_round
  ON votes(voter_ip, contestant_id, vote_round);

-- 4) Trigger to set vote_round from voting_settings.current_round on insert
CREATE OR REPLACE FUNCTION set_vote_round() RETURNS trigger AS $$
DECLARE r integer;
BEGIN
  SELECT current_round INTO r FROM voting_settings LIMIT 1;
  IF r IS NULL THEN r := 0; END IF;
  NEW.vote_round := r;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_vote_round_before_insert ON votes;
CREATE TRIGGER trg_set_vote_round_before_insert
BEFORE INSERT ON votes
FOR EACH ROW EXECUTE FUNCTION set_vote_round();

-- 5) Recreate vote_counts to aggregate only current round
DROP VIEW IF EXISTS vote_counts;
CREATE VIEW vote_counts AS
WITH round_cte AS (
  SELECT COALESCE((SELECT current_round FROM voting_settings LIMIT 1), 0) AS round
)
SELECT 
  c.id,
  c.name,
  c.description,
  c.instagram,
  c.image_url,
  COALESCE(v.vote_count, 0) AS vote_count
FROM contestants c
LEFT JOIN (
  SELECT 
    contestant_id,
    COUNT(*) AS vote_count
  FROM votes, round_cte r
  WHERE votes.vote_round = r.round
  GROUP BY contestant_id
) v ON c.id = v.contestant_id
WHERE c.is_active = true
ORDER BY vote_count DESC;

GRANT SELECT ON vote_counts TO anon;
GRANT SELECT ON vote_counts TO authenticated;
