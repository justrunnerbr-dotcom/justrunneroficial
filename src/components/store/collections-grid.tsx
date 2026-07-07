import Link from 'next/link'
import Image from 'next/image'
import type { Collection } from '@/lib/types'

interface CollectionsGridProps {
  collections: Collection[]
}

export function CollectionsGrid({ collections }: CollectionsGridProps) {
  if (collections.length === 0) return null

  return (
    <section style={{ padding: '64px 0' }}>
      <div
        style={{
          maxWidth: 'var(--page-width)',
          margin: '0 auto',
          padding: '0 5rem',
        }}
      >
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 800,
            marginBottom: '32px',
            fontFamily: 'var(--font-poppins), sans-serif',
            color: 'var(--color-heading)',
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
            <Link key={col.id} href={`/colecao/${col.slug}`} style={{ display: 'block' }}>
              <div
                style={{
                  background: 'var(--color-img-bg)',
                  borderRadius: '8px',
                  aspectRatio: '3 / 2',
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
