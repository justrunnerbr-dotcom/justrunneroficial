alter table public.sessions
  add column if not exists utm_content text,
  add column if not exists utm_term    text;

alter table public.orders
  add column if not exists utm_content text,
  add column if not exists utm_term    text;

create index if not exists sessions_utm_term_idx    on public.sessions (utm_term);
create index if not exists sessions_utm_content_idx on public.sessions (utm_content);
create index if not exists orders_utm_term_idx       on public.orders (utm_term);
create index if not exists orders_utm_content_idx    on public.orders (utm_content);
