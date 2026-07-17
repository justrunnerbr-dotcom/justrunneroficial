'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import type { Collection } from '@/lib/types'

interface MobileDrawerProps {
  collections: Collection[]
  isOpen: boolean
  onClose: () => void
}

type DrawerLevel = 'main' | 'collections' | 'all-categories'

// Atalhos dentro de "Coleções" — "Ver todas as categorias" abre a lista completa
// dentro do próprio menu, não navega direto pra página.
const COLLECTIONS_QUICK_LINKS = [
  { label: 'Compre 1 Leve 2', href: '/colecao/compre-1-leve-2' },
  { label: 'Mais Vendidos', href: '/colecao/mais-vendidos' },
]

const BACK_LEVEL: Record<DrawerLevel, DrawerLevel> = {
  main: 'main',
  collections: 'main',
  'all-categories': 'collections',
}

const HEADER_TITLE: Record<DrawerLevel, string> = {
  main: 'JUST RUNNER',
  collections: 'Coleções',
  'all-categories': 'Todas as categorias',
}

export function MobileDrawer({ collections, isOpen, onClose }: MobileDrawerProps) {
  const [level, setLevel] = useState<DrawerLevel>('main')

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setLevel('main'), 300)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (level !== 'main') {
          setLevel(BACK_LEVEL[level])
        } else {
          onClose()
        }
      }
    }
    if (isOpen) document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, level, onClose])

  if (!isOpen) return null

  const mainLinks = [
    { label: 'Início', href: '/' },
    { label: '🎁 Oferta Progressiva', href: '/colecao/oferta-progressiva' },
    { label: 'Sobre', href: '/sobre' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contato', href: '/contato' },
  ]

  return (
    <>
      <div className="mobile-drawer-backdrop" onClick={onClose} aria-hidden="true" />

      <div
        className="mobile-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
            minHeight: 'var(--header-height)',
          }}
        >
          {level !== 'main' ? (
            <button
              onClick={() => setLevel(BACK_LEVEL[level])}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-heading)',
                fontFamily: 'var(--font-poppins), sans-serif',
              }}
            >
              <ChevronLeft size={18} strokeWidth={2} />
              {HEADER_TITLE[level]}
            </button>
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-poppins), sans-serif',
                fontWeight: 800,
                fontSize: '16px',
                color: 'var(--color-heading)',
              }}
            >
              {HEADER_TITLE.main}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              color: 'var(--color-heading)',
            }}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Main level */}
        {level === 'main' && (
          <nav style={{ padding: '8px 0' }}>
            {/* Collections trigger */}
            <button
              onClick={() => setLevel('collections')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-heading)',
                fontFamily: 'var(--font-poppins), sans-serif',
                textAlign: 'left',
              }}
            >
              Coleções
              <ChevronRight size={16} strokeWidth={2} color="var(--color-muted)" />
            </button>

            {/* Page links */}
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--color-foreground)',
                  fontFamily: 'var(--font-montserrat), sans-serif',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Collections level — atalhos curados + gatilho pra lista completa */}
        {level === 'collections' && (
          <nav style={{ padding: '8px 0' }}>
            <button
              onClick={() => setLevel('all-categories')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--color-foreground)',
                fontFamily: 'var(--font-montserrat), sans-serif',
                textAlign: 'left',
              }}
            >
              Ver todas as categorias
              <ChevronRight size={14} strokeWidth={2} color="var(--color-muted)" />
            </button>

            {COLLECTIONS_QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--color-foreground)',
                  fontFamily: 'var(--font-montserrat), sans-serif',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                {link.label}
                <ChevronRight size={14} strokeWidth={2} color="var(--color-muted)" />
              </Link>
            ))}
          </nav>
        )}

        {/* All categories level — lista completa, cliente escolhe e navega direto */}
        {level === 'all-categories' && (
          <nav style={{ padding: '8px 0' }}>
            {collections.map((col, i) => (
              <Link
                key={col.id}
                href={`/colecao/${col.slug}`}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--color-foreground)',
                  fontFamily: 'var(--font-montserrat), sans-serif',
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {col.name}
                <ChevronRight size={14} strokeWidth={2} color="var(--color-muted)" />
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  )
}
