import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, status, featured, collection_id } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  const slug = body.slug?.trim() || slugify(name)

  const db = getAdminSupabase()

  // Check slug uniqueness
  const { data: existing } = await db.from('products').select('id').eq('slug', slug).single()
  if (existing) {
    return NextResponse.json(
      { error: `Slug "${slug}" já existe. Escolha outro.` },
      { status: 409 },
    )
  }

  const { data, error } = await db
    .from('products')
    .insert({
      name:          name.trim(),
      slug,
      description:   description ?? null,
      status:        status ?? 'draft',
      featured:      featured ?? false,
      collection_id: collection_id || null,
      created_at:    new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
