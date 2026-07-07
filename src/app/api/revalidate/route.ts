import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { path, tag } = body as { path?: string; tag?: string }

    if (path) {
      revalidatePath(path)
      return NextResponse.json({ revalidated: true, path })
    }

    if (tag) {
      revalidateTag(tag, {})
      return NextResponse.json({ revalidated: true, tag })
    }

    // Revalidate everything
    revalidatePath('/', 'layout')
    return NextResponse.json({ revalidated: true, scope: 'all' })
  } catch {
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 })
  }
}
