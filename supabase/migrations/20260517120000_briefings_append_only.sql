-- Drop the unique (date, kind) constraint so briefings become append-only.
-- Existing rows are preserved; only the index is removed.
drop index if exists briefings_date_kind_unique_idx;

-- Lookup index for "most recent briefing for (date, kind)" queries.
create index if not exists briefings_date_kind_created_at_idx
  on briefings (date, kind, created_at desc);
