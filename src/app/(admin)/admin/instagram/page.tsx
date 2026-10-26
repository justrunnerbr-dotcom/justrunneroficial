import Link from 'next/link'
import { getAdminSupabase } from '@/lib/admin-client'
import { listAutomations } from '@/lib/ig/automations'
import { ToggleButton, DeleteButton } from './_components/row-actions'
import { MenuForm } from './_components/menu-form'
import { getMenuConfig } from '@/lib/ig/menu'
import { searchCatalog } from '@/lib/ig/catalog-search'

export const metadata = { title: 'Instagram · Just Runner' }

/** Respostas do assistente por ação nos últimos 7 dias (um lote de mensagens conta uma vez). */
async function acoesAssistente(): Promise<{ action: string; n: number }[]> {
  const db = getAdminSupabase()
  const { data } = await db.from('ig_queue').select('payload->_bot, status')
    .is('automation_id', null).gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()).limit(10000)
  const n: Record<string, number> = {}
  for (const r of (data ?? []) as { _bot: { action?: string; part?: boolean; followup?: boolean } | null; status: string }[]) {
    const b = r._bot
    if (!b?.action || b.part) continue
    if (b.followup && r.status !== 'sent') continue // lembrete só conta se saiu
    n[b.action] = (n[b.action] ?? 0) + 1
  }
  return Object.entries(n).map(([action, k]) => ({ action, n: k })).sort((a, b) => b.n - a.n)
}

function tokenExpired(expiresAt: string | null | undefined): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() < Date.now()
}

async function getConfig() {
  const db = getAdminSupabase()
  const { data } = await db.from('ig_config').select('*').eq('id', 1).single()
  return data
}

export default async function InstagramAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ conectado?: string; erro?: string; webhook?: string; menu?: string; q?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const [config, automations, menu, acoes, busca] = await Promise.all([getConfig(), listAutomations(), getMenuConfig(), acoesAssistente(), q ? searchCatalog(q, 10) : Promise.resolve(null)])
  const tokenVencido = tokenExpired(config?.token_expires_at)

  return (
    <div className="px-4 py-6 md:p-8" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Instagram — Automação</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          Comentário ou resposta de story vira DM automática com o seu link — sem mensalidade, sem disparo em massa.
        </p>
      </div>

      {sp.conectado && (
        <div style={{ marginBottom: '16px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '12px 16px', fontSize: '13px', color: 'var(--admin-accent)' }}>
          Instagram conectado com sucesso!
        </div>
      )}
      {sp.webhook && (
        <div style={{ marginBottom: '16px', borderRadius: '10px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', padding: '12px 16px', fontSize: '13px', color: '#dc2626', wordBreak: 'break-word' }}>
          Conectado, mas a inscrição do webhook falhou (as DMs não vão chegar): {sp.webhook}
        </div>
      )}
      {sp.menu && (
        <div style={{ marginBottom: '16px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '12px 16px', fontSize: '13px', color: 'var(--admin-accent)' }}>
          Assistente salvo.
        </div>
      )}
      {tokenVencido && (
        <div style={{ marginBottom: '16px', borderRadius: '10px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
          A conexão com o Instagram venceu: nenhuma DM automática está saindo. Clique em Reconectar.
        </div>
      )}
      {sp.erro && (
        <div style={{ marginBottom: '16px', borderRadius: '10px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
          Erro ao conectar: {sp.erro}
        </div>
      )}

      {/* ── Card de conexão ── */}
      <div style={{ borderRadius: '14px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)', padding: '18px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {config?.profile_picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.profile_picture_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
        ) : (
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--admin-card-hover)' }} />
        )}
        <div style={{ flex: 1 }}>
          {config?.ig_username ? (
            <>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--admin-text-main)' }}>@{config.ig_username}</div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                Token válido até {config.token_expires_at ? new Date(config.token_expires_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--admin-text-sec)' }}>Instagram ainda não conectado</div>
          )}
        </div>
        <a
          href="/api/ig/oauth/start"
          style={{ borderRadius: '8px', background: 'var(--admin-accent)', color: '#fff', fontSize: '13px', fontWeight: 700, padding: '9px 16px', textDecoration: 'none' }}
        >
          {config?.ig_username ? 'Reconectar' : 'Conectar Instagram'}
        </a>
      </div>

      <MenuForm cfg={menu} acoes={acoes} q={q} busca={busca} />

      {/* ── Automações ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)' }}>Automações</h2>
        <Link href="/admin/instagram/automacoes/nova" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-accent)', textDecoration: 'none' }}>
          + Nova automação
        </Link>
      </div>

      {automations.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', padding: '32px 0', textAlign: 'center', border: '1px dashed var(--admin-border)', borderRadius: '14px' }}>
          Nenhuma automação ainda. Crie a primeira.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {automations.map(a => (
            <div key={a.id} style={{ borderRadius: '14px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--admin-text-main)' }}>{a.name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                  {[a.trigger_comment && 'comentário', a.trigger_story_reply && 'story', a.trigger_dm && 'DM'].filter(Boolean).join(' · ') || 'sem gatilho'}
                  {' — '}
                  {a.match_type === 'any' ? 'qualquer texto' : a.keywords.join(', ') || 'sem palavra-chave'}
                </div>
              </div>
              <ToggleButton id={a.id} active={a.active} />
              <Link href={`/admin/instagram/automacoes/${a.id}`} style={{ fontSize: '13px', color: 'var(--admin-text-sec)', textDecoration: 'none' }}>Editar</Link>
              <DeleteButton id={a.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
