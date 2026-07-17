alter table cost_settings add column if not exists appmax_installment_pct numeric(5,2) not null default 1.89;
alter table cost_settings add column if not exists default_installments integer not null default 3;

create table if not exists manual_orders (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null default 'b0000000-0000-0000-0000-000000000001',
  order_number     text not null,
  customer_name    text,
  total            numeric(10,2) not null,
  shipping_amount  numeric(10,2) not null default 0,
  payment_method   text not null default 'credit_card' check (payment_method in ('pix','credit_card','boleto')),
  installments     integer not null default 1,
  notes            text,
  created_at       timestamptz not null default now()
);

create table if not exists manual_order_items (
  id               uuid primary key default gen_random_uuid(),
  manual_order_id  uuid not null references manual_orders(id) on delete cascade,
  product_title    text not null,
  quantity         integer not null default 1,
  unit_cost        numeric(10,2) not null default 0
);

create index if not exists idx_manual_orders_created on manual_orders(store_id, created_at desc);

alter table manual_orders disable row level security;
alter table manual_order_items disable row level security;
