import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'
import { syncCustomerPurchaseStats } from '@/lib/yampi/customer-stats'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

export async function POST() {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const db = getAdminSupabase()
  try {
    const result = await syncCustomerPurchaseStats(db)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
