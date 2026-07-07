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
        <h1
          style={{
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 800,
            fontSize: '32px',
            marginBottom: '32px',
            color: 'var(--color-heading)',
          }}
        >
          Buscar produtos
        </h1>

        <form method="GET" style={{ marginBottom: '40px', maxWidth: '480px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              strokeWidth={1.5}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-muted)',
                pointerEvents: 'none',
              }}
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
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-muted)',
              marginBottom: '24px',
              fontFamily: 'var(--font-montserrat), sans-serif',
            }}
          >
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
