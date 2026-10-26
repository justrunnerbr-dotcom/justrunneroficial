-- Stories agendados: publica os aprovados que venceram e puxa as métricas
-- dos que estão no ar (lib/ig/stories.ts). A agenda fica em settings.ig_stories.
select cron.schedule(
  'jr-ig-stories',
  '*/5 * * * *',
  'select public.jr_chamar_rota(''/api/cron/ig-stories'')'
);
