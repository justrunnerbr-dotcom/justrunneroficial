-- Agente de IA conversacional da aba Meta Ads.
-- Histórico de mensagens + nota de estratégia acumulada (memória de longo prazo do agente).
-- Rodar manualmente no SQL Editor do Supabase Dashboard (sem CLI configurado neste projeto).

create table if not exists meta_ads_agent_messages (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null default 'a0000000-0000-0000-0000-000000000001',
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_meta_ads_agent_messages_store_created
  on meta_ads_agent_messages (store_id, created_at);

create table if not exists meta_ads_agent_memory (
  store_id   uuid primary key default 'a0000000-0000-0000-0000-000000000001',
  notes      text not null default '',
  updated_at timestamptz not null default now()
);

alter table meta_ads_agent_messages disable row level security;
alter table meta_ads_agent_memory   disable row level security;
