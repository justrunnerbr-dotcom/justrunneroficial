import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAuth } from '@/lib/admin/auth'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

// PATCH — update status (acknowledge, resolve, dismiss)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  const body   = await request.json()
  const { status, outcome } = body as { status: string; outcome?: string }

  const allowed = ['acknowledged', 'resolved', 'dismissed']
  if (!allowed.includes(status)) {
    return NextResponse.json({ ok: false, error: 'status inválido' }, { status: 400 })
  }

  const db = getDb()
  const { error } = await db
    .from('brain_recommendations')
    .update({
      status,
      outcome:     outcome ?? null,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
