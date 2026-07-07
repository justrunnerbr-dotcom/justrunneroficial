'use client'
import { memo, useCallback } from 'react'
import Link from 'next/link'
import type { Collection } from '@/lib/types'

interface MegaMenuProps {
  collections: Collection[]
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

export const MegaMenu = memo(function MegaMenu({
  collections,
  onMouseEnter,
  onMouseLeave,
  onClose,
  triggerRef,
}: MegaMenuProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        setTimeout(() => triggerRef.current?.focus(), 10)
      }
    },
    [onClose, triggerRef]
  )

  return (
    <>
      <div 
        className="mega-menu-overlay" 
        aria-hidden="true" 
        onClick={onClose} 
        style={{ zIndex: 98, background: 'transparent' }} 
      />
      
      <div
        id="dropdown-collections"
        role="region"
        aria-label="Submenu de coleções"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onKeyDown={handleKeyDown}
        className="horizontal-scrollbar"
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          maxHeight: '60vh',
          overflowY: 'auto',
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '8px 0',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        }}
      >
        {collections.map((col) => (
          <Link
            key={col.id}
            href={`/colecao/${col.slug}`}
            onClick={onClose}
            style={{ 
              display: 'block', 
              textDecoration: 'none',
              padding: '8px 20px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#d4d4d8',
              fontFamily: 'var(--font-montserrat), sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
               e.currentTarget.style.color = '#ffffff'
               e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            }}
            onMouseOut={(e) => {
               e.currentTarget.style.color = '#d4d4d8'
               e.currentTarget.style.background = 'transparent'
            }}
          >
            {col.name}
          </Link>
        ))}
        
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 20px' }} />
        
        <Link
          href="/colecao"
          onClick={onClose}
          style={{ 
            display: 'block', 
            textDecoration: 'none',
            padding: '8px 20px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: 'var(--font-montserrat), sans-serif',
            transition: 'background 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          Ver todas as coleções →
        </Link>
      </div>
    </>
  )
})
