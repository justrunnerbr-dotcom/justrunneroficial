-- Port do admin da JHF (07/10/2026). Junta, na ordem, as migrations da JHF que
-- o admin novo usa e que faltavam aqui. Tudo idempotente (IF NOT EXISTS / OR REPLACE).
-- store_id trocado para o da Just Runner (b000...).

-- ═══ 20260723000001_google_ads_conversion_tracking.sql (JHF) ═══
-- Correlaciona o gclid (capturado no clique do anúncio, no navegador) com o
-- pedido que a Yampi devolve no webhook (server-to-server, sem gclid nativo)
-- — a Yampi só reconhece os 5 campos utm_* pra "Origem/Campanha", não um
-- campo gclid cru. O front injeta uma referência curta no utm_content
-- (ver src/lib/google-ads-click.ts) que o webhook resolve de volta aqui
-- (ver src/lib/yampi/sync.ts) pra completar o disparo de conversão
-- server-side do Google Ads, sem depender do navegador do cliente voltar
-- pra página /obrigado.
create table if not exists google_click_ids (
  id uuid primary key default gen_random_uuid(),
  click_ref text unique not null,
  gclid text not null,
  created_at timestamptz not null default now()
);

create index if not exists google_click_ids_ref_idx on google_click_ids (click_ref);

alter table orders add column if not exists gclid text;

-- ═══ 20260802000001_admin_creatives.sql (JHF) ═══
-- ── admin_creatives ─────────────────────────────────────────────────────────
-- Banco de criativos do admin (/admin/criativos): guarda o ângulo, a copy e as
-- métricas de performance de cada criativo testado, pra dar pra comparar o que
-- funciona sem depender de abrir o Gerenciador da Meta.
--
-- A tabela nunca existiu no banco: as rotas /api/admin/creatives sempre
-- responderam erro, e a tela ficava vazia sem explicar o motivo (descoberto
-- pela nova página /admin/saude em 2026-08-02).
--
-- Campos espelham exatamente o formulário em
-- src/app/(admin)/admin/criativos/creative-form.tsx.

