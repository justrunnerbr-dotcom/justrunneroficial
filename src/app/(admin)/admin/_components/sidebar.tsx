'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Package, FolderOpen, Home, Image,
  Search, BarChart3, Settings, Megaphone, ExternalLink,
  LogOut, ShoppingBag, Users, Zap, Bell, Moon, Sun, Radio, BrainCircuit, MousePointerClick, Bot, MessageCircle, UserX, MessageSquare,
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

  useEffect(() => {
    const saved = localStorage.getItem('admin-theme') || 'dark'
    setTheme(saved)
    const root = document.getElementById('admin-root')
    if (root) root.dataset.theme = saved
  }, [])

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
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: '250px',
      background: 'var(--admin-bg)', display: 'flex', flexDirection: 'column',
      zIndex: 50, overflowY: 'auto', borderRight: '1px solid var(--admin-border)'
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', background: 'var(--admin-accent)', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: '0 0 12px rgba(var(--admin-accent-rgb), 0.4)'
          }}>J</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', letterSpacing: '0.2px' }}>Just Runner</div>
            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Performance Admin</div>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: '16px' }}>
            <div style={{ padding: '0 12px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-sec)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {group.label}
            </div>
            {group.items.map((item) => {
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
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--admin-border)', flexShrink: 0 }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
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
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <Link
          href="/"
          target="_blank"
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
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
          Ver Loja
        </Link>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
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
          Sair
        </button>
      </div>
    </aside>
  )
}
