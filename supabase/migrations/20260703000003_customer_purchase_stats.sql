-- Clientes Sumidos — resumo de compras por cliente, agregado de TODOS os pedidos
-- pagos da Yampi (não filtrado por catálogo "site oficial", diferente de `orders`
-- — aqui vale reconquistar qualquer cliente que já comprou da marca).
-- Populado por sync manual (botão), não é ao vivo — 3700+ pedidos no histórico
-- tornam inviável buscar tudo a cada carregamento de página.
-- Rodar manualmente no SQL Editor do Supabase Dashboard (sem CLI configurado neste projeto).

create table if not exists customer_purchase_stats (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null default 'a0000000-0000-0000-0000-000000000001',
  email               text not null,
  name                text,
  phone_whatsapp_link text,
  phone_formatted     text,
  total_spent         numeric(10,2) not null default 0,
  orders_count        integer not null default 0,
  last_order_at       timestamptz,
  synced_at           timestamptz not null default now(),
  unique (store_id, email)
);

create index if not exists idx_customer_purchase_stats_last_order
  on customer_purchase_stats (store_id, last_order_at desc);

alter table customer_purchase_stats disable row level security;
