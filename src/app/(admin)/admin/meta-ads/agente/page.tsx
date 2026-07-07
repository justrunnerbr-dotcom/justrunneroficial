import { AlertTriangle, DollarSign, Target, TrendingUp } from 'lucide-react'
import { getAdminSupabase } from '@/lib/admin-client'
import { getMetaPageData, getMetaAlertsData, isMetaConfigured } from '@/lib/admin/meta-ads'
import { getDateRangeFromSearchParams, type DateRange } from '@/lib/admin/date-range'
import { AgentChat } from './_components/agent-chat'

export const metadata = { title: 'Agente Meta Ads · JHF Admin' }

function OverviewCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '16px 18px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Icon size={13} color="var(--admin-text-muted)" />
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: color ?? 'var(--admin-text-main)', fontFamily: 'monospace', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
    </div>
  )
}

export default async function AgenteMetaAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp    = await searchParams
  const range: DateRange = getDateRangeFromSearchParams(sp)
  const configured = isMetaConfigured()
  const db    = getAdminSupabase()

  const [metaData, alerts] = await Promise.all([
    configured ? getMetaPageData(db, range) : Promise.resolve(null),
    configured ? getMetaAlertsData(db, range) : Promise.resolve([]),
  ])

  const fmtBrl     = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtX       = (n: number) => `${n.toFixed(2)}×`
  const hasData    = metaData?.hasData ?? false
  const topCampaign = metaData?.campaigns[0] ?? null
  const criticalAlerts = alerts.filter(a => a.type !== 'ok').length
  const realRoas   = metaData?.realRoas ?? 0

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Agente Meta Ads</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          Converse sobre campanhas, conjuntos e criativos de todas as contas — ele aprende sua estratégia com o tempo.
        </p>
      </div>

      {/* Visão Geral — resumo executivo sempre visível, mesmo período do filtro global do admin */}
      {configured && hasData && metaData ? (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            Visão geral · {range.label}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <OverviewCard
              icon={DollarSign}
              label="Gasto total"
              value={fmtBrl.format(metaData.totalSpend)}
            />
            <OverviewCard
              icon={TrendingUp}
              label="ROAS real"
              value={fmtX(realRoas)}
              color={realRoas > 2 ? '#16a34a' : realRoas < 1 && metaData.totalSpend > 50 ? '#ef4444' : undefined}
            />
            <OverviewCard
              icon={Target}
              label="Top campanha"
              value={topCampaign ? topCampaign.campaignName : '—'}
              sub={topCampaign ? fmtBrl.format(topCampaign.spend) : undefined}
            />
            <OverviewCard
              icon={AlertTriangle}
              label="Alertas"
              value={String(criticalAlerts)}
              color={criticalAlerts > 0 ? '#ef4444' : '#16a34a'}
              sub={criticalAlerts > 0 ? 'precisam de atenção' : 'tudo certo'}
            />
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
          {configured ? 'Sem dados sincronizados nesse período — sincronize em /admin/meta-ads para ver o resumo aqui.' : 'Meta Ads não configurado.'}
        </div>
      )}

      <AgentChat />
    </div>
  )
}
