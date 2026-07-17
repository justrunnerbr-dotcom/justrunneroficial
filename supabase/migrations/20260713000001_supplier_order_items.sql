-- Portado da JHF (2026-07-17), adaptado pro store_id da Just Runner. O seed
-- de histórico de compras do fornecedor "Zhang" que existe na versão original
-- da JHF NÃO foi copiado aqui de propósito — é dado real de negócio da JHF,
-- não estrutura (ver regra em memory/rule_never_alter_jhf.md).

create table if not exists supplier_order_items (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null default 'b0000000-0000-0000-0000-000000000001',
  supplier_id        uuid not null references suppliers(id) on delete cascade,
  order_date         date not null,
  model_name         text not null,
  quantity_ordered   integer not null check (quantity_ordered > 0),
  quantity_received  integer check (quantity_received >= 0),
  unit_cost          numeric(10,2) not null default 0,
  subtotal           numeric(10,2) generated always as (quantity_ordered * unit_cost) stored,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_supplier_order_items_date on supplier_order_items(store_id, order_date desc);
create index if not exists idx_supplier_order_items_supplier on supplier_order_items(store_id, supplier_id);

alter table supplier_order_items disable row level security;
