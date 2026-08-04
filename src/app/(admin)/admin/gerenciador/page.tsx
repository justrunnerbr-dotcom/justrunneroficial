import { createClient } from '@supabase/supabase-js'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { getGerenciadorData } from '@/lib/admin/gerenciador'
import { isMetaConfigured } from '@/lib/admin/meta-ads'
import { GerenciadorClient } from './_components/gerenciador-client'
import { checkAuth } from '@/lib/admin/auth'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function GerenciadorPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  if (!(await checkAuth())) return null

  if (!isMetaConfigured()) {
    return (
      <div style={{ padding: '32px 40px', maxWidth: '1400px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '8px' }}>Gerenciador</h1>
        <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>Meta Ads não está configurado (META_ACCESS_TOKEN / META_AD_ACCOUNT_ID ausente).</p>
      </div>
    )
  }

  const sp    = await searchParams
  const range = getDateRangeFromSearchParams(sp)
  const data  = await getGerenciadorData(getDb(), range)

  return <GerenciadorClient data={data} rangeLabel={range.label} />
}
