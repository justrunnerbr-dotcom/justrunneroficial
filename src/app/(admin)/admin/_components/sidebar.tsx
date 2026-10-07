'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { canOpenPage, type AdminArea } from '@/lib/admin/roles'
import {
  LayoutDashboard, Package, FolderOpen, Home, Image,
  Search, BarChart3, Settings, Megaphone, ExternalLink,
  LogOut, ShoppingBag, Users, Zap, Bell, Moon, Sun, Radio, BrainCircuit, MousePointerClick, Bot, MessageCircle, UserX, MessageSquare, Wallet, Menu, X, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, Activity, ScrollText, Sparkles, ClipboardCheck,
} from 'lucide-react'

type AdminStyle = 'prizm' | 'max' | 'carbon'
const STYLES: { key: AdminStyle; label: string }[] = [
  { key: 'prizm', label: 'Prizm' },
  { key: 'max', label: 'Liquid Glass Pro' },
  { key: 'carbon', label: 'Carbono' },
]
const STYLE_DEFAULT_MODE: Record<AdminStyle, 'light' | 'dark'> = { prizm: 'dark', max: 'light', carbon: 'dark' }

const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { label: 'Dashboard',    href: '/admin',              icon: LayoutDashboard },
      { label: 'Live View',    href: '/admin/live',         icon: Radio },
      { label: 'Alertas',      href: '/admin/alertas',      icon: Bell },
      { label: 'Saúde',        href: '/admin/saude',        icon: Activity },
      { label: 'Auditoria',    href: '/admin/auditoria',    icon: ScrollText },
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
    label: 'Financeiro',
    items: [
      { label: 'Fechamento do Mês', href: '/admin/financeiro/fechamento', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Análise Suprema',   href: '/admin/analise-suprema',   icon: Sparkles },
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

export function Sidebar({ area = 'full' }: { area?: AdminArea }) {
  const pathname = usePathname()
  const router   = useRouter()

  // Esconder o link não protege nada — quem guarda é o `checkAuth` de cada
  // rota. Isto existe só para o colaborador não encarar um menu de 30 itens
  // onde 29 o expulsam de volta.
  const navGroups = useMemo(
    () => NAV_GROUPS
      .map(group => ({ ...group, items: group.items.filter(item => canOpenPage(area, item.href)) }))
      .filter(group => group.items.length > 0),
    [area],
  )

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

  const [style, setStyle] = useState<AdminStyle>('prizm')

  useEffect(() => {
    // O tema já foi aplicado antes da pintura pelo script do layout; aqui só
    // sincroniza o estado dos botões com o que está no <div id="admin-root">.
    const root = document.getElementById('admin-root')
    const savedStyle = root?.dataset.style
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê do DOM uma vez na montagem
    if (savedStyle === 'prizm' || savedStyle === 'max' || savedStyle === 'carbon') setStyle(savedStyle)
    const saved = root?.dataset.theme === 'light' ? 'light' : 'dark'
    setTheme(saved)

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

  function chooseStyle(next: AdminStyle) {
    // Cada estilo abre no modo em que foi desenhado (Glass é claro, os outros escuros).
    const mode = STYLE_DEFAULT_MODE[next]
    setStyle(next)
    setTheme(mode)
    localStorage.setItem('admin-style', next)
    localStorage.setItem('admin-theme', mode)
    const root = document.getElementById('admin-root')
    if (root) { root.dataset.style = next; root.dataset.theme = mode }
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
          <div className="adm-logo">J</div>
          {!collapsed && (
            <div>
              <div className="adm-brand-name">Just Runner</div>
              <div className="adm-brand-sub">Admin</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        {navGroups.map((group) => {
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
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                      className={`adm-nav-i mini${active ? ' on' : ''}`}
                    >
                      <Icon size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
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
              className="adm-ng"
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.label)}
            >
              {group.label}
              <ChevronDown
                size={14}
                strokeWidth={2.2}
                style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              />
            </button>
            {isOpen && group.items.map((item) => {
              const active = isActive(item.href)
              const Icon   = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`adm-nav-i${active ? ' on' : ''}`}
                >
                  <Icon size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  {item.label}
                </Link>
              )
            })}
          </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 10px', borderTop: '1px solid var(--admin-border)', flexShrink: 0 }}>
        <div className={`adm-theme${collapsed ? ' mini' : ''}`}>
          <span className="adm-theme-l">Tema</span>
          <div className="adm-swatches" role="group" aria-label="Tema do admin">
            {STYLES.map(s => (
              <button
                key={s.key}
                type="button"
                className={`adm-sw adm-sw-${s.key}`}
                aria-pressed={style === s.key}
                aria-label={`Tema ${s.label}`}
                title={s.label}
                onClick={() => chooseStyle(s.key)}
              />
            ))}
            <button
              type="button"
              className="adm-mode"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
        <Link
          href="/"
          target="_blank"
          title={collapsed ? 'Ver Loja' : undefined}
          className={`adm-foot-btn${collapsed ? ' mini' : ''}`}
        >
          <ExternalLink size={16} />
          {!collapsed && 'Ver Loja'}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className={`adm-foot-btn danger${collapsed ? ' mini' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && 'Sair'}
        </button>
      </div>
      </aside>
    </>
  )
}
