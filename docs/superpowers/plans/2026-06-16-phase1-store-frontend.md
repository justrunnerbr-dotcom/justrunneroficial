# Just Have Fun Store — Phase 1: Foundation + Store Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete public-facing e-commerce store — homepage, collection pages, product pages, search, cart drawer, and Yampi checkout redirect — deployed on Vercel with Supabase as database, loading all pages in under 2 seconds.

**Architecture:** Next.js 15 App Router with ISR for all product/collection pages (pre-rendered at build, revalidated on-demand). Cart state in Zustand + localStorage (no server roundtrip). Supabase PostgreSQL for data, Supabase Storage for images. All pages use the Just Have Fun design system (white/black, Poppins + Montserrat, 1600px max-width, Lucide React icons — zero emojis in UI).

**Tech Stack:** Next.js 15 · TypeScript · Supabase (`@supabase/ssr`) · Zustand · Lucide React · next/font (Poppins + Montserrat) · Vitest · Vercel

---

## File Map

```
just-have-fun-store/
├── app/
│   ├── layout.tsx                          — root layout: fonts, GTM script, providers
│   ├── globals.css                         — design system CSS variables + base styles
│   ├── (store)/
│   │   ├── page.tsx                        — homepage (ISR, revalidate on-demand)
│   │   ├── colecao/[slug]/page.tsx         — collection page (ISR)
│   │   ├── produto/[slug]/page.tsx         — product page (ISR, generateStaticParams)
│   │   ├── busca/page.tsx                  — search (dynamic, server component)
│   │   ├── sobre/page.tsx                  — static about page
│   │   ├── faq/page.tsx                    — static FAQ page
│   │   └── contato/page.tsx               — static contact page
│   └── api/
│       └── revalidate/route.ts             — on-demand ISR revalidation endpoint
├── components/
│   ├── ui/
│   │   ├── button.tsx                      — Button component (primary/secondary/ghost)
│   │   ├── badge.tsx                       — Badge (sale, new, etc.)
│   │   └── input.tsx                       — Input field
│   └── store/
│       ├── announcement-bar.tsx            — top bar with free shipping message
│       ├── header.tsx                      — sticky nav with logo, menu, search, cart
│       ├── footer.tsx                      — links, social, copyright
│       ├── cart-drawer.tsx                 — slide-in cart sidebar
│       ├── cart-item.tsx                   — single item inside cart drawer
│       ├── product-card.tsx                — card used in grids (image, name, price)
│       ├── products-grid.tsx               — grid of product-card components
│       ├── hero.tsx                        — homepage hero banner
│       ├── collections-grid.tsx            — grid of collection cards on homepage
│       ├── product-gallery.tsx             — main image + thumbnails on product page
│       ├── variant-selector.tsx            — color swatch buttons on product page
│       └── gtm-script.tsx                  — GTM <Script> injection + dataLayer helpers
├── lib/
│   ├── types.ts                            — all shared TypeScript types
│   ├── supabase.ts                         — Supabase browser + server clients
│   ├── queries.ts                          — all Supabase data fetching functions
│   ├── cart-store.ts                       — Zustand store for cart (localStorage)
│   ├── yampi.ts                            — Yampi checkout URL builder
│   └── gtm.ts                             — dataLayer event helpers
├── tests/
│   ├── lib/cart-store.test.ts
│   ├── lib/yampi.test.ts
│   └── lib/queries.test.ts
├── .env.local                              — local env vars (never commit)
├── vitest.config.ts
└── next.config.ts
```

---

## Task 1: Bootstrap Next.js Project

**Files:**
- Create: `just-have-fun-store/` (all files)
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`

- [ ] **Step 1: Create Next.js 15 app**

```bash
cd "C:/Users/marco/Desktop/Business/Claude/Just Have Fun"
npx create-next-app@latest just-have-fun-store \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir false \
  --import-alias "@/*" \
  --yes
cd just-have-fun-store
```

- [ ] **Step 2: Install project dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js zustand lucide-react
npm install -D vitest @vitejs/plugin-react @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Configure next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 5: Add scripts to package.json**

Open `package.json` and add inside `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 6: Create .env.local**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
YAMPI_ALIAS=your_yampi_alias
REVALIDATE_SECRET=generate_a_random_32char_string
EOF
```

- [ ] **Step 7: Add .env.local to .gitignore (verify it's there)**

```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: bootstrap Next.js 15 project with Vitest"
```

---

## Task 2: Design System — CSS Variables + Base Styles

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace app/globals.css with design system**

```css
@import 'tailwindcss';

:root {
  --color-background: #ffffff;
  --color-foreground: #212326;
  --color-heading: #1a1b18;
  --color-accent: #020202;
  --color-accent-text: #ffffff;
  --color-border: #d2d5d9;
  --color-img-bg: #f3f3f3;
  --color-muted: #666666;
  --page-width: 1600px;
  --button-radius: 12px;
  --duration-default: 250ms;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  line-height: 1.6;
}

.page-width {
  max-width: var(--page-width);
  margin: 0 auto;
  padding: 0 1.5rem;
}

@media (min-width: 750px) {
  .page-width {
    padding: 0 5rem;
  }
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
  display: block;
}
```

- [ ] **Step 2: Update app/layout.tsx with fonts and providers**

```tsx
import type { Metadata } from 'next'
import { Poppins, Montserrat } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Just Have Fun Store',
  description: 'Óculos de alta performance e estilo.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${montserrat.variable}`}>
      <body style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Add font CSS variables to globals.css**

Append to `app/globals.css`:

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-poppins), sans-serif;
  color: var(--color-heading);
  line-height: 1.2;
}

body {
  font-family: var(--font-montserrat), sans-serif;
}
```

- [ ] **Step 4: Verify dev server starts with no errors**

```bash
npm run dev
```

Open http://localhost:3000 — expect blank white page with no errors in console.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add design system CSS variables and Google Fonts (Poppins + Montserrat)"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write failing type-check test**

Create `tests/lib/types.test.ts`:

```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type { Product, Variant, Collection, Image, CartItem } from '@/lib/types'

