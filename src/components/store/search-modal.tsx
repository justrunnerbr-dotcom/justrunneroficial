'use client'
import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, X, Loader2 } from 'lucide-react'
import { searchProductsClient } from '@/lib/client-queries'
import { metaSearch } from '@/lib/meta'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/lib/types'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SearchModal = memo(function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  /* Body scroll lock + focus on open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        setQuery('')
        setResults([])
        setHighlightedIndex(-1)
        inputRef.current?.focus()
      }, 0)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  /* ESC key */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  /* Debounced predictive search — 250ms */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setIsLoading(false)
      setHighlightedIndex(-1)
      return
    }

    setIsLoading(true)
    let cancelled = false

    debounceRef.current = setTimeout(() => {
      searchProductsClient(q)
        .then((data) => {
          if (!cancelled) {
            setResults(data)
            setIsLoading(false)
            setHighlightedIndex(-1)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([])
            setIsLoading(false)
          }
        })
    }, 250)

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const navigateTo = useCallback(
    (slug: string) => {
      onClose()
      router.push(`/produto/${slug}`)
    },
    [onClose, router]
  )

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const q = query.trim()
      if (!q) return
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        navigateTo(results[highlightedIndex].slug)
        return
      }
      metaSearch({ search_string: q, content_category: 'Óculos' })
      onClose()
      router.push(`/busca?q=${encodeURIComponent(q)}`)
    },
    [query, highlightedIndex, results, navigateTo, onClose, router]
  )

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, -1))
      } else if (e.key === 'Enter') {
        handleSubmit()
      }
    },
    [results.length, handleSubmit]
  )

  const getMinPrice = useCallback((product: Product): number | null => {
    if (!product.variants?.length) return null
    return Math.min(...product.variants.map((v) => v.price))
  }, [])

  if (!isOpen) return null

  const trimmedQuery = query.trim()
  const hasQuery = trimmedQuery.length >= 2
  const showResults = hasQuery && !isLoading && results.length > 0
  const showNoResults = hasQuery && !isLoading && results.length === 0

  return (
    <div
      className="search-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Busca de produtos"
    >
      <div className="search-modal-panel">
        {/* Search input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <Search size={20} strokeWidth={1.5} color="var(--color-muted)" style={{ flexShrink: 0 }} />

          <form onSubmit={handleSubmit} style={{ flex: 1 }}>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Buscar produtos..."
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showResults}
              aria-controls="search-results-listbox"
              aria-activedescendant={
                highlightedIndex >= 0 ? `search-result-${highlightedIndex}` : undefined
              }
              aria-label="Buscar produtos"
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '18px',
                color: 'var(--color-heading)',
                background: 'transparent',
                fontFamily: 'var(--font-poppins), sans-serif',
                fontWeight: 500,
              }}
            />
          </form>

          {isLoading && (
            <span aria-label="Carregando resultados" style={{ flexShrink: 0, display: 'flex' }}>
              <Loader2
                size={18}
                strokeWidth={1.5}
                color="var(--color-muted)"
                style={{ animation: 'spin 0.8s linear infinite' }}
              />
            </span>
          )}

          <button
            onClick={onClose}
            aria-label="Fechar busca"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              flexShrink: 0,
              color: 'var(--color-muted)',
            }}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
          {/* Empty state */}
          {!hasQuery && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-muted)',
                fontFamily: 'var(--font-montserrat), sans-serif',
                textAlign: 'center',
                padding: '32px 24px',
              }}
            >
              Digite para buscar produtos
            </p>
          )}

          {/* No results */}
          {showNoResults && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-muted)',
                fontFamily: 'var(--font-montserrat), sans-serif',
                textAlign: 'center',
                padding: '32px 24px',
              }}
            >
              Nenhum produto encontrado para &ldquo;{trimmedQuery}&rdquo;
            </p>
          )}

          {/* Predictive results */}
          {showResults && (
            <ul
              id="search-results-listbox"
              role="listbox"
              aria-label="Resultados da busca"
              style={{ listStyle: 'none', padding: '8px 0 0' }}
            >
              {results.map((product, i) => {
                const thumb = product.images?.[0]?.url
                const minPrice = getMinPrice(product)
                const isHighlighted = i === highlightedIndex

                return (
                  <li
                    key={product.id}
                    id={`search-result-${i}`}
                    role="option"
                    aria-selected={isHighlighted}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    onMouseLeave={() => setHighlightedIndex(-1)}
                    onClick={() => navigateTo(product.slug)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 24px',
                      cursor: 'pointer',
                      background: isHighlighted ? 'var(--color-img-bg)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '8px',
                        background: 'var(--color-img-bg)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      {thumb && (
                        <Image
                          src={thumb}
                          alt={product.name}
                          fill
                          sizes="52px"
                          style={{ objectFit: 'cover' }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--color-heading)',
                          fontFamily: 'var(--font-poppins), sans-serif',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '2px',
                        }}
                      >
                        {product.name}
                      </p>
                      {minPrice !== null && (
                        <p
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-muted)',
                            fontFamily: 'var(--font-montserrat), sans-serif',
                          }}
                        >
                          {formatPrice(minPrice)}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* "Ver todos" CTA */}
          {(showResults || (hasQuery && !isLoading)) && (
            <div
              style={{
                padding: '12px 24px 16px',
                borderTop: showResults ? '1px solid var(--color-border)' : 'none',
                marginTop: showResults ? '8px' : 0,
              }}
            >
              <button
                onClick={() => handleSubmit()}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'var(--color-accent)',
                  color: 'var(--color-accent-text)',
                  border: 'none',
                  borderRadius: 'var(--button-radius)',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-poppins), sans-serif',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Search size={14} strokeWidth={2} />
                {showResults
                  ? `Ver todos os resultados para “${trimmedQuery}”`
                  : `Buscar “${trimmedQuery}”`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
