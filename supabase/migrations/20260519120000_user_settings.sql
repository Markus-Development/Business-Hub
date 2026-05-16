create table if not exists user_settings (
  user_key text primary key,
  timezone text not null default 'Asia/Dubai',
  master_calendar_id text,
  task_type_windows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into user_settings (user_key, timezone, master_calendar_id, task_type_windows)
values ('markus', 'Asia/Dubai', null, '[]'::jsonb)
on conflict (user_key) do nothing;