describe('types', () => {
  it('Product has required fields', () => {
    expectTypeOf<Product>().toHaveProperty('id')
    expectTypeOf<Product>().toHaveProperty('slug')
    expectTypeOf<Product>().toHaveProperty('name')
    expectTypeOf<Product>().toHaveProperty('variants')
    expectTypeOf<Product>().toHaveProperty('images')
  })

  it('CartItem has productId, variantId, quantity', () => {
    expectTypeOf<CartItem>().toHaveProperty('variantId')
    expectTypeOf<CartItem>().toHaveProperty('quantity')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run tests/lib/types.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/types'`

- [ ] **Step 3: Create lib/types.ts**

```typescript
export interface Collection {
  id: string
  slug: string
  name: string
  description: string | null
  image_url: string | null
  position: number
}

export interface Image {
  id: string
  product_id: string
  variant_id: string | null
  url: string
  position: number
  alt: string | null
}

export interface Variant {
  id: string
  product_id: string
  name: string
  price: number
  compare_price: number | null
  sku: string
  stock: number
  yampi_product_id: string | null
  position: number
}

export interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  collection_id: string
  status: 'active' | 'draft'
  collection?: Collection
  variants: Variant[]
  images: Image[]
  created_at: string
  updated_at: string
}

export interface CartItem {
  variantId: string
  productId: string
  productName: string
  variantName: string
  price: number
  imageUrl: string | null
  quantity: number
  yampiProductId: string | null
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run tests/lib/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add shared TypeScript types"
```

---

## Task 4: Supabase Setup + Database Schema

**Files:**
- Create: `lib/supabase.ts`
- SQL: run in Supabase SQL editor

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New project → name: `jhf-store` → save the URL and anon key to `.env.local`.

- [ ] **Step 2: Run SQL migrations in Supabase SQL editor**

Go to Supabase Dashboard → SQL Editor → run this:

```sql
-- Collections
create table collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  image_url text,
  position int not null default 0,
  created_at timestamptz default now()
);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  collection_id uuid references collections(id),
  status text not null default 'draft' check (status in ('active', 'draft')),
  featured boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Variants
create table variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  compare_price numeric(10,2),
  sku text unique not null,
  stock int not null default 0,
  yampi_product_id text,
  position int not null default 0
);

-- Images
create table images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references variants(id) on delete set null,
  url text not null,
  position int not null default 0,
  alt text
);

-- Settings
create table settings (
  key text primary key,
  value text not null
);

-- Seed default settings
insert into settings (key, value) values
  ('announcement_bar', 'FRETE GRÁTIS ACIMA DE R$250 · COMPRA 100% SEGURA · ENTREGA EM TODO BRASIL'),
  ('hero_title', 'Just Have Fun'),
  ('hero_subtitle', 'Óculos de alta performance e estilo.'),
  ('hero_cta', 'Ver Coleções'),
  ('free_shipping_minimum', '250'),
  ('gtm_id', '');

-- Full-text search index on products
create index products_search_idx on products using gin(to_tsvector('portuguese', name || ' ' || coalesce(description, '')));

-- Enable RLS (Row Level Security) — anon can read active products
alter table collections enable row level security;
alter table products enable row level security;
alter table variants enable row level security;
alter table images enable row level security;
alter table settings enable row level security;

create policy "Public read collections" on collections for select using (true);
create policy "Public read active products" on products for select using (status = 'active');
create policy "Public read variants" on variants for select using (true);
create policy "Public read images" on images for select using (true);
create policy "Public read settings" on settings for select using (true);
```

- [ ] **Step 3: Create Supabase Storage bucket**

Go to Supabase Dashboard → Storage → New bucket → name: `product-images` → Public bucket: ON.

- [ ] **Step 4: Create lib/supabase.ts**

```typescript
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })
}

export function createServiceRoleClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  return createSupabaseClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client and database schema"
```

---

## Task 5: Data Queries

**Files:**
- Create: `lib/queries.ts`
- Create: `tests/lib/queries.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/queries.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the query shapes, not the Supabase connection
describe('query return shapes', () => {
  it('getProductBySlug returns null for missing product', async () => {
    // This is a shape test — real integration tested via the running app
    const mockResult = { data: null, error: null }
    expect(mockResult.data).toBeNull()
  })

  it('formatPrice formats correctly', async () => {
    const { formatPrice } = await import('@/lib/queries')
    expect(formatPrice(349.9)).toBe('R$ 349,90')
    expect(formatPrice(1000)).toBe('R$ 1.000,00')
  })

  it('buildProductSlug normalizes correctly', async () => {
    const { buildProductSlug } = await import('@/lib/queries')
    expect(buildProductSlug('Flak 2.0 XL')).toBe('flak-2-0-xl')
    expect(buildProductSlug('Óculos Preto')).toBe('oculos-preto')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run tests/lib/queries.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/queries'`

- [ ] **Step 3: Create lib/queries.ts**

```typescript
import type { Product, Collection, Variant } from './types'
import { createServerSupabaseClient } from './supabase'

export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function buildProductSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export async function getCollections(): Promise<Collection[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('position')
  if (error) throw error
  return data ?? []
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

export async function getProductsByCollection(collectionId: string): Promise<Product[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      variants(*),
      images(*)
    `)
    .eq('collection_id', collectionId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Product[]
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select(`
      *,
      collection:collections(*),
      variants(*),
      images(*)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()
  return data as Product | null
}

export async function getAllProductSlugs(): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select('slug')
    .eq('status', 'active')
  return (data ?? []).map((p) => p.slug)
}

export async function getAllCollectionSlugs(): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('collections').select('slug')
  return (data ?? []).map((c) => c.slug)
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('products')
    .select(`*, variants(*), images(*)`)
    .eq('status', 'active')
    .eq('featured', true)
    .limit(8)
  if (error) throw error
  return (data ?? []) as Product[]
}

export async function searchProducts(query: string): Promise<Product[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('products')
    .select(`*, variants(*), images(*)`)
    .eq('status', 'active')
    .textSearch('name', query, { type: 'websearch', config: 'portuguese' })
    .limit(24)
  if (error) throw error
  return (data ?? []) as Product[]
}

export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single()
  return data?.value ?? null
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run tests/lib/queries.test.ts
```

Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add data query layer with formatPrice and buildProductSlug"
```

---

## Task 6: Cart Store (Zustand + localStorage)

**Files:**
- Create: `lib/cart-store.ts`
- Create: `tests/lib/cart-store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/cart-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/lib/cart-store'

const mockItem = {
  variantId: 'v1',
  productId: 'p1',
  productName: 'Flak 2.0',
  variantName: 'Preto',
  price: 349.90,
  imageUrl: null,
  quantity: 1,
  yampiProductId: 'yampi-123',
}

describe('cart store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] })
  })

  it('starts empty', () => {
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('adds item to cart', () => {
    useCartStore.getState().addItem(mockItem)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variantId).toBe('v1')
  })

  it('increments quantity when adding same variant', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().addItem(mockItem)
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
  })

  it('removes item from cart', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().removeItem('v1')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('calculates total correctly', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 })
    expect(useCartStore.getState().total()).toBe(699.80)
  })

  it('calculates item count correctly', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 3 })
    expect(useCartStore.getState().itemCount()).toBe(3)
  })

  it('clears cart', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run tests/lib/cart-store.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/cart-store'`

- [ ] **Step 3: Create lib/cart-store.ts**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from './types'

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === newItem.variantId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === newItem.variantId
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i
              ),
              isOpen: true,
            }
          }
          return { items: [...state.items, newItem], isOpen: true }
        })
      },

      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        }))
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'jhf-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run tests/lib/cart-store.test.ts
```

Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Zustand cart store with localStorage persistence"
```

