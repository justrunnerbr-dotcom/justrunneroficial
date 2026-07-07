# Just Have Fun Store — Design Spec
**Data:** 2026-06-16  
**Status:** Aprovado pelo usuário  
**Domínio:** A definir (variável de ambiente)

---

## Visão Geral

E-commerce completo do zero para substituir a loja Shopify da Just Have Fun (óculos). Inclui loja pública + painel admin interno. A loja deve ser visualmente idêntica ao tema Shopify existente e carregar todas as páginas em menos de 2 segundos.

**Critério de aceite inegociável:** Todas as páginas públicas carregam em < 2s (Time to First Byte + LCP).

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router) |
| Banco de dados | Supabase (PostgreSQL) |
| Storage de imagens | Supabase Storage |
| Hospedagem + CDN | Vercel |
| Checkout | Yampi (redirect) |
| Tracking | Google Tag Manager |
| Ícones | Lucide React (sem emojis na UI) |
| Fontes | Poppins (headings) + Montserrat (body) via next/font |

---

## Design System

Extraído do tema Shopify atual (`settings_data.json`):

| Token | Valor |
|-------|-------|
| Background | `#ffffff` |
| Texto principal | `#212326` |
| Heading | `#1a1b18` |
| Accent / botão primário | `#020202` |
| Texto botão primário | `#ffffff` |
| Borda | `#d2d5d9` |
| Imagem background | `#f3f3f3` |
| Border radius botão | `12px` |
| Page width | `1600px` |
| Font heading | Poppins 500 |
| Font body | Montserrat 400 |

**Regras de contraste:** Texto escuro (`#1a1b18`) sempre sobre fundo claro (`#fff` ou `#f3f3f3`). Texto claro (`#fff`) apenas sobre fundo escuro (`#020202` ou `#1a1b18`). Sem emojis — usar Lucide React para todos os ícones.

---

## Banco de Dados (Supabase PostgreSQL)

### `collections`
```
id          uuid PK
slug        text UNIQUE
name        text
description text
image_url   text
position    int
created_at  timestamptz
```

### `products`
```
id            uuid PK
slug          text UNIQUE
name          text
description   text (gerado pelo Claude)
collection_id uuid FK → collections.id
status        enum('active', 'draft')
created_at    timestamptz
updated_at    timestamptz
```

### `variants`
```
id               uuid PK
product_id       uuid FK → products.id
name             text  (ex: "Prizm Black · Polished Black")
price            numeric(10,2)
compare_price    numeric(10,2) nullable
sku              text UNIQUE
stock            int default 0
yampi_product_id text  (ID do produto correspondente na Yampi)
position         int
```

### `images`
```
id         uuid PK
product_id uuid FK → products.id
variant_id uuid FK → variants.id nullable
url        text  (Supabase Storage URL)
position   int
alt        text
```

### `settings`
```
key   text PK
value text
```
Chaves usadas: `announcement_bar`, `hero_title`, `hero_subtitle`, `hero_cta`, `free_shipping_minimum`, `gtm_id`.

---

## Páginas Públicas

### `/` — Homepage
- Announcement bar (configurável no admin)
- Header sticky com logo, navegação, busca, carrinho
- Hero banner (imagem + título + CTA — configurável no admin)
- Grid de coleções (4 colunas desktop, 2 mobile)
- Seção "Mais Vendidos" (produtos com `featured = true`)
- Garantias / trust badges
- Footer com links e redes sociais
- **Renderização:** ISR, revalida on-demand quando admin salvar configuração

### `/colecao/[slug]` — Coleção
- Header da coleção (nome + imagem)
- Grid de produtos (4 colunas desktop, 2 mobile)
- Filtros laterais (por variação/cor)
- Paginação ou infinite scroll
- **Renderização:** ISR, revalida on-demand quando produto da coleção for editado

### `/produto/[slug]` — Produto
- Header: nome, coleção (breadcrumb)
- Galeria de imagens (principal + thumbnails, troca ao selecionar variante)
- Seletor de variantes (bolinhas de cor)
- Preço da variante selecionada
- Botão "Comprar Agora" → redirect Yampi com `yampi_product_id`
- Botão "Adicionar ao Carrinho" → cart drawer lateral
- Descrição do produto (HTML rico)
- Produtos relacionados (mesma coleção)
- **Renderização:** ISR com `generateStaticParams` para todos os produtos, revalida on-demand

### `/busca` — Pesquisa
- Input com busca full-text no Supabase (PostgreSQL `tsvector`)
- Resultados em grid, filtráveis por coleção
- **Renderização:** Server-side (dinâmico, query por request)

### `/carrinho` — Carrinho
- Cart drawer lateral (abre via ícone no header)
- Lista de itens, quantidades, subtotal
- Botão "Finalizar Compra" → redirect Yampi com todos os itens
- Estado do carrinho: `localStorage` + contexto React (sem banco de dados)

### Páginas Institucionais
- `/sobre` — Sobre a marca
- `/faq` — Perguntas frequentes (acordeão)
- `/contato` — Formulário de contato
- **Renderização:** Estática (gerada no build)

---

## Admin Panel

**Rota:** `/admin` — protegida por `ADMIN_PASSWORD` (variável de ambiente, senha simples via cookie de sessão)

### 1. Produtos
- Tabela paginada: foto · nome · coleção · preço mínimo · status
- Criar / editar produto: nome, slug, coleção, status
- Por produto: gerenciar variantes (nome, preço, compare_price, SKU, yampi_product_id, estoque)
- Upload de imagens por produto/variante (arrastar e soltar → Supabase Storage)
- Campo de descrição com botão **"Gerar com Claude"** → chama API interna → retorna copy gerado

