-- Fornecedor principal por produto/variação, calculado por maior volume no
-- período. Não substitui product_costs (que já resolve "qual é o custo mais
-- barato" produto a produto) — aqui o objetivo é registrar de qual fornecedor
-- cada produto REALMENTE costuma vir, com base no volume comprado, pra apoiar
-- reposição e fechamento mensal por fornecedor.
create table if not exists supplier_mapping (
  id                          uuid primary key default gen_random_uuid(),
  store_id                    uuid not null default 'b0000000-0000-0000-0000-000000000001',
  product_name                text not null,
  variant_name                text,
  supplier_primary_id         uuid references suppliers(id),
  supplier_alternatives       jsonb not null default '[]'::jsonb, -- [{"supplier_id": "...", "quantity": 2}]
  period_volume_by_supplier   jsonb not null default '{}'::jsonb, -- {"<supplier_id>": 12}
  confidence_level            text not null check (confidence_level in ('high', 'medium', 'low')),
  source_period               text not null, -- ex: "2026-07-01..2026-07-21"
  notes                       text,
  needs_review                boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists supplier_mapping_store_id_idx     on supplier_mapping(store_id);
create index if not exists supplier_mapping_needs_review_idx on supplier_mapping(needs_review);
create index if not exists supplier_mapping_product_idx      on supplier_mapping(product_name, variant_name);

alter table supplier_mapping disable row level security;
