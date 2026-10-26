-- Instagram (API com Login do Instagram): conexão da conta e eventos do webhook.
-- Porte da JHF (20260721000002_ig_automacao.sql), só as 2 tabelas do login.
-- As do assistente do direct entram com o porte dele.

create table if not exists ig_config (
  id                   int primary key default 1,
  ig_user_id           text,
  ig_username          text,
  profile_picture_url  text,
  access_token         text,
  token_expires_at     timestamptz,
  updated_at           timestamptz not null default now(),
  constraint ig_config_singleton check (id = 1)
);

create table if not exists ig_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null,
  raw_payload   jsonb not null,
  processed     boolean not null default false,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists ig_events_created_idx on ig_events(created_at desc);
create index if not exists ig_events_processed_idx on ig_events(processed);

-- só o service role lê/escreve (token não pode vazar pela chave anon)
alter table ig_config enable row level security;
alter table ig_events enable row level security;
revoke all on ig_config from anon, authenticated;
revoke all on ig_events from anon, authenticated;
