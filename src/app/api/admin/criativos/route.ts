import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { checkAuth, unauthorized } from '@/lib/admin/auth'

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
  if (!(await checkAuth())) return unauthorized()

  const root    = path.join(process.cwd(), 'gestor-trafego', 'criativos')
  const imagens = listFiles(path.join(root, 'imagens'), IMAGE_EXTS)
  const videos  = listFiles(path.join(root, 'videos'),  VIDEO_EXTS)

  return NextResponse.json({ imagens, videos })
}
