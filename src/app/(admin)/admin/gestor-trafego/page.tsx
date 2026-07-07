import { cookies } from 'next/headers'
import Link from 'next/link'
import { checkAdsManagement, getMetaCreateConfig } from '@/lib/admin/meta-create'
import { Plus, CheckCircle2, XCircle, AlertTriangle, Megaphone, FolderOpen, ArrowRight } from 'lucide-react'

export default async function GestorTrafego() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  if (!secret || token !== secret) return null

  const cfg        = getMetaCreateConfig()
  const permCheck  = cfg ? await checkAdsManagement() : { ok: false, permissions: [] }
  const hasToken   = !!process.env.META_ACCESS_TOKEN
  const hasAccount = !!(process.env.META_AD_ACCOUNT_ID_1 || process.env.META_AD_ACCOUNT_ID_2 || process.env.META_AD_ACCOUNT_ID_3)
  const hasPage    = !!(process.env.META_PAGE_ID_1 || process.env.META_PAGE_ID_2)
  const canCreate  = cfg !== null && permCheck.ok

  const accountCount = [process.env.META_AD_ACCOUNT_ID_1, process.env.META_AD_ACCOUNT_ID_2, process.env.META_AD_ACCOUNT_ID_3].filter(Boolean).length
  const pageCount    = [process.env.META_PAGE_ID_1, process.env.META_PAGE_ID_2].filter(Boolean).length

  const checks = [
    { label: 'META_ACCESS_TOKEN',        ok: hasToken,    fix: 'Token de acesso Meta configurado no Vercel' },
    { label: `Contas (${accountCount}/3)`, ok: hasAccount, fix: 'META_AD_ACCOUNT_ID_1/2/3 — IDs das contas de anúncios' },
    { label: `Páginas (${pageCount}/2)`,   ok: hasPage,    fix: 'META_PAGE_ID_1/2 — IDs das Páginas do Facebook' },
    { label: 'ads_management',           ok: permCheck.ok, fix: 'Permissão de escrita no token — gere novo token com ads_management' },
  ]

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1100px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)' }}>Gestor de Tráfego</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--admin-text-muted)' }}>
            Crie campanhas, conjuntos e anúncios direto do projeto — tudo pausado até você ativar no Meta.
          </p>
        </div>
        {canCreate && (
          <Link href="/admin/gestor-trafego/nova-campanha" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--admin-accent)', color: '#fff', textDecoration: 'none',
            padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
          }}>
            <Plus size={16} /> Nova Campanha
          </Link>
        )}
      </div>

      {/* Status de configuração */}
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Status de Configuração
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {checks.map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {c.ok
                ? <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                : <XCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />}
              <code style={{ fontSize: '12px', fontWeight: 600, color: c.ok ? 'var(--admin-text-main)' : '#ef4444', minWidth: '200px' }}>{c.label}</code>
              {!c.ok && <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>→ {c.fix}</span>}
            </div>
          ))}
        </div>

        {!permCheck.ok && hasToken && (
          <div style={{ marginTop: '20px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} /> Token sem ads_management — siga os passos abaixo
            </div>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--admin-text-sec)', lineHeight: 2 }}>
              <li>Acesse <strong>Meta Business Manager → Configurações → Usuários do Sistema</strong></li>
              <li>Selecione o usuário do sistema que gerou o token atual</li>
              <li>Clique em <strong>Gerar novo token</strong></li>
              <li>Marque as permissões: <code>ads_management</code>, <code>ads_read</code>, <code>pages_read_engagement</code></li>
              <li>Copie o novo token e atualize <code>META_ACCESS_TOKEN</code> no Vercel → Settings → Env Vars</li>
              <li>Adicione também <code>META_PAGE_ID</code> (ID da sua Página do Facebook)</li>
              <li>Faça redeploy e volte aqui</li>
            </ol>
          </div>
        )}

        {canCreate && (
          <div style={{ marginTop: '16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={15} />
            Tudo configurado — pronto para criar campanhas.
          </div>
        )}
      </div>

      {/* Pasta de criativos */}
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <FolderOpen size={18} color="var(--admin-accent)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pasta de Criativos (Local)</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--admin-text-sec)', margin: '0 0 12px', lineHeight: 1.6 }}>
          Coloque seus criativos nas pastas abaixo dentro do projeto. Eles serão listados automaticamente no wizard de criação de campanha.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Imagens', path: 'gestor-trafego/criativos/imagens/', exts: 'jpg, jpeg, png, webp' },
            { label: 'Vídeos',  path: 'gestor-trafego/criativos/videos/',  exts: 'mp4, mov, webm' },
          ].map(f => (
            <div key={f.label} style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>{f.label}</div>
              <code style={{ fontSize: '11px', color: 'var(--admin-accent)', display: 'block', marginBottom: '4px' }}>{f.path}</code>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Formatos: {f.exts}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Como funciona */}
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Megaphone size={18} color="var(--admin-accent)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Como Funciona</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { n: 1, t: 'Adicione criativos',    d: 'Arraste imagens/vídeos para as pastas locais do projeto' },
            { n: 2, t: 'Configure a campanha',  d: 'Nome, objetivo (Vendas / Tráfego), orçamento e público-alvo' },
            { n: 3, t: 'Escolha o criativo',    d: 'Selecione o arquivo da pasta local e escreva o copy do anúncio' },
            { n: 4, t: 'Criar tudo pausado',    d: 'Campanha + conjunto + anúncio criados no Meta em estado PAUSADO' },
            { n: 5, t: 'Ative quando quiser',   d: 'Revise no Gerenciador de Anúncios do Meta e ative com 1 clique' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(var(--admin-accent-rgb),0.15)', color: 'var(--admin-accent)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>{s.t}</div>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        {canCreate && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--admin-border)' }}>
            <Link href="/admin/gestor-trafego/nova-campanha" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'var(--admin-accent)', color: '#fff', textDecoration: 'none',
              padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
            }}>
              Criar primeira campanha <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}
