# Just Runner — Catalog Import

Infraestrutura para importar o catálogo real (catalogo.md) para o Supabase.

---

## Formato do catalogo.md

O arquivo `catalogo.md` na raiz do projeto contém quatro seções:

| Seção | Descrição |
|---|---|
| `### CATEGORIAS` | Lista de nomes de categoria |
| `### TABELA` | Tabela Markdown com Produto / Categoria / Slug |
| `### CSV` | Bloco ` ```csv ` com os dados canônicos |
| `### STORAGE` | Árvore de diretórios do bucket no Supabase Storage |
| `### RESUMO` | Totais: categorias, produtos, slugs, duplicatas |

Os scripts leem **exclusivamente o bloco CSV** (` ```csv ` … ` ``` `). Formato:

```
categoria,produto,slug
Eye Jacket,Eye Jacket Preta Lente Preta,eye-jacket-preta-lente-preta
```

Regras de validação aplicadas:
- Header deve ser exatamente `categoria,produto,slug`
- Slug deve conter apenas `[a-z0-9-]`
- Slugs duplicados causam abort imediato
- Campos vazios causam abort imediato

---

## Pré-requisitos

### 1. Variáveis de ambiente

No arquivo `.env.local` (ou export antes de rodar):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Nunca expor no frontend
```

Onde encontrar a `SUPABASE_SERVICE_ROLE_KEY`:
> Supabase dashboard → Project Settings → API → **service_role** (secret)

> ⚠️ A service role key tem acesso irrestrito ao banco. Não versionar. Não expor em logs públicos.

### 2. Schema Supabase

O schema já existente deve conter as tabelas:
- `collections` com colunas: `id`, `slug` (unique), `name`, `description`, `image_url`, `position`
- `products` com colunas: `id`, `slug` (unique), `name`, `description`, `collection_id`, `status`, `featured`
- `variants` com colunas: `id`, `product_id`, `name`, `price`, `compare_price`, `sku`, `stock`, `yampi_product_id`, `position`
- `images` com colunas: `id`, `product_id`, `variant_id`, `url`, `alt`, `position`

**Nenhuma tabela nova é criada.** Os scripts adaptam-se ao schema existente.

---

## Como rodar

### Etapa 1 — Catálogo (collections + products + variants)

**Dry-run (preview sem gravar):**
```bash
npm run catalog:dry-run
```

Saída esperada:
```
══════════════════════════════════════════════════════
[DRY RUN] JHF Catalog Importer
══════════════════════════════════════════════════════

▸ Parsing catalogo.md...
  ✓ 184 rows parsed
  ✓ No duplicate slugs
  ✓ 26 unique categories

▸ Collections to upsert:
   1. Compulsive        → compulsive
   2. Double X          → double-x
  ...

▸ Products to insert (skipping existing slugs): 184
▸ Default variants: 1 per new product

[DRY RUN] No data written.
To run for real: npm run catalog:import
```

**Import real:**
```bash
npm run catalog:import
```

### Etapa 2 — Image records (após o catálogo estar importado)

**Dry-run:**
```bash
npm run images:dry-run
```

**Import real:**
```bash
npm run images:import
```

Cria registros na tabela `images` apontando para os caminhos esperados no Storage. **Não faz upload de arquivos.**

---

## Comportamento de duplicatas

| Script | Comportamento |
|---|---|
| `catalog:import` | Collections: **upsert** (atualiza se slug existir). Products: **skip** (ignora se slug existir). Não deleta dados existentes. |
| `images:import` | Verifica URL existente. **Skip** se URL já existir na tabela. |

---

## Após o import — configurar preços e imagens

### Preços
Cada variante é criada com `price = 0`. Atualizar no Supabase:
```sql
UPDATE variants SET price = 450.00 WHERE price = 0;
-- ou produto a produto via dashboard
```

### Upload de imagens para o Storage

Estrutura esperada no bucket `products`:
```
products/
├── eye-jacket/
│   ├── eye-jacket-preta-lente-preta/
│   │   ├── cover.jpg
│   │   ├── 01.jpg
│   │   ├── 02.jpg
│   │   └── 03.jpg
│   └── ...
└── ...
```

Upload via Supabase CLI:
```bash
supabase storage cp --recursive ./local-images/ ss:///products/
```

Ou via dashboard: Storage → products → Upload.

---

## Validação pós-import

```sql
-- Contar collections
SELECT COUNT(*) FROM collections;   -- esperado: 26

-- Contar products
SELECT COUNT(*) FROM products;      -- esperado: 184

-- Contar variants (1 por produto)
SELECT COUNT(*) FROM variants;      -- esperado: 184

-- Contar images (4 por produto)
SELECT COUNT(*) FROM images;        -- esperado: 736

-- Produtos sem variante (não deve ter)
SELECT p.slug FROM products p
LEFT JOIN variants v ON v.product_id = p.id
WHERE v.id IS NULL;

-- Produtos sem imagem (ok se images:import ainda não rodou)
SELECT p.slug FROM products p
LEFT JOIN images i ON i.product_id = p.id
WHERE i.id IS NULL;
```

---

## Rollback

### Desfazer image records
```sql
-- Remove apenas os registros criados pelo import (price=0 variant, url contém /storage/)
DELETE FROM images
WHERE url LIKE '%/storage/v1/object/public/products/%';
```

### Desfazer products e variants
```sql
-- CUIDADO: remove TODOS os products do catálogo importado
-- Substitua pelo WHERE adequado se tiver produtos manuais
DELETE FROM variants WHERE sku LIKE 'JR-%';
DELETE FROM products WHERE status = 'active' AND featured = false;
```

### Desfazer collections
```sql
-- Remove collections criadas (não remove as existentes com descrição/imagem preenchidas)
DELETE FROM collections WHERE description IS NULL AND image_url IS NULL;
```

> ⚠️ Rollbacks são irreversíveis. Faça backup antes (`pg_dump` ou export via dashboard).

---

## Conversão de categoria → slug

| Categoria | Slug |
|---|---|
| Compulsive | `compulsive` |
| Eye Jacket | `eye-jacket` |
| Flak 2.0 | `flak-20` |
| HSTN | `hstn` |
| Half Jacket | `half-jacket` |
| Romeo 1 | `romeo-1` |
| M Frame | `m-frame` |
| Mag Four | `mag-four` |
| Straight Jacket | `straight-jacket` |
| Acessorios | `acessorios` |

Regra: lowercase → espaços para `-` → remover não-alfanuméricos → deduplicate hyphens.