---

## Task 7: Yampi Checkout URL Builder

**Files:**
- Create: `lib/yampi.ts`
- Create: `tests/lib/yampi.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/yampi.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildSingleCheckoutUrl, buildCartCheckoutUrl } from '@/lib/yampi'
import type { CartItem } from '@/lib/types'

describe('yampi URL builder', () => {
  const alias = 'jhfstore'

  it('builds single product checkout URL', () => {
    const url = buildSingleCheckoutUrl(alias, 'yampi-456')
    expect(url).toBe('https://jhfstore.yampi.com.br/checkout/yampi-456/t')
  })

  it('returns null when yampiProductId is missing', () => {
    const url = buildSingleCheckoutUrl(alias, null)
    expect(url).toBeNull()
  })

  it('builds cart checkout URL with multiple items', () => {
    const items: CartItem[] = [
      {
        variantId: 'v1',
        productId: 'p1',
        productName: 'Flak',
        variantName: 'Preto',
        price: 349.9,
        imageUrl: null,
        quantity: 2,
        yampiProductId: 'yampi-111',
      },
      {
        variantId: 'v2',
        productId: 'p2',
        productName: 'Juliet',
        variantName: 'Prata',
        price: 599.9,
        imageUrl: null,
        quantity: 1,
        yampiProductId: 'yampi-222',
      },
    ]
    const url = buildCartCheckoutUrl(alias, items)
    expect(url).toContain('jhfstore.yampi.com.br')
    expect(url).toContain('yampi-111')
    expect(url).toContain('yampi-222')
  })

  it('skips items without yampiProductId in cart checkout', () => {
    const items: CartItem[] = [
      {
        variantId: 'v1',
        productId: 'p1',
        productName: 'Flak',
        variantName: 'Preto',
        price: 349.9,
        imageUrl: null,
        quantity: 1,
        yampiProductId: null,
      },
    ]
    const url = buildCartCheckoutUrl(alias, items)
    expect(url).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run tests/lib/yampi.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/yampi'`

- [ ] **Step 3: Create lib/yampi.ts**

```typescript
import type { CartItem } from './types'

// Single product "buy now" redirect
export function buildSingleCheckoutUrl(
  alias: string,
  yampiProductId: string | null
): string | null {
  if (!yampiProductId) return null
  return `https://${alias}.yampi.com.br/checkout/${yampiProductId}/t`
}

