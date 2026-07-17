'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Package, FolderOpen, Home, Image,
  Search, BarChart3, Settings, Megaphone, ExternalLink,
  LogOut, ShoppingBag, Users, Zap, Bell, Moon, Sun, Radio, BrainCircuit, MousePointerClick, Bot, MessageCircle, UserX, MessageSquare, Wallet, Menu, X, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { label: 'Dashboard',    href: '/admin',              icon: LayoutDashboard },
      { label: 'Live View',    href: '/admin/live',         icon: Radio },
      { label: 'Alertas',      href: '/admin/alertas',      icon: Bell },
    ],
  },
  {
    label: 'Gerenciador',
    items: [
      { label: 'Gerenciador', href: '/admin/gerenciador', icon: LayoutGrid },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Produtos',     href: '/admin/produtos',     icon: Package },
      { label: 'Coleções',     href: '/admin/colecoes',     icon: FolderOpen },
      { label: 'Mídia',        href: '/admin/midia',        icon: Image },
    ],
  },
  {
    label: 'Operação',
    items: [
      { label: 'Pedidos',          href: '/admin/pedidos',          icon: ShoppingBag },
      { label: 'Recuperar Vendas', href: '/admin/recuperar-vendas', icon: MessageCircle },
      { label: 'Conversas',        href: '/admin/whatsapp',        icon: MessageSquare },
      { label: 'Clientes Sumidos', href: '/admin/clientes-sumidos', icon: UserX },
      { label: 'Clientes',         href: '/admin/clientes',         icon: Users },
      { label: 'Criativos',        href: '/admin/criativos',        icon: Zap },
      { label: 'Custo de Produtos', href: '/admin/custos',          icon: Wallet },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Commerce Brain',    href: '/admin/brain',             icon: BrainCircuit },
      { label: 'Gestor de Tráfego', href: '/admin/gestor-trafego',    icon: MousePointerClick },
      { label: 'Meta Ads',          href: '/admin/meta-ads',          icon: Megaphone },
      { label: 'Agente Meta Ads',   href: '/admin/meta-ads/agente',   icon: Bot },
      { label: 'Analytics',         href: '/admin/analytics',         icon: BarChart3 },
    ],
  },
  {
    label: 'Loja',
    items: [
      { label: 'Home Builder', href: '/admin/home-builder', icon: Home },
      { label: 'SEO',          href: '/admin/seo',          icon: Search },
      { label: 'Config',       href: '/admin/configuracoes',icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [theme, setTheme] = useState('dark')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const group of NAV_GROUPS) {
      initial[group.label] = group.items.some(item => pathname.startsWith(item.href))
    }
    return initial
  })

  function toggleGroup(label: string) {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  useEffect(() => {
    const saved = localStorage.getItem('admin-theme') || 'dark'
    setTheme(saved)
    const root = document.getElementById('admin-root')
    if (root) root.dataset.theme = saved

    const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed') === 'true'
    setCollapsed(savedCollapsed)
    applySidebarWidth(savedCollapsed)
  }, [])

  function applySidebarWidth(isCollapsed: boolean) {
    const root = document.getElementById('admin-root')
    if (root) root.style.setProperty('--admin-sidebar-width', isCollapsed ? '76px' : '250px')
  }

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('admin-sidebar-collapsed', String(next))
    applySidebarWidth(next)
  }

  // Fecha o drawer ao trocar de página (mobile) — sem isso, navegar deixa a
  // sidebar aberta cobrindo o conteúdo da página nova.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('admin-theme', newTheme)
    const root = document.getElementById('admin-root')
    if (root) root.dataset.theme = newTheme
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Botão hambúrguer — só aparece <768px (ver admin.css) */}
      <button
        onClick={() => setMobileOpen(v => !v)}
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        className="admin-hamburger"
        style={{
          display: 'none', position: 'fixed', top: '14px', left: '14px', zIndex: 110,
          width: '40px', height: '40px', alignItems: 'center', justifyContent: 'center',
          background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '10px',
          color: 'var(--admin-text-main)', cursor: 'pointer',
        }}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Backdrop — fecha o drawer ao clicar fora (só relevante/visível no mobile) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="admin-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
        />
      )}

      <aside className={`admin-sidebar${mobileOpen ? ' mobile-open' : ''}`} style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        background: 'var(--admin-card)', display: 'flex', flexDirection: 'column',
        zIndex: 100, overflowY: 'auto', boxShadow: '4px 0 16px rgba(0,0,0,0.18)',
      }}>
      {/* Setinha de minimizar/expandir — some no mobile (ver admin.css) */}
      <button
        onClick={toggleCollapsed}
        title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
        className="admin-collapse-btn"
        style={{
          position: 'absolute', top: '84px', right: '10px', zIndex: 101,
          width: '28px', height: '28px', borderRadius: '50%',
          background: 'var(--admin-accent)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: '#fff', padding: 0, border: 'none',
        }}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* Logo */}
      <div style={{ padding: collapsed ? '24px 12px' : '24px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '12px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: '32px', height: '32px', background: 'var(--admin-accent)', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: '0 0 12px rgba(var(--admin-accent-rgb), 0.4)'
          }}>J</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', letterSpacing: '0.2px' }}>Just Runner</div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Performance Admin</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group) => {
          const isOpen = collapsed ? true : Boolean(openGroups[group.label])
          if (collapsed) {
            return (
              <div key={group.label} style={{ marginBottom: '16px' }}>
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  const Icon   = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '10px', margin: '2px 0', borderRadius: '8px',
                        color: active ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                        background: active ? 'rgba(var(--admin-accent-rgb), 0.08)' : 'transparent',
                        textDecoration: 'none', transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = 'var(--admin-text-main)'; e.currentTarget.style.background = 'var(--admin-card-hover)' } }}
                      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = 'var(--admin-text-muted)'; e.currentTarget.style.background = 'transparent' } }}
                    >
                      <Icon size={16} strokeWidth={active ? 2 : 1.8} style={{ flexShrink: 0 }} />
                    </Link>
                  )
                })}
              </div>
            )
          }
          return (
          <div key={group.label} style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '0 8px 8px 12px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-sec)',
                textTransform: 'uppercase', letterSpacing: '0.8px',
              }}
            >
              {group.label}
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px', borderRadius: '6px',
                background: 'var(--admin-card-hover)',
              }}>
                <ChevronDown
                  size={15}
                  strokeWidth={2.5}
                  color="var(--admin-text-main)"
                  style={{ transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
              </span>
            </button>
            {isOpen && group.items.map((item) => {
              const active = isActive(item.href)
              const Icon   = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '8px 12px', margin: '2px 0', borderRadius: '8px',
                    fontSize: '13px', fontWeight: active ? 500 : 400,
                    color: active ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                    background: active ? 'rgba(var(--admin-accent-rgb), 0.08)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--admin-text-main)'
                      e.currentTarget.style.background = 'var(--admin-card-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--admin-text-muted)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <Icon size={16} strokeWidth={active ? 2 : 1.8} style={{ flexShrink: 0 }} />
                  {item.label}
                </Link>
              )
            })}
          </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--admin-border)', flexShrink: 0 }}>
        <button
          onClick={toggleTheme}
          title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '8px 12px', borderRadius: '8px', width: '100%',
            fontSize: '13px', color: 'var(--admin-text-muted)', background: 'none',
            border: 'none', cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.2s ease',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--admin-text-main)'
            e.currentTarget.style.background = 'var(--admin-card-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--admin-text-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && (theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
        </button>
        <Link
          href="/"
          target="_blank"
          title={collapsed ? 'Ver Loja' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '8px 12px', borderRadius: '8px',
            fontSize: '13px', color: 'var(--admin-text-muted)', textDecoration: 'none',
            transition: 'all 0.2s ease',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--admin-text-main)'
            e.currentTarget.style.background = 'var(--admin-card-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--admin-text-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <ExternalLink size={16} />
          {!collapsed && 'Ver Loja'}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '8px 12px', borderRadius: '8px', width: '100%',
            fontSize: '13px', color: 'var(--admin-text-muted)', background: 'none',
            border: 'none', cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--admin-red)'
            e.currentTarget.style.background = 'rgba(var(--admin-red-rgb), 0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--admin-text-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut size={16} />
          {!collapsed && 'Sair'}
        </button>
      </div>
      </aside>
    </>
  )
}