### 2. Importar do Google Drive
- Campo: URL da pasta pública do Google Drive
- Sistema lê a estrutura via Google Drive API (chave de API pública, sem OAuth)
- Preview: lista de modelos encontrados com contagem de variações e imagens
- Confirmação → importa em lote: cria `products` + `variants` + baixa imagens → Supabase Storage
- Progress bar por produto

### 3. Pedidos
- Lista de pedidos via Yampi API (paginada)
- Colunas: número · cliente · valor · status · data
- Filtros: status, período
- Clique → abre detalhe do pedido (dados da Yampi)
- Webhook endpoint `/api/yampi/webhook` para receber atualizações de status em tempo real

### 4. Métricas
- Visitas hoje / 7 dias / 30 dias (via GTM + GA4 Reporting API, opcional)
- Produtos mais visitados
- Receita do período (via Yampi API)
- Taxa de conversão estimada

### 5. Configurações
- Announcement bar (texto)
- Hero: título, subtítulo, CTA, imagem
- Valor mínimo de frete grátis
- GTM ID
- Chave API Claude
- Chave API Yampi + Alias da conta
- Revalidar cache (botão manual)

### 6. Integrações
Hub central com toggle ativo/inativo + API key para cada serviço:

| Categoria | Serviços |
|-----------|---------|
| Checkout | Yampi |
| Frete | Melhor Envio · Frenet · Correios API |
| Marketing | Meta Conversions API · Google Ads · TikTok Pixel · GTM |
| Email | Klaviyo · Mailchimp |
| WhatsApp | Z-API · Twilio |
| ERP/Estoque | Bling · Tiny ERP |
| Reviews | Judge.me · Widget Reclame Aqui |
| IA | Claude API · OpenAI |
| Custom | Endpoint + API key livre |

Cada integração: status visual (verde/vermelho) · campo de chave · botão "Testar Conexão" · link para docs.

---

## Integrações Técnicas

### Yampi (Checkout)
- Botão "Comprar Agora": redirect para `https://[alias].yampi.com.br/checkout/[yampi_product_id]`
- Botão "Finalizar Carrinho": redirect com múltiplos itens via parâmetros de URL Yampi
- Webhook `/api/yampi/webhook`: recebe eventos de pedido (POST assinado com HMAC), atualiza status no painel
- API Yampi: listagem de pedidos no admin, sincronização de estoque (opcional)

### Google Drive (Importação)
- Google Drive API v3 com API Key pública (sem OAuth, pasta compartilhada publicamente)
- Lê subpastas de cada modelo → mapeia variações → baixa imagens via `files.get?alt=media`
- Faz upload das imagens para Supabase Storage com nomes normalizados
- Cria registros no banco com `status = 'draft'` (admin revisa antes de publicar)

### Claude API (Admin)
- Endpoint interno `/api/admin/generate-copy`
- Recebe: nome do produto, coleção, variações disponíveis
- Retorna: título SEO, descrição HTML (3-4 parágrafos), meta description, alt das imagens
- Modelo: `claude-sonnet-4-6` (custo-benefício ideal para geração de copy)

### GTM
- GTM container ID injetado via `<Script>` no `layout.tsx`
- Eventos disparados: `page_view`, `view_item`, `add_to_cart`, `begin_checkout`
- Dados de e-commerce passados via `dataLayer` (estrutura GA4 padrão)

---

## Estratégia de Performance (< 2s)

| Técnica | Impacto |
|---------|---------|
| ISR com `generateStaticParams` | Páginas de produto pré-geradas no CDN — TTFB < 50ms |
| `next/image` com Supabase CDN | Imagens em WebP, tamanhos responsivos, lazy load automático |
| `next/font` | Poppins + Montserrat sem layout shift (CLS = 0) |
| Revalidação on-demand | Admin salva → CDN atualiza só a página afetada |
| `loading="eager"` só no hero | Imagem acima da dobra carrega imediatamente |
| Supabase Edge Functions | Queries de busca próximas ao usuário |
| Cart no localStorage | Zero roundtrip de servidor para o carrinho |

**Meta:** LCP < 1.5s · TTFB < 100ms · CLS < 0.1 · FID < 100ms

---

## Variáveis de Ambiente (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD
ANTHROPIC_API_KEY
YAMPI_API_TOKEN
YAMPI_ALIAS
YAMPI_WEBHOOK_SECRET
GOOGLE_API_KEY
NEXT_PUBLIC_GTM_ID
```

---

## O Que Não Está no Escopo (v1)

- Contas de usuário / login de clientes
- Wishlist
- Sistema de avaliações próprio (usar widget Judge.me)
- Multi-idioma
- Blog
- Programa de afiliados

Podem ser adicionados em versões futuras sem quebrar a arquitetura atual.

---

## Estrutura de Pastas (Next.js)

```
/app
  /(store)
    /page.tsx                    — homepage
    /colecao/[slug]/page.tsx     — coleção
    /produto/[slug]/page.tsx     — produto
    /busca/page.tsx              — busca
    /carrinho/page.tsx           — carrinho
  /admin
    /layout.tsx                  — auth guard
    /page.tsx                    — dashboard
    /produtos/page.tsx
    /importar/page.tsx
    /pedidos/page.tsx
    /metricas/page.tsx
    /configuracoes/page.tsx
    /integracoes/page.tsx
  /api
    /admin/generate-copy/route.ts
    /yampi/webhook/route.ts
    /revalidate/route.ts
/components
  /store    — header, footer, product-card, cart-drawer, etc.
  /admin    — sidebar, data-table, integrations-hub, etc.
  /ui       — button, input, badge, etc. (design system)
/lib
  /supabase.ts
  /yampi.ts
  /drive.ts
  /claude.ts
```
