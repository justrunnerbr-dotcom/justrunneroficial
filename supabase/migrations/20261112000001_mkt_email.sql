-- E-mail marketing da Just Runner pela Resend (porte do módulo da JHF, só e-mail).
-- Prefixo mkt_; RLS ligado SEM políticas + revoke de anon/authenticated: só a
-- service role (rotas do servidor) lê e grava, mesmo padrão do ig_*.
-- Idempotente: pode ser colada de novo no SQL Editor sem quebrar nada.
--
-- Fluxo: rascunho → o dono clica "Aprovar e agendar" (status 'scheduled') → o
-- drain (pg_cron, 1/min) promove para 'sending' na hora marcada, monta a fila em
-- fatias de até 500 e envia ~40/min → 'completed' quando a fila esvazia.

-- ── contatos (a JR não tem customer_purchase_stats completo por cliente: a base
--    de e-mail vem do /customers da Yampi + estatística dos pedidos pagos) ──────
create table if not exists mkt_contacts (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  name              text,
  phone             text,
  source            text,
  yampi_customer_id bigint,
  newsletter        boolean not null default false,
  total_spent       numeric(12,2) not null default 0,
  orders_count      integer not null default 0,
  last_order_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint mkt_contacts_email_lower check (email = lower(btrim(email)))
);
create unique index if not exists mkt_contacts_email_key on mkt_contacts(email);
create index if not exists mkt_contacts_last_order_idx on mkt_contacts(last_order_at);

-- ── modelos ──────────────────────────────────────────────────────────────────
create table if not exists mkt_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  channel     text not null default 'email' check (channel in ('email', 'sms')),
  subject     text,
  body        text not null,
  variables   text[] not null default '{}',
  -- estrutura editável do kit (EmailDoc); body é o HTML final gerado a partir dela
  blocks      jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── públicos ─────────────────────────────────────────────────────────────────
create table if not exists mkt_segments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('todos_clientes', 'cliente_sumido', 'compradores', 'lista_customizada')),
  criteria    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ── campanhas ────────────────────────────────────────────────────────────────
create table if not exists mkt_campaigns (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  channel          text not null default 'email' check (channel in ('email', 'sms')),
  template_id      uuid not null references mkt_templates(id),
  segment_id       uuid references mkt_segments(id),
  kind             text not null default 'manual' check (kind in ('manual', 'teste')),
  status           text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'completed', 'paused')),
  scheduled_for    timestamptz,
  approved_at      timestamptz,
  -- preenchido quando a fila inteira já foi montada (o drain para de materializar)
  materialized_at  timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists mkt_campaigns_status_idx on mkt_campaigns(status);

-- ── envios (1 linha por destinatário) ────────────────────────────────────────
create table if not exists mkt_sends (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid not null references mkt_campaigns(id) on delete cascade,
  contact_email        text,
  contact_phone        text,
  contact_name         text,
  rendered_body        text not null,
  rendered_subject     text,
  status               text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'bounced', 'unsubscribed')),
  scheduled_for        timestamptz not null default now(),
  claimed_at           timestamptz,
  attempts             int not null default 0,
  last_error           text,
  provider_message_id  text,
  delivered_at         timestamptz,
  opened_at            timestamptz,
  clicked_at           timestamptz,
  created_at           timestamptz not null default now(),
  sent_at              timestamptz
);
-- Trava de idempotência: o mesmo e-mail (sem diferenciar maiúscula) nunca entra
-- 2x na mesma campanha. Coluna gerada = lower(contact_email), para o upsert do
-- PostgREST poder usar on_conflict=campaign_id,email_key (índice de expressão
-- puro não é aceito no on_conflict).
alter table mkt_sends add column if not exists email_key text generated always as (lower(btrim(contact_email))) stored;
create unique index if not exists mkt_sends_campaign_email_key on mkt_sends(campaign_id, email_key);
create index if not exists mkt_sends_status_scheduled_idx on mkt_sends(status, scheduled_for);
create index if not exists mkt_sends_campaign_idx on mkt_sends(campaign_id);
create index if not exists mkt_sends_provider_idx on mkt_sends(provider_message_id);

