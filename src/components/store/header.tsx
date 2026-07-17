'use client'
import { useState, useEffect, useRef, useCallback, memo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search, ShoppingBag, Menu, ChevronDown } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useHeaderContext } from '@/contexts/header-context'
import type { Collection } from '@/lib/types'

// Lazy-load heavy overlays — só carregam quando o usuário interage
const MegaMenu   = dynamic(() => import('./mega-menu').then(m => ({ default: m.MegaMenu })), { ssr: false })
const MobileDrawer = dynamic(() => import('./mobile-drawer').then(m => ({ default: m.MobileDrawer })), { ssr: false })
const SearchModal  = dynamic(() => import('./search-modal').then(m => ({ default: m.SearchModal })), { ssr: false })

interface HeaderProps {
  collections: Collection[]
  logoUrl?: string | null
  logoTransparentUrl?: string | null
}

const NAV_LINKS: { label: string; href: string; mega?: true }[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Compre 1 Leve 2', href: '/colecao/compre-1-leve-2' },
  { label: 'Categorias', href: '/colecao', mega: true },
  { label: 'Mais vendidos', href: '/colecao/mais-vendidos' },
  { label: '🎁 Oferta Progressiva', href: '/colecao/oferta-progressiva' },
]

export const Header = memo(function Header({
  collections,
  logoUrl,
  logoTransparentUrl,
}: HeaderProps) {
  const pathname = usePathname()
  const { isTransparentPage } = useHeaderContext()
  const { openCart, itemCount } = useCartStore()

  // ── Hydration guard: cart count só aparece após mount para evitar mismatch ──
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const count = mounted ? itemCount() : 0

  const prevCount = useRef(0)

  // ── Scroll: apenas dois estados booleanos em vez de armazenar scrollY bruto ──
  // Antes: setScrollY(current) disparava re-render em CADA pixel de scroll
  // Agora: re-render só ocorre ao cruzar os thresholds 10px e 80px
  const [scrolledPast10, setScrolledPast10]   = useState(false)
  const [scrolledPast80, setScrolledPast80]   = useState(false)
  const scrolledPast10Ref = useRef(false)
  const scrolledPast80Ref = useRef(false)

  const [headerHidden, setHeaderHidden]   = useState(false)
  const [megaMenuOpen, setMegaMenuOpen]   = useState(false)
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [searchOpen, setSearchOpen]       = useState(false)
  const [cartBubbleKey, setCartBubbleKey] = useState(0)

  const lastScrollY       = useRef(0)
  const drawerOpenRef     = useRef(false)
  const searchOpenRef     = useRef(false)
  const megaMenuTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const megaTriggerRef    = useRef<HTMLButtonElement>(null)

  useEffect(() => { drawerOpenRef.current = drawerOpen }, [drawerOpen])
  useEffect(() => { searchOpenRef.current = searchOpen }, [searchOpen])

  useEffect(() => {
    if (count > prevCount.current) setCartBubbleKey((k) => k + 1)
    prevCount.current = count
  }, [count])

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY
      const delta   = current - lastScrollY.current

      if (current < 80) {
        setHeaderHidden(false)
      } else if (delta > 8 && !drawerOpenRef.current && !searchOpenRef.current) {
        setHeaderHidden(true)
        setMegaMenuOpen(false)
      } else if (delta < -8) {
        setHeaderHidden(false)
      }

      lastScrollY.current = current

      // Threshold checks — apenas 2 possíveis mudanças de estado por threshold
      const newPast10 = current > 10
      const newPast80 = current >= 80
      if (newPast10 !== scrolledPast10Ref.current) {
        scrolledPast10Ref.current = newPast10
        setScrolledPast10(newPast10)
      }
      if (newPast80 !== scrolledPast80Ref.current) {
        scrolledPast80Ref.current = newPast80
        setScrolledPast80(newPast80)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMegaMenuOpen(false) }, [pathname])

  const isTransparent = isTransparentPage && !scrolledPast80
  const isSolid       = !isTransparent
  const fgColor       = isTransparent ? '#ffffff' : 'var(--color-heading)'
  const bgColor       = isTransparent ? 'transparent' : 'var(--color-background)'
  const borderColor   = isTransparent ? 'transparent' : scrolledPast10 ? 'var(--color-border)' : 'transparent'

  const handleMegaEnter = useCallback(() => {
    if (megaMenuTimeout.current) clearTimeout(megaMenuTimeout.current)
    setMegaMenuOpen(true)
  }, [])

  const handleMegaLeave = useCallback(() => {
    megaMenuTimeout.current = setTimeout(() => setMegaMenuOpen(false), 180)
  }, [])

  const handleMegaClose  = useCallback(() => setMegaMenuOpen(false), [])
  const handleDrawerClose = useCallback(() => setDrawerOpen(false), [])
  const handleSearchClose = useCallback(() => setSearchOpen(false), [])

  const handleMegaTriggerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setMegaMenuOpen((open) => !open)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMegaMenuOpen(true)
    } else if (e.key === 'Escape') {
      setMegaMenuOpen(false)
    }
  }, [])

  const iconBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: fgColor,
    transition: 'color 0.3s ease, opacity 0.2s ease',
  }

  const navLink = (href: string): React.CSSProperties => ({
    padding: '0 13px',
    height: 'var(--header-height)',
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 500,
    color: fgColor,
    fontFamily: 'var(--font-montserrat), sans-serif',
    whiteSpace: 'nowrap',
    transition: 'color 0.3s ease',
    borderBottom: pathname === href ? '2px solid currentColor' : '2px solid transparent',
  })

  const logoSrc = isTransparent && logoTransparentUrl ? logoTransparentUrl : (logoUrl || '/LOGO/JUST_25_2%20(1).png')

  const logoContent = (
    <Image
      src={logoSrc}
      alt="Just Runner"
      height={40}
      width={130}
      priority
      className="site-logo"
      style={{ objectFit: 'contain', width: 'auto' }}
    />
  )

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: bgColor,
          borderBottom: `1px solid ${borderColor}`,
          transform: headerHidden ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), background-color 0.3s ease, border-color 0.3s ease',
          boxShadow: isSolid && scrolledPast10 ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div
          className="page-width"
          style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', position: 'relative' }}
        >

          {/* ── LEFT: hamburger (mobile) ── */}
          <div className="header-left">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu de navegação"
              className="header-mobile-trigger"
              style={iconBtn}
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
          </div>

          {/* ── LOGO ── */}
          <Link href="/" aria-label="Just Runner — página inicial" className="header-logo">
            {logoContent}
          </Link>

          {/* Nav — desktop only */}
          <nav className="header-desktop-nav" aria-label="Navegação principal">
            {NAV_LINKS.map((link) => {
              if (link.mega) {
                return (
                  <div
                    key={link.href}
                    onMouseEnter={handleMegaEnter}
                    onMouseLeave={handleMegaLeave}
                    style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', position: 'relative' }}
                  >
                    <Link
                      href={link.href}
                      aria-haspopup="true"
                      aria-expanded={megaMenuOpen}
                      onKeyDown={handleMegaTriggerKeyDown}
                      style={{ ...navLink(link.href), gap: '3px' }}
                    >
                      {link.label}
                      <ChevronDown
                        size={11}
                        strokeWidth={2.5}
                        style={{
                          transition: 'transform 0.2s ease',
                          transform: megaMenuOpen ? 'rotate(-180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </Link>
                    {megaMenuOpen && (
                      <MegaMenu
                        collections={collections}
                        onMouseEnter={handleMegaEnter}
                        onMouseLeave={handleMegaLeave}
                        onClose={handleMegaClose}
                        triggerRef={megaTriggerRef}
                      />
                    )}
                  </div>
                )
              }
              return (
                <Link key={link.href} href={link.href} style={navLink(link.href)}>
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* ── RIGHT: Social (desktop) + Search + Cart ── */}
          <div className="header-right">
            {/* Instagram — desktop only */}
            <a
              href="https://instagram.com/justhavefun.store"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="header-social-link"
              style={{ color: fgColor }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
              </svg>
            </a>

            {/* YouTube — desktop only */}
            <a
              href="https://www.youtube.com/@jhfstore"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="header-social-link"
              style={{ color: fgColor }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
              </svg>
            </a>

            {/* Search */}
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar produtos" style={iconBtn}>
              <Search size={20} strokeWidth={1.5} />
            </button>

            {/* Cart */}
            <button
              onClick={openCart}
              aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
              style={{ ...iconBtn, position: 'relative' }}
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {count > 0 && (
                <span
                  key={cartBubbleKey}
                  className="cart-bubble-pop"
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '17px',
                    height: '17px',
                    borderRadius: '50%',
                    background: isTransparent ? '#ffffff' : 'var(--color-accent)',
                    color: isTransparent ? 'var(--color-heading)' : 'var(--color-accent-text)',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-poppins), sans-serif',
                    lineHeight: 1,
                    transition: 'background 0.3s ease, color 0.3s ease',
                  }}
                >
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer collections={collections} isOpen={drawerOpen} onClose={handleDrawerClose} />
      <SearchModal isOpen={searchOpen} onClose={handleSearchClose} />
    </>
  )
})
