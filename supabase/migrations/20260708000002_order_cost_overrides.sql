create table if not exists order_cost_overrides (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null default 'b0000000-0000-0000-0000-000000000001',
  order_id    uuid not null references orders(id) on delete cascade,
  custo_override numeric(10,2) not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, order_id)
);

alter table order_cost_overrides disable row level security;
