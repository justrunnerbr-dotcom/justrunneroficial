alter table public.live_visitors
  add column if not exists geo_country text,
  add column if not exists geo_state   text,
  add column if not exists geo_city    text,
  add column if not exists geo_lat     numeric,
  add column if not exists geo_lon     numeric;

alter table public.sessions
  add column if not exists geo_country text,
  add column if not exists geo_state   text,
  add column if not exists geo_city    text;

create index if not exists live_visitors_geo_state_idx on public.live_visitors (geo_state);
create index if not exists sessions_geo_state_idx on public.sessions (geo_state);
