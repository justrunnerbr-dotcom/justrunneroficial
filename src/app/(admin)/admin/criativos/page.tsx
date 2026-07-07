import { getAdminSupabase } from '@/lib/admin-client'
import Link from 'next/link'
import { Plus, Zap } from 'lucide-react'

async function getCreatives() {
  const db = getAdminSupabase()
  const { data } = await db
    .from('admin_creatives')
    .select('*, product:products(id, name), collection:collections(id, name)')
    .order('created_at', { ascending: false })
  return data ?? []
}

const ANGLE_COLOR: Record<string, string> = {
  'Oferta':     '#f97316',
  'Status':     '#8b5cf6',
  'Dor':        '#ef4444',
  'Identidade': '#3b82f6',
  'Comparação': '#06b6d4',
  'Escassez':   '#f59e0b',
  'UGC':        '#22c55e',
}

export default async function CriativosPage() {
  let creatives: Awaited<ReturnType<typeof getCreatives>> = []
  let tableExists = true

  try {
    creatives = await getCreatives()
  } catch {
    tableExists = false
  }

  if (!tableExists) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Creative Lab</h1>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>Organização de criativos e métricas de anúncios</p>
        </div>

        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#c2410c', marginBottom: '12px' }}>
            Tabela não encontrada no banco de dados
          </h2>
          <p style={{ fontSize: '13px', color: '#78350f', marginBottom: '16px', lineHeight: 1.6 }}>
            Para ativar o Creative Lab, rode o seguinte SQL no Supabase:
          </p>
          <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: '16px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto', lineHeight: 1.7 }}>
{`CREATE TABLE admin_creatives (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  angle         text,
  copy          text,
  headline      text,
  cta           text,
  status        text DEFAULT 'active',
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  cpm           numeric,
  ctr           numeric,
  cpc           numeric,
  atc_rate      numeric,
  ic_rate       numeric,
  cpa           numeric,
  roas          numeric,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);`}
          </pre>
        </div>

        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--admin-accent)', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
        >
          Abrir Supabase SQL Editor
        </a>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Creative Lab</h1>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>{creatives.length} criativo{creatives.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/admin/criativos/novo"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--admin-accent)', color: '#ffffff', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
        >
          <Plus size={14} /> Novo criativo
        </Link>
      </div>

      {creatives.length === 0 ? (
        <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '60px', textAlign: 'center' }}>
          <Zap size={32} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '8px' }}>Nenhum criativo ainda</h3>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '20px' }}>
            Organize seus anúncios, copies e métricas em um só lugar.
          </p>
          <Link
            href="/admin/criativos/novo"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--admin-accent)', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
          >
            <Plus size={14} /> Criar primeiro criativo
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {creatives.map((c: {
            id: string; name: string; angle: string | null; headline: string | null;
            cta: string | null; status: string; roas: number | null; cpa: number | null;
            product?: { name: string } | null; collection?: { name: string } | null;
          }) => (
            <Link key={c.id} href={`/admin/criativos/${c.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '20px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)', flex: 1 }}>{c.name}</div>
                  {c.angle && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                      background: `${ANGLE_COLOR[c.angle] ?? '#94a3b8'}18`,
                      color: ANGLE_COLOR[c.angle] ?? '#94a3b8',
                      marginLeft: '8px', flexShrink: 0,
                    }}>
                      {c.angle}
                    </span>
                  )}
                </div>

                {c.headline && (
                  <div style={{ fontSize: '13px', color: 'var(--admin-text-sec)', marginBottom: '8px', fontWeight: 500 }}>
                    &ldquo;{c.headline}&rdquo;
                  </div>
                )}

                {(c.product || c.collection) && (
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '12px' }}>
                    {c.product?.name ?? c.collection?.name}
                  </div>
                )}

                {(c.roas || c.cpa) && (
                  <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--admin-border)' }}>
                    {c.roas && (
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>{c.roas}x</div>
                        <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>ROAS</div>
                      </div>
                    )}
                    {c.cpa && (
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)' }}>R$ {c.cpa}</div>
                        <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>CPA</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