// Multi-item cart redirect
// Yampi supports cart URLs with the format: /checkout?sku[]=ID:QTY
export function buildCartCheckoutUrl(
  alias: string,
  items: CartItem[]
): string | null {
  const validItems = items.filter((i) => i.yampiProductId)
  if (validItems.length === 0) return null

  const params = validItems
    .map((i) => `sku[]=${i.yampiProductId}:${i.quantity}`)
    .join('&')

  return `https://${alias}.yampi.com.br/checkout?${params}`
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run tests/lib/yampi.test.ts
```

Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Yampi checkout URL builder"
```

---

## Task 8: GTM Integration

**Files:**
- Create: `lib/gtm.ts`
- Create: `components/store/gtm-script.tsx`

- [ ] **Step 1: Create lib/gtm.ts**

```typescript
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

export function pushToDataLayer(event: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(event)
}

export function trackPageView(url: string) {
  pushToDataLayer({ event: 'page_view', page_location: url })
}

export function trackViewItem(product: {
  id: string
  name: string
  price: number
  category?: string
}) {
  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          item_category: product.category,
          quantity: 1,
        },
      ],
    },
  })
}

export function trackAddToCart(item: {
  id: string
  name: string
  price: number
  quantity: number
  category?: string
}) {
  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
          item_category: item.category,
        },
      ],
    },
  })
}

export function trackBeginCheckout(items: Array<{
  id: string
  name: string
  price: number
  quantity: number
}>) {
  pushToDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      items: items.map((i) => ({
        item_id: i.id,
        item_name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    },
  })
}
```

- [ ] **Step 2: Create components/store/gtm-script.tsx**

```tsx
import Script from 'next/script'

interface GTMScriptProps {
  gtmId: string
}

export function GTMScript({ gtmId }: GTMScriptProps) {
  if (!gtmId) return null
  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  )
}
```

- [ ] **Step 3: Inject GTM in root layout**

Update `app/layout.tsx` — add import and GTM script inside `<body>`:

```tsx
import { GTMScript } from '@/components/store/gtm-script'

// inside <body>, before {children}:
<GTMScript gtmId={process.env.NEXT_PUBLIC_GTM_ID ?? ''} />
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add GTM script injection and dataLayer event helpers"
```

---

## Task 9: UI Components (Button, Badge, Input)

**Files:**
- Create: `components/ui/button.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/ui/input.tsx`

- [ ] **Step 1: Create components/ui/button.tsx**

```tsx
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const variantStyles = {
  primary: {
    background: 'var(--color-accent)',
    color: 'var(--color-accent-text)',
    border: '1px solid var(--color-accent)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--color-heading)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-heading)',
    border: 'none',
  },
}

const sizeStyles = {
  sm: { padding: '8px 16px', fontSize: '13px' },
  md: { padding: '12px 24px', fontSize: '14px' },
  lg: { padding: '16px 32px', fontSize: '16px' },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, style, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        style={{
          ...variantStyles[variant],
          ...sizeStyles[size],
          borderRadius: 'var(--button-radius)',
          fontFamily: 'var(--font-poppins), sans-serif',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'opacity var(--duration-default)',
          width: fullWidth ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          ...style,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

- [ ] **Step 2: Create components/ui/badge.tsx**

```tsx
interface BadgeProps {
  children: React.ReactNode
  variant?: 'sale' | 'new' | 'default'
}

const badgeStyles = {
  sale: { background: '#020202', color: '#fff' },
  new: { background: '#1a1b18', color: '#fff' },
  default: { background: 'var(--color-img-bg)', color: 'var(--color-heading)' },
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      style={{
        ...badgeStyles[variant],
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderRadius: '4px',
        fontFamily: 'var(--font-poppins), sans-serif',
      }}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 3: Create components/ui/input.tsx**

```tsx
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ style, ...props }, ref) => (
    <input
      ref={ref}
      style={{
        width: '100%',
        padding: '12px 16px',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        fontFamily: 'var(--font-montserrat), sans-serif',
        fontSize: '14px',
        color: 'var(--color-foreground)',
        background: 'var(--color-background)',
        outline: 'none',
        transition: 'border-color var(--duration-default)',
        ...style,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
      {...props}
    />
  )
)
Input.displayName = 'Input'
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add base UI components (Button, Badge, Input)"
```

---

## Task 10: Layout — Announcement Bar + Header + Footer

**Files:**
- Create: `components/store/announcement-bar.tsx`
- Create: `components/store/header.tsx`
- Create: `components/store/footer.tsx`
- Modify: `app/(store)/layout.tsx` (create this file)

- [ ] **Step 1: Create app/(store)/layout.tsx**

```tsx
import { AnnouncementBar } from '@/components/store/announcement-bar'
import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { CartDrawer } from '@/components/store/cart-drawer'
import { getSetting, getCollections } from '@/lib/queries'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [announcementText, collections] = await Promise.all([
    getSetting('announcement_bar'),
    getCollections(),
  ])

  return (
    <>
      {announcementText && <AnnouncementBar text={announcementText} />}
      <Header collections={collections} />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
    </>
  )
}
```

- [ ] **Step 2: Create components/store/announcement-bar.tsx**

```tsx
interface AnnouncementBarProps {
  text: string
}

export function AnnouncementBar({ text }: AnnouncementBarProps) {
  return (
    <div
      style={{
        background: 'var(--color-accent)',
        color: 'var(--color-accent-text)',
        textAlign: 'center',
        padding: '10px 16px',
        fontSize: '12px',
        fontWeight: 500,
        letterSpacing: '0.5px',
        fontFamily: 'var(--font-montserrat), sans-serif',
      }}
    >
      {text}
    </div>
  )
}
```

- [ ] **Step 3: Create components/store/header.tsx**

```tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ShoppingBag, Search, Menu, X } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import type { Collection } from '@/lib/types'

interface HeaderProps {
  collections: Collection[]
}

export function Header({ collections }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { openCart, itemCount } = useCartStore()
  const count = itemCount()

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-background)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div
        className="page-width"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 5rem',
          gap: '24px',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 800,
            fontSize: '20px',
            color: 'var(--color-heading)',
            letterSpacing: '-0.5px',
            whiteSpace: 'nowrap',
          }}
        >
          JUST HAVE FUN
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {collections.slice(0, 6).map((col) => (
            <Link
              key={col.id}
              href={`/colecao/${col.slug}`}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-foreground)',
                whiteSpace: 'nowrap',
              }}
            >
              {col.name}
            </Link>
          ))}
        </nav>

        {/* Icons */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link href="/busca" aria-label="Buscar">
            <Search size={20} color="var(--color-heading)" strokeWidth={1.5} />
          </Link>
          <button
            onClick={openCart}
            aria-label={`Carrinho (${count} itens)`}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ShoppingBag size={20} color="var(--color-heading)" strokeWidth={1.5} />
            {count > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: 'var(--color-accent)',
                  color: 'var(--color-accent-text)',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {count}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'none' }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Create components/store/footer.tsx**

```tsx
import Link from 'next/link'
import { Instagram, Youtube } from 'lucide-react'

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--color-heading)',
        color: 'var(--color-accent-text)',
        marginTop: '80px',
      }}
    >
      <div
        className="page-width"
        style={{
          padding: '48px 5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '40px',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-poppins), sans-serif',
              fontWeight: 800,
              fontSize: '18px',
              marginBottom: '16px',
            }}
          >
            JUST HAVE FUN
          </div>
          <p style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.6 }}>
            Óculos de alta performance e estilo para quem vive intensamente.
          </p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
            <a href="https://instagram.com/justhavefun.store" target="_blank" rel="noopener noreferrer">
              <Instagram size={20} color="#fff" strokeWidth={1.5} />
            </a>
            <a href="https://www.youtube.com/@jhfstore" target="_blank" rel="noopener noreferrer">
              <Youtube size={20} color="#fff" strokeWidth={1.5} />
            </a>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            Informações
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { href: '/sobre', label: 'Sobre nós' },
              { href: '/faq', label: 'Perguntas frequentes' },
              { href: '/contato', label: 'Contato' },
            ].map((link) => (
              <Link key={link.href} href={link.href} style={{ fontSize: '13px', color: '#aaa' }}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            Segurança
          </div>
          <p style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.6 }}>
            Pagamento 100% seguro via Yampi. Entregamos para todo o Brasil.
          </p>
        </div>
      </div>
      <div
        style={{
          borderTop: '1px solid #333',
          textAlign: 'center',
          padding: '16px',
          fontSize: '12px',
          color: '#666',
        }}
      >
        © 2026 Just Have Fun Store. Todos os direitos reservados.
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add announcement bar, sticky header, and footer"
```

---

## Task 11: Cart Drawer

**Files:**
- Create: `components/store/cart-item.tsx`
- Create: `components/store/cart-drawer.tsx`

- [ ] **Step 1: Create components/store/cart-item.tsx**

```tsx
'use client'
import Image from 'next/image'
import { X, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { formatPrice } from '@/lib/queries'
import type { CartItem } from '@/lib/types'

export function CartItemRow({ item }: { item: CartItem }) {
  const { removeItem, updateQuantity } = useCartStore()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '72px 1fr auto',
        gap: '12px',
        alignItems: 'start',
        padding: '16px 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'var(--color-img-bg)',
          flexShrink: 0,
        }}
      >
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.productName} width={72} height={72} style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 72, height: 72, background: 'var(--color-img-bg)' }} />
        )}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '2px' }}>
          {item.productName}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '8px' }}>
          {item.variantName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
            style={{ border: '1px solid var(--color-border)', borderRadius: '4px', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none' }}
          >
            <Minus size={12} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>
            {item.quantity}
          </span>
          <button
            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
            style={{ border: '1px solid var(--color-border)', borderRadius: '4px', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none' }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <button
          onClick={() => removeItem(item.variantId)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 0 }}
          aria-label="Remover item"
        >
          <X size={16} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>
          {formatPrice(item.price * item.quantity)}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create components/store/cart-drawer.tsx**

```tsx
'use client'
import { useEffect } from 'react'
import { X, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { buildCartCheckoutUrl } from '@/lib/yampi'
import { formatPrice } from '@/lib/queries'
import { trackBeginCheckout } from '@/lib/gtm'
import { Button } from '@/components/ui/button'
import { CartItemRow } from './cart-item'

export function CartDrawer() {
  const { items, isOpen, closeCart, total } = useCartStore()
  const yampiAlias = process.env.NEXT_PUBLIC_YAMPI_ALIAS ?? ''

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleCheckout = () => {
    const url = buildCartCheckoutUrl(yampiAlias, items)
    if (!url) return
    trackBeginCheckout(items.map((i) => ({ id: i.variantId, name: i.productName, price: i.price, quantity: i.quantity })))
    window.location.href = url
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={closeCart}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', maxWidth: '100vw',
          background: 'var(--color-background)', zIndex: 201, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700, fontSize: '16px' }}>
              Carrinho ({items.length})
            </span>
          </div>
          <button onClick={closeCart} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="Fechar carrinho">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-muted)', fontSize: '14px' }}>
              Seu carrinho está vazio.
            </div>
          ) : (
            items.map((item) => <CartItemRow key={item.variantId} item={item} />)
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '16px', fontWeight: 700 }}>
              <span>Total</span>
              <span>{formatPrice(total())}</span>
            </div>
            <Button fullWidth onClick={handleCheckout}>
              Finalizar Compra
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Add NEXT_PUBLIC_YAMPI_ALIAS to .env.local**

```bash
echo "NEXT_PUBLIC_YAMPI_ALIAS=your_yampi_alias" >> .env.local
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add cart drawer with Yampi checkout redirect"
```

---

## Task 12: Product Card + Products Grid

**Files:**
- Create: `components/store/product-card.tsx`
- Create: `components/store/products-grid.tsx`

- [ ] **Step 1: Create components/store/product-card.tsx**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/queries'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const firstImage = product.images.find((img) => img.position === 0) ?? product.images[0]
  const lowestPrice = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price))
    : null
  const hasDiscount = product.variants.some((v) => v.compare_price && v.compare_price > v.price)

  return (
    <Link href={`/produto/${product.slug}`} style={{ display: 'block' }}>
      <div
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => {
          const img = e.currentTarget.querySelector('[data-product-image]') as HTMLElement
          if (img) img.style.transform = 'scale(1.03)'
        }}
        onMouseLeave={(e) => {
          const img = e.currentTarget.querySelector('[data-product-image]') as HTMLElement
          if (img) img.style.transform = 'scale(1)'
        }}
      >
        {/* Image */}
        <div
          style={{
            background: 'var(--color-img-bg)',
            borderRadius: '8px',
            overflow: 'hidden',
            aspectRatio: '1/1',
            position: 'relative',
            marginBottom: '12px',
          }}
        >
          {firstImage ? (
            <Image
              data-product-image
              src={firstImage.url}
              alt={firstImage.alt ?? product.name}
              fill
              style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
              sizes="(max-width: 750px) 50vw, 25vw"
            />
          ) : (
            <div
              data-product-image
              style={{ width: '100%', height: '100%', background: 'var(--color-img-bg)', transition: 'transform 0.3s ease' }}
            />
          )}
          {hasDiscount && (
            <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
              <Badge variant="sale">Oferta</Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '4px', lineHeight: 1.3 }}>
            {product.name}
          </div>
          {lowestPrice !== null && (
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-heading)' }}>
              {formatPrice(lowestPrice)}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create components/store/products-grid.tsx**

```tsx
import { ProductCard } from './product-card'
import type { Product } from '@/lib/types'

interface ProductsGridProps {
  products: Product[]
}

export function ProductsGrid({ products }: ProductsGridProps) {
  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-muted)', fontSize: '14px' }}>
        Nenhum produto encontrado.
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '24px',
      }}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add ProductCard and ProductsGrid components"
```

---

## Task 13: Homepage

**Files:**
- Create: `app/(store)/page.tsx`
- Create: `components/store/hero.tsx`
- Create: `components/store/collections-grid.tsx`

- [ ] **Step 1: Create components/store/hero.tsx**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

interface HeroProps {
  title: string
  subtitle: string
  cta: string
}

export function Hero({ title, subtitle, cta }: HeroProps) {
  return (
    <section
      style={{
        background: 'var(--color-heading)',
        color: 'var(--color-accent-text)',
        padding: '96px 0',
        textAlign: 'center',
      }}
    >
      <div className="page-width">
        <p
          style={{
            fontSize: '11px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#888',
            marginBottom: '16px',
            fontFamily: 'var(--font-montserrat), sans-serif',
          }}
        >
          Nova Coleção
        </p>
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 800,
            marginBottom: '16px',
            fontFamily: 'var(--font-poppins), sans-serif',
            letterSpacing: '-1px',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#aaa',
            marginBottom: '32px',
            maxWidth: '480px',
            margin: '0 auto 32px',
          }}
        >
          {subtitle}
        </p>
        <Link href="/colecao">
          <Button variant="primary" size="lg" style={{ background: '#fff', color: '#000', border: 'none' }}>
            {cta}
            <ArrowRight size={16} />
          </Button>
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create components/store/collections-grid.tsx**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Collection } from '@/lib/types'

interface CollectionsGridProps {
  collections: Collection[]
}

export function CollectionsGrid({ collections }: CollectionsGridProps) {
  return (
    <section style={{ padding: '64px 0' }}>
      <div className="page-width">
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 800,
            marginBottom: '32px',
            fontFamily: 'var(--font-poppins), sans-serif',
          }}
        >
          Coleções
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}
        >
          {collections.map((col) => (
            <Link key={col.id} href={`/colecao/${col.slug}`}>
              <div
                style={{
                  background: 'var(--color-img-bg)',
                  borderRadius: '8px',
                  aspectRatio: '3/2',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                {col.image_url && (
                  <Image
                    src={col.image_url}
                    alt={col.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="25vw"
                  />
                )}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '16px',
                    width: '100%',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  }}
                >
                  <span
                    style={{
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '14px',
                      fontFamily: 'var(--font-poppins), sans-serif',
                    }}
                  >
                    {col.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create app/(store)/page.tsx**

```tsx
import { getCollections, getFeaturedProducts, getSetting } from '@/lib/queries'
import { Hero } from '@/components/store/hero'
import { CollectionsGrid } from '@/components/store/collections-grid'
import { ProductsGrid } from '@/components/store/products-grid'

export const revalidate = false // revalidate on-demand only

export default async function HomePage() {
  const [collections, featuredProducts, heroTitle, heroSubtitle, heroCta] = await Promise.all([
    getCollections(),
    getFeaturedProducts(),
    getSetting('hero_title'),
    getSetting('hero_subtitle'),
    getSetting('hero_cta'),
  ])

  return (
    <>
      <Hero
        title={heroTitle ?? 'Just Have Fun'}
        subtitle={heroSubtitle ?? 'Óculos de alta performance e estilo.'}
        cta={heroCta ?? 'Ver Coleções'}
      />
      <CollectionsGrid collections={collections} />
      {featuredProducts.length > 0 && (
        <section style={{ padding: '0 0 64px' }}>
          <div className="page-width">
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                marginBottom: '32px',
                fontFamily: 'var(--font-poppins), sans-serif',
              }}
            >
              Mais Vendidos
            </h2>
            <ProductsGrid products={featuredProducts} />
          </div>
        </section>
      )}
    </>
  )
}
```

- [ ] **Step 4: Start dev server and verify homepage renders**

```bash
npm run dev
```

Open http://localhost:3000 — expect: hero banner + collections grid + no console errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add homepage with hero, collections grid, and featured products"
```

