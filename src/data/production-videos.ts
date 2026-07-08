// Vídeos de produção no bucket "production-videos" do Supabase Storage.
// Chave = slug da CATEGORIA (collection), não do produto — o vídeo é do
// modelo/linha, compartilhado por todas as variações de cor daquela categoria.
// Counts menores que 3 para categorias com menos vídeos disponíveis.
const VIDEO_COUNTS: Partial<Record<string, number>> = {
  'half-jacket': 1,
  'straight-jacket': 1,
}

const CATEGORY_SLUGS_WITH_VIDEOS = new Set([
  'casual',
  'eye-jacket',
  'flak',
  'half-jacket',
  'hstn',
  'minute',
  'plantaris',
  'radar',
  'straight-jacket',
])

export function getProductionVideos(categorySlug: string | undefined): string[] | null {
  if (!categorySlug || !CATEGORY_SLUGS_WITH_VIDEOS.has(categorySlug)) return null
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/production-videos/${categorySlug}`
  const count = VIDEO_COUNTS[categorySlug] ?? 3
  return Array.from({ length: count }, (_, i) => `${base}/${i + 1}.mp4`)
}
