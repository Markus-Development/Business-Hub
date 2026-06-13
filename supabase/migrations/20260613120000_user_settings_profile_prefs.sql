-- Additive: add three planner/UI preference columns to user_settings.
-- No drops, no destructive changes. The existing 'markus' row picks up the
-- column defaults automatically (Postgres backfills DEFAULT on ADD COLUMN).

alter table user_settings
  add column if not exists timeblock_horizon_days int  not null default 5,
  add column if not exists workday_start_hour     int  not null default 9,
  add column if not exists workday_end_hour       int  not null default 18,
  add column if not exists default_tab            text not null default '/projects';
