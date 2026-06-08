-- Add a locale dimension to briefings so the daily AI Digest is cached
-- separately per language (DE / EN). Additive + backfill-safe: existing rows
-- (all generated in English before this change) default to 'de' only for the
-- column default; the route keys new cache lookups on (date, kind, locale), so
-- pre-existing rows simply won't match a same-day lookup and a fresh
-- locale-correct briefing is generated on first request per locale.
alter table briefings
  add column if not exists locale text not null default 'de';
