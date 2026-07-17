'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import type { CostSettings } from '@/lib/admin/cost-settings'

const inputStyle: React.CSSProperties = {
  background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px',
  padding: '8px 10px', fontSize: '13px', color: 'var(--admin-text-main)', width: '110px',
}
const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '14px' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{children}</div>
    </div>
  )
}

function Field({ label, hint, value, onChange, suffix }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; suffix?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '13px', color: 'var(--admin-text-main)' }}>{label}</div>
        {hint && <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input style={inputStyle} value={value} inputMode="decimal" onChange={e => onChange(e.target.value)} />
        {suffix && <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>{suffix}</span>}
      </div>
    </div>
  )
}

export function IntegrationsManager({ settings }: { settings: CostSettings }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [yampiFeePct, setYampiFeePct]           = useState(String(settings.yampi_fee_pct))
  const [pixPct, setPixPct]                     = useState(String(settings.appmax_pix_pct))
  const [pixFixed, setPixFixed]                 = useState(String(settings.appmax_pix_fixed))
  const [cardPct, setCardPct]                   = useState(String(settings.appmax_card_pct))
  const [boletoFixed, setBoletoFixed]           = useState(String(settings.appmax_boleto_fixed))
  const [gatewayFixed, setGatewayFixed]         = useState(String(settings.appmax_gateway_fixed))
  const [installmentPct, setInstallmentPct]     = useState(String(settings.appmax_installment_pct))
  const [defaultInstallments, setDefaultInstallments] = useState(String(settings.default_installments))
  const [freteGratisCusto, setFreteGratisCusto] = useState(String(settings.frete_gratis_custo))

  async function handleSave() {
    setLoading(true); setError(null); setSaved(false)
    try {
      const parse = (v: string) => parseFloat(v.replace(',', '.'))
      const res = await fetch('/api/admin/cost-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yampi_fee_pct: parse(yampiFeePct),
          appmax_pix_pct: parse(pixPct),
          appmax_pix_fixed: parse(pixFixed),
          appmax_card_pct: parse(cardPct),
          appmax_boleto_fixed: parse(boletoFixed),
          appmax_gateway_fixed: parse(gatewayFixed),
          appmax_installment_pct: parse(installmentPct),
          default_installments: parseInt(defaultInstallments, 10),
          frete_gratis_custo: parse(freteGratisCusto),
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Erro ao salvar.'); return }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginBottom: '20px' }}>
        Taxas reais do gateway (AppMax) e do checkout (Yampi), usadas pra calcular a margem líquida
        em &quot;Pedidos × Custo&quot;. Ajuste quando o AppMax ou a Yampi mudarem os planos.
      </p>

      <Card title="Yampi (checkout)">
        <Field label="Taxa por pedido pago" hint="Cobrada semanalmente pela Yampi, plano Basic" value={yampiFeePct} onChange={setYampiFeePct} suffix="%" />
      </Card>

      <Card title="AppMax (gateway de pagamento)">
        <Field label="Pix — percentual" value={pixPct} onChange={setPixPct} suffix="%" />
        <Field label="Pix — fixo" value={pixFixed} onChange={setPixFixed} suffix="R$" />
        <Field label="Cartão de crédito" hint="Recebimento no dia seguinte (antecipado)" value={cardPct} onChange={setCardPct} suffix="%" />
        <Field label="Boleto — fixo" value={boletoFixed} onChange={setBoletoFixed} suffix="R$" />
        <Field label="Gateway e Antifraude" hint="Cobrado em toda transação aprovada, qualquer método" value={gatewayFixed} onChange={setGatewayFixed} suffix="R$" />
        <Field label="Taxa de parcelamento" hint="Por parcela além da 1ª, só cartão (ex: 3x = +2 parcelas)" value={installmentPct} onChange={setInstallmentPct} suffix="p.p." />
        <Field label="Parcelas oferecidas sem juros" hint="Usado pra estimar a taxa dos pedidos sincronizados da Yampi (não sabemos quantas parcelas o cliente escolheu)" value={defaultInstallments} onChange={setDefaultInstallments} suffix="x" />
      </Card>

      <Card title="Frete">
        <Field label="Custo do frete grátis" hint="Quando o cliente não paga frete, esse é o custo real assumido pela loja" value={freteGratisCusto} onChange={setFreteGratisCusto} suffix="R$" />
      </Card>

      {error && <div style={{ color: 'var(--admin-red)', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      <button style={btnStyle} disabled={loading} onClick={handleSave}>
        <Save size={14} /> {loading ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar configurações'}
      </button>
    </div>
  )
}
