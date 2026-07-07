-- Clientes Sumidos (view Kanban) — registra quando um cliente sumido foi chamado no
-- WhatsApp, junto com o período (bucket) em que ele estava no momento da chamada.
-- Guardamos o bucket "congelado" no momento do contato (não recalculado depois),
-- pra virar a coluna "{bucket} chamado" no Kanban.
-- Rodar manualmente no SQL Editor do Supabase Dashboard (sem CLI configurado neste projeto).

create table if not exists customer_contact_log (id uuid primary key default gen_random_uuid(), store_id uuid not null default 'a0000000-0000-0000-0000-000000000001', email text not null, bucket text not null, contacted_at timestamptz not null default now(), unique (store_id, email));

alter table customer_contact_log disable row level security;