CREATE TABLE IF NOT EXISTS admin_creatives (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID        NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001',

  name          TEXT        NOT NULL,
  angle         TEXT,
  headline      TEXT,
  copy          TEXT,
  cta           TEXT,
  status        TEXT        NOT NULL DEFAULT 'active',
  notes         TEXT,

  product_id    UUID        REFERENCES products (id)    ON DELETE SET NULL,
  collection_id UUID        REFERENCES collections (id) ON DELETE SET NULL,

  -- Métricas informadas manualmente a partir do Gerenciador da Meta.
  cpm           NUMERIC,
  ctr           NUMERIC,
  cpc           NUMERIC,
  atc_rate      NUMERIC,
  ic_rate       NUMERIC,
  cpa           NUMERIC,
  roas          NUMERIC,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_creatives_store_created
  ON admin_creatives (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_creatives_status
  ON admin_creatives (store_id, status);

-- Mesmo padrão das demais tabelas do admin: acesso só via service role key.
ALTER TABLE admin_creatives ENABLE ROW LEVEL SECURITY;  -- JR: só service_role (a JHF fechou isso depois, em 20260811)

-- ═══ 20260812000001_analise_suprema_product_stats.sql (JHF) ═══
-- Rollup diário de comportamento por produto, para a Análise Suprema.
--
-- Por que rollup e não agregação sob demanda:
-- `events` tem ~655k linhas (363k só nos últimos 30 dias) e o projeto roda numa
-- instância `nano`. Agregar direto de `events` mediu 22s numa janela de 7 dias e
-- estourou o statement_timeout em 30 dias — inviável pra carregar página.
-- Contra o rollup, a mesma janela responde em ~0,3s.
--
-- Também não dá pra somar no cliente: PostgREST corta em 1000 linhas por
-- resposta, e 30 dias × ~80 produtos passa disso. A soma sairia truncada sem
-- erro nenhum (60 dias chegava a mostrar MENOS views que 30 dias).
-- Por isso a agregação de janela é uma função, não uma query no cliente.

create table if not exists public.product_daily_stats (
  store_id     uuid not null,
  date         date not null,
  product_slug text not null,
  views        integer not null default 0,
  add_to_carts integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (store_id, date, product_slug)
);

create index if not exists idx_pds_store_date
  on public.product_daily_stats (store_id, date desc);

comment on table public.product_daily_stats is
  'Views e add-to-carts por produto por dia. Alimentado por refresh_product_daily_stats.';

-- Recalcula um único dia. Idempotente: apaga e reinsere o dia inteiro.
-- Um dia por chamada é o que mantém cada execução curta o bastante.
create or replace function public.refresh_product_daily_stats(
  p_store_id uuid,
  p_date     date
) returns integer
language plpgsql
security invoker
set search_path = public
set statement_timeout = '120s'
as $fn$
declare n integer;
begin
  delete from public.product_daily_stats
    where store_id = p_store_id and date = p_date;

  insert into public.product_daily_stats (store_id, date, product_slug, views, add_to_carts)
  select p_store_id, p_date, e.product_slug,
         count(*) filter (where e.event_type = 'view_content'),
         count(*) filter (where e.event_type = 'add_to_cart')
  from public.events e
  where e.store_id    = p_store_id
    and e.created_at >= p_date::timestamptz
    and e.created_at <  (p_date + 1)::timestamptz
    and e.product_slug is not null
    and e.event_type in ('view_content', 'add_to_cart')
  group by e.product_slug;

  get diagnostics n = row_count;
  return n;
end $fn$;

-- Soma o rollup numa janela. Devolve ~90 linhas (uma por produto), bem abaixo
-- do teto de 1000 do PostgREST.
create or replace function public.analise_suprema_product_window(
  p_store_id uuid,
  p_start    date,
  p_end      date
) returns table (product_slug text, views bigint, add_to_carts bigint)
language sql
stable
security invoker
set search_path = public
as $fn$
  select s.product_slug,
         sum(s.views)::bigint,
         sum(s.add_to_carts)::bigint
  from public.product_daily_stats s
  where s.store_id = p_store_id
    and s.date >= p_start
    and s.date <  p_end
  group by s.product_slug;
$fn$;

-- ═══ 20260817000001_rls_analise_suprema.sql (JHF) ═══
-- Fecha os objetos criados pela Análise Suprema à Data API.
--
-- Complemento de 20260811_security_rls_hardening.sql. Aquela migration foi
-- gerada a partir da lista de tabelas existentes em 11/08; `product_daily_stats`
-- nasceu em 12/08 e ficou de fora, respondendo 200 para a chave anon — que é
-- pública no JavaScript do site. Verificado, não presumido.
--
-- As duas funções também precisam de REVOKE: `refresh_product_daily_stats`
-- ESCREVE (apaga e reinsere o dia), então executá-la pela anon seria destrutivo.
--
-- Ambas são chamadas apenas por server component e rota de cron, sempre com
-- service_role, que ignora RLS.

BEGIN;

ALTER TABLE public.product_daily_stats ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.product_daily_stats FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.refresh_product_daily_stats(uuid, date) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.analise_suprema_product_window(uuid, date, date) FROM anon, authenticated;

COMMIT;

-- ═══ 20260818000002_orders_session_id.sql (JHF) ═══
-- Liga o pedido à sessão do navegador que o gerou.
--
-- O checkout é externo (Yampi, domínio separado) e o webhook chega
-- server-to-server, sem cookie nenhum. Até aqui a única atribuição possível era
-- a que a Yampi ecoasse de volta nos 5 campos utm_* nativos — e 38% dos pedidos
-- históricos ficaram sem nenhuma. Sem um identificador próprio, esses pedidos
-- caem em "direto/orgânico", o que infla o orgânico e subestima a mídia paga:
-- as decisões de matar campanha saem enviesadas contra o tráfego pago.
--
-- O id viaja embutido no utm_content (marcador `__sid:`, mesma ponte já usada
-- pelo `__gclidref:`) e é separado de volta em `parseCheckoutMarkers`
-- (src/lib/yampi/sync.ts).
--
-- Só vale daqui pra frente: pedido que já entrou sem o identificador não tem
-- como ser reconciliado depois. Por isso a coluna nasce agora, mesmo antes de
-- existir tela que a consuma.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS session_id text;

-- `events.session_id` é a outra ponta do join. Índice nos dois lados.
CREATE INDEX IF NOT EXISTS orders_session_id_idx
  ON public.orders (session_id)
  WHERE session_id IS NOT NULL;

COMMENT ON COLUMN public.orders.session_id IS
  'Id da sessão do navegador (jc_session) no momento do checkout, transportado pelo marcador __sid: no utm_content. Null em pedido anterior a 18/08/2026 ou sem sessão capturada.';

-- ═══ 20260819000001_funnel_sessions_perf.sql (JHF) ═══
-- Corrige o timeout da contagem do funil por sessão.
--
-- Medido em produção em 19/08, logo depois de 20260818000001 subir:
--   1 dia  → responde (1.743 / 163 / 82)
--   3 dias → responde (7.048 / 527 / 238)
--   7 dias → 57014, canceling statement due to statement timeout
--
-- 7 dias é justamente a janela padrão do painel, então a função nunca
-- respondia na prática: o código caía no fallback e o funil voltava a contar
-- por evento. Sem quebrar nada visível — que é o pior tipo de falha.
--
-- Duas causas:
--
-- 1. Três `COUNT(DISTINCT session_id) FILTER (...)` na mesma varredura fazem o
--    Postgres deduplicar três vezes, uma por agregado. Deduplicar uma vez só,
--    numa subconsulta, e depois contar por tipo, resolve com um passe.
--
-- 2. O índice de 20260818000001 não cobria `session_id`, então cada linha
--    candidata ia buscar o valor na heap. Incluindo a coluna no índice, o
--    plano vira index-only scan e o DISTINCT sai quase de graça.

CREATE OR REPLACE FUNCTION public.analise_suprema_funnel_sessions(
  p_store_id  uuid,
  p_inicio    timestamptz,
  p_fim       timestamptz
)
RETURNS TABLE (
  product_views   bigint,
  add_to_carts    bigint,
  checkout_starts bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'view_content')      AS product_views,
    COUNT(*) FILTER (WHERE event_type = 'add_to_cart')       AS add_to_carts,
    COUNT(*) FILTER (WHERE event_type = 'initiate_checkout') AS checkout_starts
  FROM (
    SELECT DISTINCT event_type, session_id
    FROM public.events
    WHERE store_id   = p_store_id
      AND session_id IS NOT NULL
      AND event_type IN ('view_content', 'add_to_cart', 'initiate_checkout')
      AND created_at >= p_inicio
      AND created_at <  p_fim
  ) sessoes;
$$;

-- Substitui o índice de ontem: mesmas colunas na mesma ordem, mais
-- `session_id` no fim. Como é superset do anterior, o antigo vira custo de
-- escrita sem benefício numa tabela que só cresce.
CREATE INDEX IF NOT EXISTS idx_events_store_type_created_session
  ON public.events (store_id, event_type, created_at DESC, session_id);

DROP INDEX IF EXISTS public.idx_events_store_type_created;

-- Função recriada com CREATE OR REPLACE mantém as permissões antigas, mas
-- repetir o REVOKE custa nada e protege contra a função ter sido recriada por
-- outro caminho. A chave anon é pública no JavaScript do site.
REVOKE ALL ON FUNCTION public.analise_suprema_funnel_sessions(uuid, timestamptz, timestamptz) FROM anon, authenticated;

-- ═══ 20260819000002_imposto_sobre_faturamento.sql (JHF) ═══
-- Alíquota de imposto sobre faturamento (Simples Nacional).
--
-- `financial-breakdown.ts` descontava custo de produto, frete, gateway, taxa e
-- mensalidade da Yampi, tributo sobre mídia, Meta e Google — e nenhuma linha de
-- imposto de venda. Num comércio no Simples isso é 4% a 11,3% do faturamento,
-- o maior item que faltava, e o único totalmente previsível: não depende de API
-- nenhuma, só da alíquota da faixa.
--
-- Nasce NULL de propósito, não 0. Zero seria um número inventado que faz o
-- lucro parecer maior do que é — exatamente o erro que o custo de mídia sumindo
-- já causou. Enquanto estiver nulo, o painel marca "Imposto (não configurado)"
-- em `missingCostSources` e o Lucro Líquido aparece explicitamente incompleto.
--
-- Preencher com a alíquota efetiva da faixa atual do Simples, ex.:
--   UPDATE cost_settings SET imposto_pct = 8.5
--    WHERE store_id = 'b0000000-0000-0000-0000-000000000001';

ALTER TABLE public.cost_settings
  ADD COLUMN IF NOT EXISTS imposto_pct numeric(5,2);

-- A JHF não paga imposto sobre faturamento (confirmado pelo Matheus em
-- 19/08/2026). Zero aqui é uma afirmação deliberada, não ausência de dado — é
-- por isso que a coluna aceita NULL: se um dia a situação mudar e ninguém
-- atualizar, o painel volta a marcar "não configurado" em vez de seguir
-- descontando zero em silêncio.
UPDATE public.cost_settings
   SET imposto_pct = 0
 WHERE store_id = 'b0000000-0000-0000-0000-000000000001'
   AND imposto_pct IS NULL;

COMMENT ON COLUMN public.cost_settings.imposto_pct IS
  'Alíquota efetiva de imposto sobre faturamento, em %. NULL = não configurado; o painel trata como lacuna, nunca como zero.';

-- A migration original desta tabela roda `disable row level security`. O REVOKE
-- de 20260811 já fecha o acesso da anon, mas repetir aqui garante que a coluna
-- nova (que expõe a estrutura de custo do negócio) não fique legível se a
-- tabela for recriada por outro caminho.
REVOKE ALL ON public.cost_settings FROM anon, authenticated;

-- ═══ 20260903000001_custo_logistica_por_pedido.sql (JHF) ═══
-- Custo fixo de logística por pedido pago.
--
-- A operação paga um valor fechado por pedido que entrega à logística (manuseio
-- da etiqueta), e até aqui esse custo não existia em lugar nenhum do admin:
-- `financial-breakdown.ts` descontava produto, frete, gateway, taxa e
-- mensalidade da Yampi, tributo sobre mídia, Meta e Google — e nada por pedido.
-- Em agosto/2026 foram 695 pedidos pagos, ou seja ~R$ 6.950 que o Lucro Líquido
-- mostrava a mais.
--
-- A base é PEDIDO PAGO, confirmado pelo dono em 03/09/2026: pedido gerado e não
-- pago não vira etiqueta e não é cobrado (eram 803 pedidos em agosto contra 695
-- pagos — a diferença de 108 daria R$ 1.080 de custo inventado).
--
-- Nasce 0 na coluna de propósito. Zero aqui é ausência de configuração e não
-- muda conta nenhuma; o valor real entra no UPDATE abaixo, só para a JHF. Assim
-- nenhuma outra linha da tabela passa a descontar um custo que não paga.
--
-- ⚠️ `cost_settings` não guarda histórico: o valor vigente vale para TODO o
-- período consultado, inclusive meses fechados. É a mesma limitação que obrigou
-- `YAMPI_PCT_ANTERIOR` a existir em `cost-settings.ts`. Se a cobrança tiver
-- começado numa data específica, o caminho é uma constante igual à da Yampi —
-- não dá para resolver só nesta tabela.

ALTER TABLE public.cost_settings
  ADD COLUMN IF NOT EXISTS custo_logistica_pedido numeric(10,2) NOT NULL DEFAULT 0;

UPDATE public.cost_settings
   SET custo_logistica_pedido = 10.00
 WHERE store_id = 'b0000000-0000-0000-0000-000000000001'
   AND custo_logistica_pedido = 0;

COMMENT ON COLUMN public.cost_settings.custo_logistica_pedido IS
  'Custo fixo cobrado pela logística por pedido PAGO, em R$. 0 = não configurado.';

-- Mesmo motivo do REVOKE em 20260819000002: a migration original da tabela roda
-- `disable row level security`, e esta coluna expõe estrutura de custo.
REVOKE ALL ON public.cost_settings FROM anon, authenticated;

-- ═══ Just Runner: session_id dos pedidos antigos ═══
-- Aqui o id da sessão já vinha sendo gravado em orders.metadata pela página
-- /obrigado (api/attribution/order). Copia pra coluna nova.
UPDATE public.orders
   SET session_id = metadata->>'session_id'
 WHERE session_id IS NULL
   AND metadata->>'session_id' IS NOT NULL;
