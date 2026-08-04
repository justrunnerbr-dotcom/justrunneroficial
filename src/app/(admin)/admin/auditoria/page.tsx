import { ScrollText, AlertTriangle } from 'lucide-react'
import { checkAuth } from '@/lib/admin/auth'
import { getRecentAudit, type AuditRow } from '@/lib/admin/audit'

export const dynamic = 'force-dynamic'

const COLORS = {
  card:      'var(--admin-card)',
  border:    'var(--admin-border)',
  textMain:  'var(--admin-text-main)',
  textSec:   'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
}

// Rótulos legíveis por ação. O valor cru fica de reserva pra ações novas que
// ainda não tenham tradução aqui.
const ACOES: Record<string, { label: string; tom: string }> = {
  login_ok:              { label: 'Entrou',             tom: '#16a34a' },
  login_falhou:          { label: 'Login falhou',       tom: '#dc2626' },
  logout:                { label: 'Saiu',               tom: 'var(--admin-text-muted)' },
  campanha_status:       { label: 'Campanha',           tom: '#f59e0b' },
  campanha_criada:       { label: 'Campanha criada',    tom: '#f59e0b' },
  custo_produto:         { label: 'Custo de produto',   tom: '#8b5cf6' },
  custo_config:          { label: 'Parâmetro de custo', tom: '#8b5cf6' },
  config_alterada:       { label: 'Configuração',       tom: '#0ea5e9' },
  produto_editado:       { label: 'Produto',            tom: '#0ea5e9' },
  produto_criado:        { label: 'Produto criado',     tom: '#0ea5e9' },
  variante_editada:      { label: 'Variação',           tom: '#0ea5e9' },
  pedido_sync:           { label: 'Sync de pedidos',    tom: '#64748b' },
  pedido_custo_override: { label: 'Custo do pedido',    tom: '#8b5cf6' },
  mapeamento_legado:     { label: 'Mapeamento legado',  tom: '#8b5cf6' },
  cliente_contatado:     { label: 'Cliente contatado',  tom: '#16a34a' },
}

function fmtQuando(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function Linha({ r }: { r: AuditRow }) {
  const acao = ACOES[r.action] ?? { label: r.action, tom: 'var(--admin-text-muted)' }

  return (
    <tr style={{ borderTop: `1px solid ${COLORS.border}` }}>
      <td style={{ padding: '10px 12px', fontSize: '12px', color: COLORS.textMuted, whiteSpace: 'nowrap' }}>
        {fmtQuando(r.created_at)}
      </td>
      <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: COLORS.textMain }}>
        {r.actor}
      </td>
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: acao.tom,
          textTransform: 'uppercase', letterSpacing: '0.3px',
        }}>
          {acao.label}
        </span>
      </td>
      <td style={{ padding: '10px 12px', fontSize: '13px', color: COLORS.textSec }}>
        {r.summary ?? '—'}
      </td>
      <td style={{ padding: '10px 12px', fontSize: '11px', color: COLORS.textMuted, fontFamily: 'monospace' }}>
        {r.ip ?? '—'}
      </td>
    </tr>
  )
}

export default async function AuditoriaPage() {
  if (!(await checkAuth())) return null

  const { rows, available } = await getRecentAudit(300)

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.textMain, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ScrollText size={22} /> Auditoria
        </h1>
        <p style={{ fontSize: '14px', color: COLORS.textMuted }}>
          Quem fez o quê no painel · últimas {rows.length} ações
        </p>
      </div>

      {!available && (
        <div style={{
          padding: '16px 20px', borderRadius: '12px', marginBottom: '20px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          fontSize: '13px', color: COLORS.textMain, lineHeight: 1.6,
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={16} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>A tabela de auditoria ainda não existe no banco.</strong> As ações estão
            acontecendo normalmente, mas nada está sendo registrado. Rodar a migration
            <code style={{ margin: '0 4px' }}>20260802000002_admin_audit_log.sql</code>
            no SQL Editor do Supabase resolve.
          </div>
        </div>
      )}

      {available && rows.length === 0 && (
        <div style={{
          padding: '32px', textAlign: 'center', borderRadius: '14px',
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          fontSize: '14px', color: COLORS.textMuted,
        }}>
          Nenhuma ação registrada ainda. O histórico começa a partir de agora.
        </div>
      )}

      {rows.length > 0 && (
        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: '14px', overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead>
                <tr>
                  {['Quando', 'Quem', 'Ação', 'O quê', 'IP'].map(h => (
                    <th key={h} style={{
                      padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
                      color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => <Linha key={r.id} r={r} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
