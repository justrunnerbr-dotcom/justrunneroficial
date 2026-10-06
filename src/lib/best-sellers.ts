// Gerado por scripts/ranking-mais-vendidos.mjs em 2026-10-06 — não editar à mão.
// Modelos ordenados por unidades vendidas na Yampi (pedidos pagos, todo o
// histórico; Oferta Progressiva soma no modelo principal, combos ficam fora).
export const BEST_SELLER_SLUGS: string[] = [
  'flak-preta', // 243
  'eye-jacket-redux', // 207
  'radar-ev-preta', // 197
  'minute-preta', // 166
  'minute-cooper', // 93
  'radar-ev-piet', // 78
  'eye-jacket', // 54
  'hstn-preta', // 23
  'half-jacket', // 22
  'plantaris-preta', // 17
  'radar-ev-cooper', // 16
  'encoder', // 15
  'minute-cristal', // 15
  'hstn-cooper', // 12
  'minute-cinza', // 12
  'eye-jacket-flame', // 11
  'plantaris-matte-bone', // 7
  'plantaris-stonewash', // 7
  'radar-verde', // 7
  'plantaris-verde', // 5
  'flak-branca', // 4
  'radar-ev-kit-de-lentes', // 4
  'straight-jacket-cinza', // 4
  'hstn-cinza', // 3
  'minute-azul', // 3
  'plantaris-podpah', // 3
  'dartboard', // 2
  'radar-ev-bronze', // 2
  'eye-jacket-brain-dead', // 1
  'minute-branca', // 1
  'plantaris-preta-haste-transparente', // 1
  'straight-jacket-cooper', // 1
]

const RANK = new Map(BEST_SELLER_SLUGS.map((slug, i) => [slug, i]))

// Mais vendidos primeiro; quem não vendeu mantém a ordem que já tinha.
export function sortByBestSellers<T extends { slug: string }>(products: T[]): T[] {
  return products
    .map((p, i) => ({ p, i, r: RANK.get(p.slug.replace(/-op$/, '')) ?? Infinity }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(({ p }) => p)
}
