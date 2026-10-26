-- Assistente do direct (porte da JHF, versão sem IA de 10/10/2026): automações por
-- palavra-chave, contatos, fila de envio e a trava atômica do envio.
-- Tabelas iguais às da JHF (20260721000002_ig_automacao.sql).

create table if not exists ig_automations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  active                  boolean not null default true,

  trigger_comment         boolean not null default false,
  trigger_story_reply     boolean not null default false,
  trigger_dm              boolean not null default false,

  keywords                text[] not null default '{}',
  match_type              text not null default 'contains'
    check (match_type in ('contains', 'exact', 'any')),
  specific_media_id       text,

  public_replies          text[] not null default '{}',

  welcome_message         text not null,
  quick_reply_label       text,

  link_message            text,
  link_button_label       text,
  link_url                text,

  reminder_message        text,
  reminder_delay_minutes  int,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists ig_automations_active_idx on ig_automations(active);

create table if not exists ig_followups (
  id              uuid primary key default gen_random_uuid(),
  automation_id   uuid not null references ig_automations(id) on delete cascade,
  step            int not null,
  kind            text not null
    check (kind in ('link', 'reminder')),
  message         text,
  button_label    text,
  button_url      text,
  delay_minutes   int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists ig_followups_automation_idx on ig_followups(automation_id);

create table if not exists ig_contacts (
  id                     uuid primary key default gen_random_uuid(),
  ig_scoped_id           text not null unique,
  username               text,
  first_contact_at       timestamptz not null default now(),
  last_user_response_at  timestamptz,
  last_automation_id     uuid references ig_automations(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists ig_queue (
  id                    uuid primary key default gen_random_uuid(),
  contact_id            uuid not null references ig_contacts(id) on delete cascade,
  automation_id         uuid references ig_automations(id),
  followup_id           uuid references ig_followups(id),

  send_type             text not null
    check (send_type in ('private_reply', 'dm', 'comment_reply')),
  recipient_comment_id  text,
  recipient_ig_id       text,
  payload               jsonb not null,

  status                text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  scheduled_for         timestamptz not null default now(),
  claimed_at            timestamptz,
  attempts              int not null default 0,
  last_error            text,

  requires_24h_window   boolean not null default false,

  created_at            timestamptz not null default now(),
  sent_at               timestamptz
);

create index if not exists ig_queue_status_scheduled_idx on ig_queue(status, scheduled_for);
create index if not exists ig_queue_contact_idx on ig_queue(contact_id);


alter table ig_automations enable row level security;
alter table ig_followups   enable row level security;
alter table ig_contacts    enable row level security;
alter table ig_queue       enable row level security;
revoke all on ig_automations, ig_followups, ig_contacts, ig_queue from anon, authenticated;

-- Pega um lote da fila e marca como "enviando" na mesma operação: o webhook e
-- o pg_cron chamam o envio ao mesmo tempo sem mandar a mesma mensagem 2x.
create or replace function claim_ig_queue_batch(batch_size int default 20)
returns setof ig_queue
language plpgsql
as $$
begin
  return query
  update ig_queue
  set status = 'sending', claimed_at = now()
  where id in (
    select q.id from ig_queue q
    where q.status = 'pending'
      and q.scheduled_for <= now()
    order by q.scheduled_for
    limit batch_size
    for update skip locked
  )
  returning *;
end;
$$;
revoke all on function claim_ig_queue_batch(int) from public, anon, authenticated;

-- Envio da fila todo minuto (mesmo esquema das rotinas de 20261026000003).
select cron.schedule(
  'jr-ig-drain',
  '* * * * *',
  'select public.jr_chamar_rota(''/api/ig/drain'')'
);