-- ── descadastros ─────────────────────────────────────────────────────────────
create table if not exists mkt_optouts (
  id          uuid primary key default gen_random_uuid(),
  email       text,
  phone       text,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists mkt_optouts_email_idx on mkt_optouts(lower(email));

-- ── eventos da Resend (webhook) ──────────────────────────────────────────────
create table if not exists mkt_events (
  id                 uuid primary key default gen_random_uuid(),
  send_id            uuid references mkt_sends(id) on delete cascade,
  event_type         text not null,
  -- svix-id: a Resend reenvia o mesmo evento quando não recebe 200
  provider_event_id  text,
  raw_payload        jsonb not null,
  created_at         timestamptz not null default now()
);
create unique index if not exists mkt_events_provider_event_key on mkt_events(provider_event_id);
create index if not exists mkt_events_send_idx on mkt_events(send_id);

-- ── RLS: só service role ─────────────────────────────────────────────────────
alter table mkt_contacts   enable row level security;
alter table mkt_templates  enable row level security;
alter table mkt_segments   enable row level security;
alter table mkt_campaigns  enable row level security;
alter table mkt_sends      enable row level security;
alter table mkt_optouts    enable row level security;
alter table mkt_events     enable row level security;
revoke all on mkt_contacts, mkt_templates, mkt_segments, mkt_campaigns, mkt_sends, mkt_optouts, mkt_events from anon, authenticated;

-- ── reserva atômica de um lote da fila ───────────────────────────────────────
-- FOR UPDATE SKIP LOCKED: dois drains ao mesmo tempo nunca pegam o mesmo envio.
-- Só campanha em 'sending' (pausada não sai). Envio preso em 'sending' há mais de
-- 10 min (drain morreu no meio) volta para a fila; a Resend recebe o id do envio
-- como Idempotency-Key, então reenviar não duplica o e-mail.
create or replace function claim_mkt_sends_batch_by_channel(batch_size int default 40, p_channel text default 'email')
returns setof mkt_sends
language plpgsql
set search_path = public
as $$
begin
  return query
  update mkt_sends
  set status = 'sending', claimed_at = now()
  where id in (
    select s.id from mkt_sends s
    join mkt_campaigns c on c.id = s.campaign_id
    where c.status = 'sending'
      and (p_channel is null or c.channel = p_channel)
      and s.scheduled_for <= now()
      and (s.status = 'pending' or (s.status = 'sending' and s.claimed_at < now() - interval '10 minutes'))
    order by s.scheduled_for, s.id
    limit batch_size
    for update of s skip locked
  )
  returning *;
end;
$$;
revoke all on function claim_mkt_sends_batch_by_channel(int, text) from public, anon, authenticated;

-- ── números por campanha numa chamada só (o PostgREST corta leituras em 1000) ──
create or replace function mkt_stats_campanhas(p_ids uuid[])
returns table (
  campaign_id uuid, total bigint, pendentes bigint, enviados bigint, falhas bigint,
  voltaram bigint, descadastrados bigint, entregues bigint, abertos bigint, clicados bigint
)
language sql
stable
set search_path = public
as $$
  select s.campaign_id,
    count(*),
    count(*) filter (where s.status in ('pending', 'sending')),
    count(*) filter (where s.status in ('sent', 'bounced', 'unsubscribed')),
    count(*) filter (where s.status = 'failed'),
    count(*) filter (where s.status = 'bounced'),
    count(*) filter (where s.status = 'unsubscribed'),
    count(s.delivered_at),
    count(s.opened_at),
    count(s.clicked_at)
  from mkt_sends s
  where s.campaign_id = any(p_ids)
  group by s.campaign_id;
$$;
revoke all on function mkt_stats_campanhas(uuid[]) from public, anon, authenticated;

-- ── pg_cron (helper public.jr_chamar_rota da migration 20261026000003) ───────
-- Drain a cada minuto; sincronização de contatos 1×/dia às 06h de Brasília
-- (09h UTC; a rota retoma pelo cursor em settings se não terminar numa chamada).
-- linhas curtas: colada no SQL Editor, a linha longa foi cortada (26/10/2026)
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('jr-mkt-drain', 'jr-mkt-contatos');
end $$;
select cron.schedule(
  'jr-mkt-drain',
  '* * * * *',
  'select public.jr_chamar_rota(''/api/mkt/drain'')'
);
select cron.schedule(
  'jr-mkt-contatos',
  '0,10,20 9 * * *',
  'select public.jr_chamar_rota(''/api/cron/mkt-contatos'')'
);
