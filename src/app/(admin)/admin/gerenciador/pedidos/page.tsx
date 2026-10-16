import { createClient } from '@supabase/supabase-js'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { getPedidosPageData } from '@/lib/admin/gerenciador'
import { checkAuth } from '@/lib/admin/auth'
import { PedidosClient } from './_components/pedidos-client'

export const metadata = { title: 'Pedidos · Lucro · Just Runner Admin' }

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function GerenciadorPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  if (!(await checkAuth())) return null
  const range = getDateRangeFromSearchParams(await searchParams)
  const data  = await getPedidosPageData(getDb(), range)
  return <PedidosClient data={data.pedidos} failedAccounts={data.failedAccounts} rangeLabel={range.label} />
}
