-- Quiz do cliente (07/10/2026): respostas, contato e o cupom único do bônus.
-- Rodar no SQL Editor do Supabase. Só o servidor (service_role) lê e grava:
-- RLS ligado e sem política nenhuma = ninguém de fora acessa (contém contato de cliente).

create table if not exists public.quiz_respostas (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null default 'b0000000-0000-0000-0000-000000000001',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completo        boolean not null default false,
  respostas       jsonb not null default '{}'::jsonb,
  nome            text,
  whatsapp        text,
  email           text,
  cidade          text,
  estado          text,
  faixa_idade     text,
  consentimento   boolean not null default false,
  modelo_brinde   text,
  cupom           text unique,
  cupom_yampi_id  bigint,
  session_id      text,
  visitor_id      text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  utm_term        text
);

create index if not exists quiz_respostas_created_idx  on public.quiz_respostas (created_at desc);
create index if not exists quiz_respostas_whatsapp_idx on public.quiz_respostas (whatsapp);
create index if not exists quiz_respostas_email_idx    on public.quiz_respostas (lower(email));

alter table public.quiz_respostas enable row level security;

-- Fecha também a leitura (sem isso a anon recebe 200 com lista vazia em vez de 401).
revoke all on public.quiz_respostas from anon, authenticated;
