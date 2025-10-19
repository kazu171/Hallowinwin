-- Hardening: make vote_counts independent from category, ensure contestants.image_url exists,
-- and ensure anon can SELECT required tables (contestants, votes)

-- 0) Ensure image_url column exists on contestants
alter table if exists contestants
  add column if not exists image_url text;

-- 1) Recreate vote_counts view (no category dependency)
drop view if exists vote_counts;
create view vote_counts as
with round_cte as (
  select coalesce((select current_round from voting_settings limit 1), 0) as round
)
select 
  c.id,
  c.name,
  c.description,
  c.instagram,
  c.image_url,
  coalesce(v.vote_count, 0) as vote_count
from contestants c
left join (
  select 
    contestant_id,
    count(*) as vote_count
  from votes, round_cte r
  where votes.vote_round = r.round
  group by contestant_id
) v on c.id = v.contestant_id
where c.is_active = true
order by vote_count desc;

grant select on vote_counts to anon;
grant select on vote_counts to authenticated;

-- 2) Ensure RLS + policies permit reading for anon
alter table if exists contestants enable row level security;
drop policy if exists "allow anon read contestants" on contestants;
create policy "allow anon read contestants"
  on contestants for select to anon using (true);
grant select on contestants to anon;

alter table if exists votes enable row level security;
drop policy if exists "allow anon read votes" on votes;
create policy "allow anon read votes"
  on votes for select to anon using (true);
grant select on votes to anon;

