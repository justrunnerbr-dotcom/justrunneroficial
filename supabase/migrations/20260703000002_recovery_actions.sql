-- Recuperador de Vendas — só guarda o que é NOSSO (a Yampi já é fonte de verdade
-- pros dados do carrinho em si, buscados ao vivo via checkout/carts). Essa tabela
-- só registra ações do operador: contatou, ignorou, ou marcou como recuperado manualmente.
-- Rodar manualmente no SQL Editor do Supabase Dashboard (sem CLI configurado neste projeto).

create table if not exists recovery_actions (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null default 'a0000000-0000-0000-0000-000000000001',
  yampi_cart_id text not null,
  status        text not null check (status in ('contacted', 'ignored', 'recovered_manual')),
  contacted_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (store_id, yampi_cart_id)
);

alter table recovery_actions disable row level security;
