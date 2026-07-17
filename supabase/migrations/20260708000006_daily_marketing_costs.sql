create table if not exists daily_marketing_costs (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  platform   text not null,
  amount     numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (date, platform)
);
