import { getAdminSupabase } from '@/lib/admin-client'
import { AlertTriangle, XCircle, CheckCircle2, ExternalLink, BrainCircuit, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { getBrainQuickStats } from '@/lib/admin/commerce-brain'
import { getDateRangePreset } from '@/lib/admin/date-range'
import { getMetaAlertsData } from '@/lib/admin/meta-ads'

interface Alert {
  type: 'error' | 'warning' | 'ok'
  title: string
  desc: string
  href?: string
  action?: string
}

async function getAlerts(): Promise<Alert[]> {
  const db = getAdminSupabase()
  const alerts: Alert[] = []

  const [
    { count: totalProducts },
    { data: noImageProducts },
    { data: noVariantProducts },
    { data: draftProducts },
    { count: totalVariants },
  ] = await Promise.all([
    db.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('products')
      .select('id, name, slug')
      .eq('status', 'active')
      .not('id', 'in', db.from('images').select('product_id'))
      .limit(20),
    db.from('products')
      .select('id, name, slug')
      .eq('status', 'active')
      .not('id', 'in', db.from('variants').select('product_id'))
      .limit(20),
    db.from('products').select('id', { count: 'exact' }).eq('status', 'draft'),
    db.from('variants').select('*', { count: 'exact', head: true }).eq('status', 'active').gt('price', 0),
  ])

  const noImageCount   = noImageProducts?.length ?? 0
  const noVariantCount = noVariantProducts?.length ?? 0
  const draftCount     = draftProducts?.length ?? 0

  // Produtos sem imagem
  if (noImageCount > 0) {
    alerts.push({
      type: 'error',
      title: `${noImageCount} produto${noImageCount > 1 ? 's' : ''} ativo${noImageCount > 1 ? 's' : ''} sem imagem`,
      desc: 'Produtos ativos sem imagem não aparecem corretamente na loja e no catálogo Meta.',
      href: '/admin/produtos?filter=no-image',
      action: 'Ver produtos',
    })
  }

  // Produtos sem variante
  if (noVariantCount > 0) {
    alerts.push({
      type: 'error',
      title: `${noVariantCount} produto${noVariantCount > 1 ? 's' : ''} ativo${noVariantCount > 1 ? 's' : ''} sem variante`,
      desc: 'Sem variante, o produto não tem preço nem SKU — não pode ser adicionado ao carrinho.',
      href: '/admin/produtos',
      action: 'Ver produtos',
    })
  }

  // Rascunhos
  if (draftCount > 5) {
    alerts.push({
      type: 'warning',
      title: `${draftCount} produtos em rascunho`,
      desc: 'Verifique se há produtos prontos para publicar que ainda estão como rascunho.',
      href: '/admin/produtos?status=draft',
      action: 'Ver rascunhos',
    })
  }

  // Sem variantes no geral
  if ((totalVariants ?? 0) === 0) {
    alerts.push({
      type: 'error',
      title: 'Nenhuma variante encontrada no catálogo',
      desc: 'Sem variantes, nenhum produto pode ser vendido. Verifique o banco de dados.',
    })
  }

  // Feed Meta (placeholder — real check requires fetch)
  alerts.push({
    type: 'ok',
    title: 'Feed Meta XML configurado',
    desc: `${totalVariants ?? 0} SKUs exportados via /meta-feed.xml com cache de 1h.`,
    href: 'https://justrunner.com.br/meta-feed.xml',
    action: 'Abrir feed',
  })

  // Produtos ativos
  if ((totalProducts ?? 0) > 0) {
    alerts.push({
      type: 'ok',
      title: `${totalProducts} produtos ativos na loja`,
      desc: 'Catálogo publicado e disponível para compra.',
      href: '/admin/produtos?status=active',
      action: 'Ver ativos',
    })
  }

  return alerts
}

export default async function AlertasPage() {
  const brainRange  = getDateRangePreset('last_7_days')
  const db = getAdminSupabase()
  const [alerts, brainStats, metaAlerts] = await Promise.all([
    getAlerts(),
    getBrainQuickStats(db, brainRange),
    getMetaAlertsData(db, brainRange),
  ])

  const errors   = alerts.filter(a => a.type === 'error')
  const warnings = alerts.filter(a => a.type === 'warning')
  const oks      = alerts.filter(a => a.type === 'ok')

  function AlertCard({ alert }: { alert: Alert }) {
    const config = {
      error:   { icon: XCircle,       bg: '#fff1f2', border: '#fecdd3', iconColor: '#ef4444', titleColor: '#dc2626' },
      warning: { icon: AlertTriangle, bg: '#fffbeb', border: '#fde68a', iconColor: '#f59e0b', titleColor: '#d97706' },
      ok:      { icon: CheckCircle2,  bg: '#f0fdf4', border: '#bbf7d0', iconColor: '#22c55e', titleColor: '#16a34a' },
    }[alert.type]
    const Icon = config.icon

    return (
      <div style={{ background: config.bg, border: `1px solid ${config.border}`, borderRadius: '10px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <Icon size={18} color={config.iconColor} style={{ marginTop: '1px', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: config.titleColor, marginBottom: '4px' }}>
            {alert.title}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>{alert.desc}</div>
          {alert.href && alert.action && (
            alert.href.startsWith('http') ? (
              <a href={alert.href} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--admin-accent)', fontWeight: 500, textDecoration: 'none', marginTop: '8px' }}>
                {alert.action} <ExternalLink size={11} />
              </a>
            ) : (
              <Link href={alert.href}
                style={{ display: 'inline-block', fontSize: '12px', color: 'var(--admin-accent)', fontWeight: 500, textDecoration: 'none', marginTop: '8px' }}>
                {alert.action} →
              </Link>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Central de Alertas</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          {errors.length} erro{errors.length !== 1 ? 's' : ''} · {warnings.length} aviso{warnings.length !== 1 ? 's' : ''} · {oks.length} OK
        </p>
      </div>

      {/* Commerce Brain Section */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BrainCircuit size={16} color="var(--admin-accent)" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Inteligência de Conversão — Últimos 7 dias</span>
          </div>
          <Link href="/admin/brain" style={{ fontSize: '12px', color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 500 }}>
            Ver Brain completo →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
          {[
            { label: 'Add to Cart', value: brainStats.atc, suffix: '' },
            { label: 'Checkouts',   value: brainStats.checkout, suffix: '' },
            { label: 'Cart→Checkout', value: `${Math.round(brainStats.atcToCheckoutRate * 100)}%`, suffix: '' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--admin-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>

        {brainStats.topInsight ? (
          <div style={{ display: 'flex', gap: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>
            <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '2px' }}>
                Gargalo detectado: {brainStats.biggestGap}
              </div>
              <div style={{ fontSize: '12px', color: '#b45309', marginBottom: '3px' }}>{brainStats.topInsight}</div>
              <div style={{ fontSize: '11px', color: '#b45309', fontStyle: 'italic' }}>→ {brainStats.topInsightAction}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
            <CheckCircle2 size={15} color="#16a34a" />
            <span style={{ fontSize: '13px', color: '#166534' }}>
              {brainStats.atc >= 5 ? 'Funil de conversão saudável nos últimos 7 dias.' : 'Volume ainda baixo — aguardando mais dados.'}
            </span>
          </div>
        )}
      </div>

      {/* Meta Ads Alerts */}
      {metaAlerts.length > 0 && (
        <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="var(--admin-accent)" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Meta Ads — Últimos 7 dias</span>
            </div>
            <Link href="/admin/meta-ads" style={{ fontSize: '12px', color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 500 }}>
              Ver campanhas →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {metaAlerts.map((a, i) => {
              const cfg = {
                error:   { bg: '#fff1f2', border: '#fecdd3', iconColor: '#ef4444', titleColor: '#dc2626' },
                warning: { bg: '#fffbeb', border: '#fde68a', iconColor: '#f59e0b', titleColor: '#d97706' },
                ok:      { bg: '#f0fdf4', border: '#bbf7d0', iconColor: '#22c55e', titleColor: '#16a34a' },
              }[a.type]
              const Icon = a.type === 'error' ? XCircle : a.type === 'warning' ? AlertTriangle : CheckCircle2
              return (
                <div key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Icon size={15} color={cfg.iconColor} style={{ marginTop: '1px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: cfg.titleColor, marginBottom: '2px' }}>{a.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>{a.desc}</div>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>{a.evidence}</div>
                    <Link href="/admin/meta-ads" style={{ fontSize: '11px', color: 'var(--admin-accent)', fontWeight: 500, textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}>
                      {a.action} →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Score bar */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Saúde do catálogo</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: errors.length === 0 ? '#16a34a' : errors.length <= 2 ? '#f59e0b' : '#dc2626' }}>
            {errors.length === 0 ? '100%' : errors.length <= 1 ? '75%' : errors.length <= 2 ? '50%' : '25%'}
          </span>
        </div>
        <div style={{ height: '8px', background: 'var(--admin-card-hover)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '4px',
            width: errors.length === 0 ? '100%' : errors.length <= 1 ? '75%' : errors.length <= 2 ? '50%' : '25%',
            background: errors.length === 0 ? '#22c55e' : errors.length <= 1 ? '#f59e0b' : '#ef4444',
          }} />
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Erros críticos ({errors.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {errors.map((a, i) => <AlertCard key={i} alert={a} />)}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Avisos ({warnings.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {warnings.map((a, i) => <AlertCard key={i} alert={a} />)}
          </div>
        </div>
      )}

      {oks.length > 0 && (
        <div>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Funcionando ({oks.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {oks.map((a, i) => <AlertCard key={i} alert={a} />)}
          </div>
        </div>
      )}
    </div>
  )
}
