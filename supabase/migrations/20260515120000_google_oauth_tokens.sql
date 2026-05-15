create table if not exists google_oauth_tokens (
  user_key text primary key default 'markus',
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
