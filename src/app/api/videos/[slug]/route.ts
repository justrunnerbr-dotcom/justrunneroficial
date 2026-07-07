import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'

const FOLDER_MAP: Record<string, string> = {
  'dartboard': 'DART-DARTBOARD',
  'double-x': 'DOUBLE X',
  'encoder': 'ENCODER',
  'eye-jacket': 'EYE JACKET',
  'flak-20': 'FLAK',
  'gascan': 'GASCAN',
  'half-jacket': 'HALF JACKET',
  'hstn': 'HSTN',
  'juliet': 'JULIET',
  'm-frame': 'M FRAME',
  'mag-four': 'MAG FOUR',
  'minute': 'MINUTE',
  'penny': 'PENNY',
  'plantaris': 'PLANTARIS',
  'plate': 'PLATE',
  'radar': 'RADAR',
  'romeo-1': 'ROMEO',
  'splice': 'SPLICE',
  'spyke': 'SPYKE',
  'straight-jacket': 'STRAIGHT JACKET'
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const params = await context.params
    const slug = params.slug
    const folderName = FOLDER_MAP[slug] || slug.toUpperCase()
    
    const supabase = getAdminSupabase()
    
    let targetFolder = folderName
    let files = null

    // First try mapped name
    let { data: tryFiles } = await supabase.storage.from('production-videos').list(folderName)
    
    if (tryFiles && tryFiles.length > 0) {
      files = tryFiles
    } else {
      // Try slug
      targetFolder = slug
      let { data: trySlug } = await supabase.storage.from('production-videos').list(slug)
      if (trySlug && trySlug.length > 0) {
        files = trySlug
      } else {
        // Try case-insensitive scan of root
        const { data: rootDirs } = await supabase.storage.from('production-videos').list()
        if (rootDirs) {
          const match = rootDirs.find(d => 
            d.name.toLowerCase() === slug.toLowerCase() || 
            d.name.toLowerCase() === folderName.toLowerCase()
          )
          if (match) {
            targetFolder = match.name
            const { data: matchFiles } = await supabase.storage.from('production-videos').list(match.name)
            if (matchFiles) {
              files = matchFiles
            }
          }
        }
      }
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ videos: [] })
    }

    const videos = files
      .filter(f => f.name.toLowerCase().endsWith('.mp4') || f.name.toLowerCase().endsWith('.mov'))
      .slice(0, 3)
      .map(f => {
        const { data } = supabase.storage.from('production-videos').getPublicUrl(`${targetFolder}/${f.name}`)
        return data.publicUrl
      })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Error reading videos:', error)
    return NextResponse.json({ videos: [] })
  }
}
