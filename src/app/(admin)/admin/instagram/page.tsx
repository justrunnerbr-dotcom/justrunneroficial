import { getAdminSupabase } from '@/lib/admin-client'

export const metadata = { title: 'Instagram · Just Runner' }

function tokenExpired(expiresAt: string | null | undefined): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() < Date.now()
}

async function getConfig() {
  const db = getAdminSupabase()
  const { data } = await db.from('ig_config').select('ig_username, profile_picture_url, token_expires_at').eq('id', 1).maybeSingle()
  return data
}

async function eventosRecentes(): Promise<number> {
  const db = getAdminSupabase()
  const { count } = await db.from('ig_events').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
  return count ?? 0
}

const ok: React.CSSProperties = { marginBottom: '16px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '12px 16px', fontSize: '13px', color: 'var(--admin-accent)' }
const erro: React.CSSProperties = { marginBottom: '16px', borderRadius: '10px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', padding: '12px 16px', fontSize: '13px', color: '#dc2626', wordBreak: 'break-word' }

export default async function InstagramAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ conectado?: string; erro?: string; webhook?: string }>
}) {
  const sp = await searchParams
  const [config, eventos] = await Promise.all([getConfig(), eventosRecentes()])
  const tokenVencido = tokenExpired(config?.token_expires_at)

  return (
    <div className="px-4 py-6 md:p-8" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Instagram</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          Conexão da conta para o assistente do direct, stories agendados e feed.
        </p>
      </div>

      {sp.conectado && <div style={ok}>Instagram conectado com sucesso!</div>}
      {sp.webhook && <div style={erro}>Conectado, mas a inscrição do webhook falhou (as DMs não vão chegar): {sp.webhook}</div>}
      {tokenVencido && <div style={erro}>A conexão com o Instagram venceu. Clique em Reconectar.</div>}
      {sp.erro && <div style={erro}>Erro ao conectar: {sp.erro}</div>}

      <div style={{ borderRadius: '14px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)', padding: '18px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {config?.profile_picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.profile_picture_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
        ) : (
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--admin-card-hover)' }} />
        )}
        <div style={{ flex: 1, minWidth: 160 }}>
          {config?.ig_username ? (
            <>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--admin-text-main)' }}>@{config.ig_username}</div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                Token válido até {config.token_expires_at ? new Date(config.token_expires_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'} (renova sozinho toda semana)
                {' · '}{eventos} evento{eventos === 1 ? '' : 's'} do webhook nas últimas 24 h
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
    </div>
  )
}
