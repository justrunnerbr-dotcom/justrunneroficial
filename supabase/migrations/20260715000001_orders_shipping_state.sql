alter table public.orders
  add column if not exists shipping_state text,
  add column if not exists shipping_city  text;

create index if not exists orders_shipping_state_idx on public.orders (shipping_state);