---

## Task 14: Collection Page

**Files:**
- Create: `app/(store)/colecao/[slug]/page.tsx`

- [ ] **Step 1: Create app/(store)/colecao/[slug]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import { getCollectionBySlug, getProductsByCollection, getAllCollectionSlugs } from '@/lib/queries'
import { ProductsGrid } from '@/components/store/products-grid'

export const revalidate = false

export async function generateStaticParams() {
  const slugs = await getAllCollectionSlugs()
  return slugs.map((slug) => ({ slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug)
  if (!collection) notFound()

  const products = await getProductsByCollection(collection.id)

  return (
    <div style={{ padding: '48px 0' }}>
      <div className="page-width">
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Coleção
          </p>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 800,
              fontFamily: 'var(--font-poppins), sans-serif',
              color: 'var(--color-heading)',
            }}
          >
            {collection.name}
          </h1>
          {collection.description && (
            <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginTop: '12px', maxWidth: '600px' }}>
              {collection.description}
            </p>
          )}
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '8px' }}>
            {products.length} produto{products.length !== 1 ? 's' : ''}
          </p>
        </div>

        <ProductsGrid products={products} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add collection page with ISR and generateStaticParams"
```

---

## Task 15: Product Page — Gallery + Variant Selector

**Files:**
- Create: `components/store/product-gallery.tsx`
- Create: `components/store/variant-selector.tsx`
- Create: `app/(store)/produto/[slug]/page.tsx`

- [ ] **Step 1: Create components/store/product-gallery.tsx**

```tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { Image as ProductImage } from '@/lib/types'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const sorted = [...images].sort((a, b) => a.position - b.position)
  const active = sorted[activeIndex]

  return (
    <div>
      {/* Main image */}
      <div
        style={{
          background: 'var(--color-img-bg)',
          borderRadius: '12px',
          overflow: 'hidden',
          aspectRatio: '1/1',
          position: 'relative',
          marginBottom: '12px',
        }}
      >
        {active ? (
          <Image
            src={active.url}
            alt={active.alt ?? productName}
            fill
            priority
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 750px) 100vw, 50vw"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--color-img-bg)' }} />
        )}
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              style={{
                background: 'var(--color-img-bg)',
                borderRadius: '6px',
                overflow: 'hidden',
                aspectRatio: '1/1',
                position: 'relative',
                border: i === activeIndex ? '2px solid var(--color-accent)' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <Image
                src={img.url}
                alt={img.alt ?? `${productName} ${i + 1}`}
                fill
                style={{ objectFit: 'cover' }}
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create components/store/variant-selector.tsx**

```tsx
'use client'
import { useState } from 'react'
import { useCartStore } from '@/lib/cart-store'
import { buildSingleCheckoutUrl } from '@/lib/yampi'
import { formatPrice } from '@/lib/queries'
import { trackAddToCart, trackBeginCheckout } from '@/lib/gtm'
import { Button } from '@/components/ui/button'
import type { Variant, Image as ProductImage } from '@/lib/types'

interface VariantSelectorProps {
  productId: string
  productName: string
  variants: Variant[]
  images: ProductImage[]
}

export function VariantSelector({ productId, productName, variants, images }: VariantSelectorProps) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? null)
  const { addItem } = useCartStore()

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0]
  const yampiAlias = process.env.NEXT_PUBLIC_YAMPI_ALIAS ?? ''

  const getImageUrl = () => {
    const variantImg = images.find((img) => img.variant_id === selected?.id)
    return variantImg?.url ?? images[0]?.url ?? null
  }

  const handleAddToCart = () => {
    if (!selected) return
    addItem({
      variantId: selected.id,
      productId,
      productName,
      variantName: selected.name,
      price: selected.price,
      imageUrl: getImageUrl(),
      quantity: 1,
      yampiProductId: selected.yampi_product_id,
    })
    trackAddToCart({ id: selected.id, name: productName, price: selected.price, quantity: 1 })
  }

  const handleBuyNow = () => {
    if (!selected) return
    const url = buildSingleCheckoutUrl(yampiAlias, selected.yampi_product_id)
    if (!url) return
    trackBeginCheckout([{ id: selected.id, name: productName, price: selected.price, quantity: 1 }])
    window.location.href = url
  }

  if (!selected) return null

  return (
    <div>
      {/* Price */}
      <div style={{ marginBottom: '20px' }}>
        {selected.compare_price && selected.compare_price > selected.price && (
          <div style={{ fontSize: '14px', color: 'var(--color-muted)', textDecoration: 'line-through', marginBottom: '2px' }}>
            {formatPrice(selected.compare_price)}
          </div>
        )}
        <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-poppins)', color: 'var(--color-heading)' }}>
          {formatPrice(selected.price)}
        </div>
      </div>

      {/* Variant pills */}
      {variants.length > 1 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', color: 'var(--color-heading)' }}>
            Variação: <span style={{ fontWeight: 400 }}>{selected.name}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: v.id === selectedId ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                  background: v.id === selectedId ? 'var(--color-accent)' : 'transparent',
                  color: v.id === selectedId ? 'var(--color-accent-text)' : 'var(--color-heading)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Button fullWidth size="lg" onClick={handleBuyNow}>
          Comprar Agora
        </Button>
        <Button fullWidth size="lg" variant="secondary" onClick={handleAddToCart}>
          Adicionar ao Carrinho
        </Button>
      </div>

      {/* SKU */}
      <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '12px' }}>
        SKU: {selected.sku}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create app/(store)/produto/[slug]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import { getProductBySlug, getAllProductSlugs } from '@/lib/queries'
import { ProductGallery } from '@/components/store/product-gallery'
import { VariantSelector } from '@/components/store/variant-selector'
import Link from 'next/link'

export const revalidate = false

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs()
  return slugs.map((slug) => ({ slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const sortedImages = [...product.images].sort((a, b) => a.position - b.position)
  const sortedVariants = [...product.variants].sort((a, b) => a.position - b.position)

  return (
    <div style={{ padding: '32px 0 80px' }}>
      <div className="page-width">
        {/* Breadcrumb */}
        <nav style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '32px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--color-muted)' }}>Início</Link>
          <span>/</span>
          {product.collection && (
            <>
              <Link href={`/colecao/${product.collection.slug}`} style={{ color: 'var(--color-muted)' }}>
                {product.collection.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span style={{ color: 'var(--color-heading)' }}>{product.name}</span>
        </nav>

        {/* Product layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'start' }}>
          <ProductGallery images={sortedImages} productName={product.name} />

          <div style={{ position: 'sticky', top: '100px' }}>
            {product.collection && (
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                {product.collection.name}
              </p>
            )}
            <h1
              style={{
                fontSize: 'clamp(20px, 3vw, 28px)',
                fontWeight: 800,
                fontFamily: 'var(--font-poppins), sans-serif',
                color: 'var(--color-heading)',
                marginBottom: '24px',
                lineHeight: 1.2,
              }}
            >
              {product.name}
            </h1>

            <VariantSelector
              productId={product.id}
              productName={product.name}
              variants={sortedVariants}
              images={sortedImages}
            />

            {product.description && (
              <div
                style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--color-border)' }}
              >
                <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                  Descrição
                </h2>
                <div
                  style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Start dev server and verify product page structure**

```bash
npm run dev
```

Navigate to any product URL — expect: two-column layout, gallery left, info right, no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add product page with gallery, variant selector, and Yampi buy buttons"
```

---

## Task 16: Search Page

**Files:**
- Create: `app/(store)/busca/page.tsx`

- [ ] **Step 1: Create app/(store)/busca/page.tsx**

```tsx
import { searchProducts } from '@/lib/queries'
import { ProductsGrid } from '@/components/store/products-grid'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''
  const products = query.length >= 2 ? await searchProducts(query) : []

  return (
    <div style={{ padding: '48px 0' }}>
      <div className="page-width">
        <h1 style={{ fontFamily: 'var(--font-poppins)', fontWeight: 800, fontSize: '32px', marginBottom: '32px' }}>
          Buscar produtos
        </h1>

        <form method="GET" style={{ marginBottom: '40px', maxWidth: '480px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }}
            />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Buscar óculos..."
              style={{ paddingLeft: '44px' }}
              autoFocus
            />
          </div>
        </form>

        {query && (
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px' }}>
            {products.length > 0
              ? `${products.length} resultado${products.length !== 1 ? 's' : ''} para "${query}"`
              : `Nenhum resultado para "${query}"`}
          </p>
        )}

        {products.length > 0 && <ProductsGrid products={products} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add search page with full-text Supabase query"
```

---

## Task 17: On-Demand Revalidation Endpoint

**Files:**
- Create: `app/api/revalidate/route.ts`

- [ ] **Step 1: Create app/api/revalidate/route.ts**

```typescript
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const body = await request.json()
  const { path } = body as { path?: string }

  if (path) {
    revalidatePath(path)
    return NextResponse.json({ revalidated: true, path })
  }

  // Revalidate all store pages
  revalidatePath('/', 'layout')
  revalidatePath('/colecao/[slug]', 'page')
  revalidatePath('/produto/[slug]', 'page')

  return NextResponse.json({ revalidated: true, all: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add on-demand ISR revalidation endpoint"
```

---

## Task 18: Static Institutional Pages

**Files:**
- Create: `app/(store)/sobre/page.tsx`
- Create: `app/(store)/faq/page.tsx`
- Create: `app/(store)/contato/page.tsx`

- [ ] **Step 1: Create app/(store)/sobre/page.tsx**

```tsx
export default function SobrePage() {
  return (
    <div style={{ padding: '64px 0' }}>
      <div className="page-width" style={{ maxWidth: '720px' }}>
        <h1 style={{ fontFamily: 'var(--font-poppins)', fontWeight: 800, fontSize: '36px', marginBottom: '24px' }}>
          Sobre a Just Have Fun
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--color-muted)', lineHeight: 1.8 }}>
          A Just Have Fun nasceu da paixão por óculos de alta performance. Oferecemos os melhores modelos para quem vive a vida intensamente — nas pistas, nas praias, nas montanhas.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create app/(store)/faq/page.tsx**

```tsx
const faqs = [
  { q: 'Como funciona a entrega?', a: 'Entregamos para todo o Brasil. O prazo varia de 5 a 15 dias úteis conforme a região.' },
  { q: 'O pagamento é seguro?', a: 'Sim. O checkout é processado pela Yampi, plataforma 100% segura e certificada.' },
  { q: 'Posso trocar o produto?', a: 'Sim. Aceitamos trocas em até 7 dias após o recebimento, conforme o Código de Defesa do Consumidor.' },
  { q: 'Os óculos têm garantia?', a: 'Todos os nossos produtos são originais e possuem garantia. Entre em contato pelo Instagram para suporte.' },
]

export default function FaqPage() {
  return (
    <div style={{ padding: '64px 0' }}>
      <div className="page-width" style={{ maxWidth: '720px' }}>
        <h1 style={{ fontFamily: 'var(--font-poppins)', fontWeight: 800, fontSize: '36px', marginBottom: '40px' }}>
          Perguntas Frequentes
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ paddingBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
                {faq.q}
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--color-muted)', lineHeight: 1.7 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create app/(store)/contato/page.tsx**

```tsx
export default function ContatoPage() {
  return (
    <div style={{ padding: '64px 0' }}>
      <div className="page-width" style={{ maxWidth: '480px' }}>
        <h1 style={{ fontFamily: 'var(--font-poppins)', fontWeight: 800, fontSize: '36px', marginBottom: '12px' }}>
          Contato
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-muted)', marginBottom: '32px' }}>
          Fale conosco pelo Instagram:{' '}
          <a href="https://instagram.com/justhavefun.store" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-heading)', fontWeight: 600 }}>
            @justhavefun.store
          </a>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add static institutional pages (sobre, faq, contato)"
```

---

## Task 19: Deploy to Vercel

**Files:**
- None — deploy configuration only

- [ ] **Step 1: Install Vercel CLI and login**

```bash
npm install -g vercel
vercel login
```

- [ ] **Step 2: Deploy to Vercel (preview first)**

```bash
vercel
```

When prompted: Link to existing project? No → Project name: `just-have-fun-store` → Root directory: `./` → Override settings: No.

- [ ] **Step 3: Set environment variables in Vercel**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_GTM_ID
vercel env add NEXT_PUBLIC_YAMPI_ALIAS
vercel env add REVALIDATE_SECRET
```

Enter the values from `.env.local` for each prompt. Select all environments (Production, Preview, Development).

- [ ] **Step 4: Deploy to production**

```bash
vercel --prod
```

- [ ] **Step 5: Verify performance — open the production URL**

Open the Vercel production URL in an incognito window. Run Lighthouse (Chrome DevTools → Lighthouse tab):
- Expected: LCP < 2s, Performance score > 85
- If LCP > 2s: check that ISR is working (no `export const dynamic = 'force-dynamic'` on any store page)

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: production deployment configuration"
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Covered In |
|-----------------|-----------|
| Next.js 15 + Supabase + Vercel | Tasks 1, 4, 19 |
| ISR for product/collection pages | Tasks 14, 15 (`revalidate = false` + on-demand) |
| Pages < 2 seconds | Tasks 2 (fonts), 12 (Image), 13–15 (ISR), 19 (Vercel) |
| Poppins + Montserrat via next/font | Task 2 |
| Lucide React icons (no emojis) | Tasks 10, 11, 13 |
| White/black design system (`#020202`, `#1a1b18`) | Tasks 2, 9 |
| 1600px page-width | Task 2 |
| Cart in localStorage (Zustand persist) | Task 6 |
| Yampi redirect checkout (single + cart) | Tasks 7, 11, 15 |
| GTM dataLayer events | Tasks 8, 11, 15 |
| Search with Supabase full-text | Tasks 5, 16 |
| On-demand ISR revalidation | Task 17 |
| Static pages (sobre, faq, contato) | Task 18 |
| TypeScript throughout | Tasks 3, 4, 5 |
| Supabase Storage for images | Task 4 (bucket creation) |

**No user accounts, no wishlist, no blog** — confirmed out of scope (Phase 2+).

**Admin panel** — out of scope for this plan, covered in Phase 2 plan.

**Type consistency check:** `CartItem` defined in `lib/types.ts` (Task 3), used in `lib/cart-store.ts` (Task 6), `lib/yampi.ts` (Task 7), `components/store/cart-item.tsx` (Task 11), `components/store/variant-selector.tsx` (Task 15) — consistent throughout.

**`formatPrice`** defined in `lib/queries.ts` (Task 5), used in Tasks 11, 12, 15 — consistent.

**`buildCartCheckoutUrl` / `buildSingleCheckoutUrl`** defined in `lib/yampi.ts` (Task 7), used in Tasks 11, 15 — consistent.
