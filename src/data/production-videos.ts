// Slugs com vídeos no bucket "production-videos" do Supabase Storage.
// Counts menores que 3 para produtos com menos vídeos disponíveis.
const VIDEO_COUNTS: Partial<Record<string, number>> = {
  encoder:          2,
  'half-jacket':    1,
  'straight-jacket':1,
}

const SLUGS_WITH_VIDEOS = new Set([
  'dart',
  'dartboard',
  'double-x',
  'encoder',
  'eye-jacket',
  'eye-jacket-brain-dead',
  'eye-jacket-flame',
  'eye-jacket-guadalupe',
  'eye-jacket-redux',
  'flak-20',
  'half-jacket',
  'hstn',
  'juliet',
  'm-frame',
  'mag-four',
  'minute',
  'penny',
  'permian',
  'plantaris',
  'plate',
  'radar',
  'romeo-1',
  'splice',
  'spyke',
  'straight-jacket',
])

export function getProductionVideos(slug: string): string[] | null {
  if (!SLUGS_WITH_VIDEOS.has(slug)) return null
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/production-videos/${slug}`
  const count = VIDEO_COUNTS[slug] ?? 3
  return Array.from({ length: count }, (_, i) => `${base}/${i + 1}.mp4`)
}
