import { Activity, CheckCircle2, AlertTriangle, XCircle, Database } from 'lucide-react'
import { getSystemHealth, type SourceHealth } from '@/lib/admin/health'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { checkAuth } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

const COLORS = {
  card:      'var(--admin-card)',
  border:    'var(--admin-border)',
  textMain:  'var(--admin-text-main)',
  textSec:   'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
}

const TONE = {
  ok:             { fg: '#16a34a', bg: 'rgba(34,197,94,0.10)',  br: 'rgba(34,197,94,0.30)'  },
  error:          { fg: '#dc2626', bg: 'rgba(239,68,68,0.10)',  br: 'rgba(239,68,68,0.30)'  },
  not_configured: { fg: '#b45309', bg: 'rgba(245,158,11,0.10)', br: 'rgba(245,158,11,0.30)' },
} as const

const STATUS_TEXT = {
  ok:             'Operando',
  error:          'Indisponível',
  not_configured: 'Não configurado',
} as const

function fmtHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function SourceCard({ s }: { s: SourceHealth }) {
  // "Parcial" é um estado próprio: a fonte respondeu, mas não por inteiro.
  // Mostrar isso como "Operando" seria exatamente o tipo de meia-verdade que
  // esta tela existe pra eliminar.
  const tone   = s.partial ? TONE.not_configured : TONE[s.status]
  const rotulo = s.partial ? 'Parcial' : STATUS_TEXT[s.status]
  const Icon   = s.partial
    ? AlertTriangle
    : s.status === 'ok' ? CheckCircle2 : s.status === 'error' ? XCircle : AlertTriangle

  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${tone.br}`, borderRadius: '14px',
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textMain }}>{s.label}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700,
          padding: '4px 10px', borderRadius: '99px', background: tone.bg, color: tone.fg,
          border: `1px solid ${tone.br}`, textTransform: 'uppercase', letterSpacing: '0.4px',
        }}>
          <Icon size={12} /> {rotulo}
        </span>
      </div>

      <div style={{ fontSize: '13px', color: COLORS.textSec, fontFamily: 'monospace' }}>
        {s.sample ?? '—'}
      </div>

      {s.detail && (
        <div style={{
          fontSize: '12px', color: tone.fg, lineHeight: 1.5, wordBreak: 'break-word',
          background: tone.bg, border: `1px solid ${tone.br}`, borderRadius: '8px', padding: '8px 10px',
        }}>
          {s.detail}
        </div>
      )}

      <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
        Verificado às {fmtHora(s.checkedAt)}
      </div>
    </div>
  )
}

export default async function SaudePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!(await checkAuth())) return null

  const sp     = await searchParams
  const range  = getDateRangeFromSearchParams(sp)
  const health = await getSystemHealth(range.start, range.endExclusive)

  const broken = health.sources.filter(s => s.status !== 'ok' || s.partial)
  const tudoOk = broken.length === 0 && health.missingTables.length === 0

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.textMain, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={22} /> Saúde do Sistema
        </h1>
        <p style={{ fontSize: '14px', color: COLORS.textMuted }}>
          Dá pra confiar nos números do painel agora? · período {range.label}
        </p>
      </div>

      <div style={{
        marginBottom: '28px', padding: '16px 20px', borderRadius: '12px',
        background: tudoOk ? TONE.ok.bg : TONE.error.bg,
        border: `1px solid ${tudoOk ? TONE.ok.br : TONE.error.br}`,
        fontSize: '14px', color: COLORS.textMain, lineHeight: 1.6,
      }}>
        {tudoOk ? (
          <><strong>Todas as fontes respondendo.</strong> Os valores de receita, investimento, lucro e CPA estão completos.</>
        ) : (
          <>
            <strong>Atenção: {broken.length > 0 ? `${broken.length} fonte(s) com problema` : 'estrutura incompleta'}.</strong>{' '}
            {broken.length > 0 && (
              <>Enquanto {broken.map(b => b.label).join(' e ')} não responder(em), o investimento exibido está
              subestimado — e portanto Lucro Líquido, ROAS e margem aparecem melhores do que são, e o CPA
              aparece menor. </>
            )}
            {health.missingTables.length > 0 && (
              <>{health.missingTables.length} tabela(s) esperada(s) não existem no banco: a tela que depende
              delas falha em silêncio.</>
            )}
          </>
        )}
      </div>

      <h2 style={{ fontSize: '13px', fontWeight: 700, color: COLORS.textSec, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
        Fontes de dados
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '14px', marginBottom: '32px' }}>
        {health.sources.map(s => <SourceCard key={s.key} s={s} />)}
      </div>

      <h2 style={{ fontSize: '13px', fontWeight: 700, color: COLORS.textSec, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Database size={14} /> Estrutura do banco
      </h2>
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '18px 20px',
      }}>
        {health.missingTables.length === 0 ? (
          <div style={{ fontSize: '13px', color: COLORS.textSec }}>
            As {health.tablesChecked} tabelas usadas pelo código existem no banco.
          </div>
        ) : (
          <>
            <div style={{ fontSize: '13px', color: TONE.error.fg, marginBottom: '12px', lineHeight: 1.6 }}>
              {health.missingTables.length} de {health.tablesChecked} tabelas não existem — provável migration
              não executada no SQL Editor do Supabase. As telas que dependem delas não mostram erro: o cliente
              devolve vazio e o código segue como se não houvesse dado.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {health.missingTables.map(t => (
                <div key={t.name} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px',
                  padding: '8px 12px', borderRadius: '8px',
                  background: TONE.error.bg, border: `1px solid ${TONE.error.br}`,
                }}>
                  <XCircle size={13} color={TONE.error.fg} />
                  <code style={{ fontWeight: 700, color: COLORS.textMain }}>{t.name}</code>
                  <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>{t.error}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '11px', color: COLORS.textMuted }}>
        Gerado em {fmtHora(health.generatedAt)} · esta página consulta as fontes ao vivo a cada carregamento
      </div>
    </div>
  )
}
