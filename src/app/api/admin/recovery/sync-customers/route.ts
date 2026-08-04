import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { syncCustomerPurchaseStats } from '@/lib/yampi/customer-stats'
import { checkAuth } from '@/lib/admin/auth'

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
