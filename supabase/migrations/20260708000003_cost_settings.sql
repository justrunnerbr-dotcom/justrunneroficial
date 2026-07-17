create table if not exists cost_settings (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null default 'b0000000-0000-0000-0000-000000000001',
  yampi_fee_pct       numeric(5,2) not null default 2.5,
  appmax_pix_pct      numeric(5,2) not null default 1.00,
  appmax_pix_fixed    numeric(10,2) not null default 0.99,
  appmax_card_pct     numeric(5,2) not null default 4.98,
  appmax_boleto_fixed numeric(10,2) not null default 3.49,
  appmax_gateway_fixed numeric(10,2) not null default 0.99,
  frete_gratis_custo  numeric(10,2) not null default 25.00,
  updated_at          timestamptz not null default now(),
  unique (store_id)
);

insert into cost_settings (store_id) values ('b0000000-0000-0000-0000-000000000001')
  on conflict (store_id) do nothing;

alter table cost_settings disable row level security;
