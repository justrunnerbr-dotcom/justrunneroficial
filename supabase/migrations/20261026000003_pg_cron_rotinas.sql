-- Rotinas frequentes pelo pg_cron do Supabase: o plano Hobby da Vercel só agenda
-- cron 1×/dia. O pg_cron chama as rotas da Vercel com o CRON_SECRET, que fica no
-- Vault (NUNCA neste arquivo). Antes de rodar isto, criar o segredo uma vez:
--   select vault.create_secret('<CRON_SECRET da Vercel>', 'jr_cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Cada rota grava aqui quando termina bem; o /admin/alertas avisa se parar.
create table if not exists rotinas_heartbeat (
  rotina     text primary key,
  ultimo_ok  timestamptz not null,
  detalhe    text
);
alter table rotinas_heartbeat enable row level security;
revoke all on rotinas_heartbeat from anon, authenticated;

-- Chama uma rota /api/cron/* do site com o segredo do Vault.
create or replace function public.jr_chamar_rota(caminho text)
returns bigint
language sql
security definer
set search_path = public, extensions
as $$
  select net.http_get(
    url := 'https://justrunner.com.br' || caminho,
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'jr_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
$$;
revoke all on function public.jr_chamar_rota(text) from public, anon, authenticated;

-- Agendamentos (reagendar com o mesmo nome substitui o anterior).
-- linhas curtas: colada no SQL Editor, a linha longa foi cortada (26/10/2026)
select cron.schedule(
  'jr-yampi-sync',
  '*/10 * * * *',
  'select public.jr_chamar_rota(''/api/cron/yampi-sync'')'
);
select cron.schedule(
  'jr-analytics-refresh',
  '*/5 * * * *',
  'select public.jr_chamar_rota(''/api/cron/analytics-refresh'')'
);
