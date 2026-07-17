create table if not exists suppliers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null default 'b0000000-0000-0000-0000-000000000001',
  name       text not null,
  created_at timestamptz not null default now(),
  unique (store_id, name)
);

create table if not exists product_costs (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null default 'b0000000-0000-0000-0000-000000000001',
  supplier_id uuid not null references suppliers(id) on delete cascade,
  model_name  text not null,
  cost        numeric(10,2) not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, supplier_id, model_name)
);

create table if not exists stock_purchases (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null default 'b0000000-0000-0000-0000-000000000001',
  purchased_at date not null default current_date,
  supplier_id  uuid references suppliers(id) on delete set null,
  model_name   text not null,
  quantity     integer not null check (quantity > 0),
  unit_cost    numeric(10,2) not null,
  total_cost   numeric(10,2) generated always as (quantity * unit_cost) stored,
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_product_costs_supplier on product_costs(store_id, supplier_id);
create index if not exists idx_stock_purchases_date on stock_purchases(store_id, purchased_at desc);

alter table suppliers disable row level security;
alter table product_costs disable row level security;
alter table stock_purchases disable row level security;
