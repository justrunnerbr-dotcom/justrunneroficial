'use client'
// Cabeçalho do tema novo (protótipo do sócio, prototipo-tema/assets/app.js → renderHeader), ligado à lógica
// real da loja: carrinho (useCartStore), busca (SearchModal) e rotas do Next. Estilo em src/styles/tema-novo.css.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, ShoppingBag, X } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'

const SearchModal = dynamic(() => import('../store/search-modal').then(m => ({ default: m.SearchModal })), { ssr: false })

const NAV: { label: string; href: string; hot?: true }[] = [
  { label: 'Compre 1 Leve 2', href: '/colecao/compre-1-leve-2', hot: true },
  { label: 'Compre 1 Leve 3', href: '/colecao/combos' },
  { label: 'Lançamentos', href: '/colecao/lancamentos' },
  { label: 'Modelos', href: '/colecao' },
  { label: 'Ajuda', href: '/faq' },
]

export function HeaderTema({ logoUrl }: { logoUrl?: string | null }) {
  const pathname = usePathname()
  const { openCart, itemCount } = useCartStore()
  // true só no navegador: o contador do carrinho (localStorage) não entra no HTML do servidor
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [bump, setBump] = useState(0)
  const prev = useRef(0)

  const count = mounted ? itemCount() : 0
  useEffect(() => { if (count > prev.current) setBump(b => b + 1); prev.current = count }, [count])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  // fecha o menu ao trocar de página (ajuste de estado no render, sem efeito)
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) { setLastPath(pathname); setMenuOpen(false) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const logo = (
    <Link href="/" className="logo" aria-label="Just Runner — início">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl || '/LOGO/JUST_25_2%20(1).png'} alt="Just Runner" width={96} height={38} />
    </Link>
  )

  return (
    <>
      <div className="topbar">
        <b>Compre 1, Leve 2 por R$ 297</b>
        <span className="sep hide-sm">|</span><span className="hide-sm">Frete grátis acima de R$ 200</span>
        <span className="sep hide-sm">|</span><span className="hide-sm">Parcele em até 12x</span>
      </div>
      <header className={`header${scrolled ? ' scrolled' : ''}`} id="site-header">
        <div className="wrap">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu /></button>
          {logo}
          <nav className="nav" aria-label="Principal">
            {NAV.map(n => (
              <Link key={n.href} href={n.href} className={[n.hot ? 'hot' : '', pathname === n.href ? 'active' : ''].join(' ').trim() || undefined}>{n.label}</Link>
            ))}
          </nav>
          <div className="icons">
            <button className="icon-btn" aria-label="Buscar" onClick={() => setSearchOpen(true)}><Search /></button>
            <button className="icon-btn" aria-label="Carrinho" onClick={openCart}>
              <ShoppingBag />
              <span key={bump} className={`cart-count${count > 0 ? ' show' : ''}${bump ? ' bump' : ''}`}>{count}</span>
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-nav${menuOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setMenuOpen(false) }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            {logo}
            <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Fechar"><X /></button>
          </div>
          {NAV.map(n => <Link key={n.href} href={n.href}>{n.label}</Link>)}
          <Link href="/sobre">Sobre a Just Runner</Link>
        </div>
      </div>
      {searchOpen && <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}
    </>
  )
}
