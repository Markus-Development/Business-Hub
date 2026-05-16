create table if not exists time_block_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null,
  project_name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  rationale text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  google_event_id text,
  batch_id uuid not null
);

create index if not exists time_block_suggestions_date_idx
  on time_block_suggestions (date);

create index if not exists time_block_suggestions_date_status_created_at_idx
  on time_block_suggestions (date, status, created_at desc);
