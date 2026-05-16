create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null,
  kind text not null check (kind in ('daily', 'weekly')),
  summary text not null,
  model text not null,
  input_hash text not null,
  expires_at timestamptz
);

create index if not exists briefings_date_idx on briefings (date);

create unique index if not exists briefings_date_kind_unique_idx on briefings (date, kind);
