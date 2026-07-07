import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.webm']

function listFiles(dir: string, exts: string[]) {
  try {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => exts.includes(path.extname(f).toLowerCase()))
      .map(f => ({ name: f, path: path.join(dir, f), size: fs.statSync(path.join(dir, f)).size }))
  } catch {
    return []
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  if (!secret || token !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const root    = path.join(process.cwd(), 'gestor-trafego', 'criativos')
  const imagens = listFiles(path.join(root, 'imagens'), IMAGE_EXTS)
  const videos  = listFiles(path.join(root, 'videos'),  VIDEO_EXTS)

  return NextResponse.json({ imagens, videos })
}
