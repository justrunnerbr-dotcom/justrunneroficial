// Best-effort color mapping for variant swatches, based on the real color
// vocabulary used in `variants.name` (frame + lens color combos like
// "Preta Lente Preta", "Cinza Lente Metalic", "Rosa Haste Branca").
// Words not covered here fall back to a neutral gray dot.

const COLOR_KEYWORDS: Record<string, string> = {
  // multi-word combos (checked before their single-word parts)
  'dark ruby': '#6b0f1a',
  'gold café': '#a67c3d',
  'rosa claro': '#f9a8d4',
  'azul bebe': '#a7d8f0',
  'azul escuro': '#1e3a8a',
  '24k gold': '#c9a227',

  // frame / lens colors
  '24k': '#c9a227',
  areia: '#d8c39d',
  azul: '#2563eb',
  bege: '#e8d9b5',
  branca: '#f4f4f5',
  branco: '#f4f4f5',
  bronze: '#8c6239',
  café: '#6f4e37',
  cinza: '#8b8f94',
  cooper: '#b56a45',
  degrade: '#9ca3af',
  espelhada: '#c7d2e0',
  gold: '#c9a227',
  laranja: '#f97316',
  'low light': '#4b4038',
  marrom: '#6f4e37',
  matte: '#52525b',
  metalic: '#b0b0b0',
  'metálica': '#b0b0b0',
  plasma: '#ff2d78',
  preta: '#1c1c1e',
  preto: '#1c1c1e',
  prizm: '#8a5a2b',
  roxa: '#7c3aed',
  roxo: '#7c3aed',
  rosa: '#ec4899',
  ruby: '#9b111e',
  sapphire: '#0f52ba',
  silver: '#c0c0c0',
  tanzanite: '#4b3f72',
  torch: '#ff6a00',
  transparente: '#e5e7eb',
  verde: '#16a34a',
  vr28: '#6b5b95',
  xmetal: '#b8bcc2',
}

const SORTED_KEYWORDS = Object.entries(COLOR_KEYWORDS).sort((a, b) => b[0].length - a[0].length)

const FALLBACK_COLOR = '#c4c4c4'

function resolveColor(text: string): string {
  const normalized = text.toLowerCase()
  for (const [keyword, hex] of SORTED_KEYWORDS) {
    if (normalized.includes(keyword)) return hex
  }
  return FALLBACK_COLOR
}

export interface VariantSwatchColors {
  primary: string
  secondary: string
}

/**
 * Splits a variant name into a frame ("primary") and lens ("secondary")
 * color, using "Lente"/"Haste" as the split marker when present. Names
 * without a marker (e.g. "VR28", "Xmetal") resolve to a single uniform
 * color for both halves.
 */
export function getVariantSwatchColors(name: string): VariantSwatchColors {
  const lower = name.toLowerCase()
  const splitMatch = lower.match(/\b(lente|haste)\b/)

  if (!splitMatch || splitMatch.index === undefined) {
    const color = resolveColor(lower)
    return { primary: color, secondary: color }
  }

  const before = lower.slice(0, splitMatch.index)
  const after = lower.slice(splitMatch.index + splitMatch[0].length)
  const primary = before.trim() ? resolveColor(before) : FALLBACK_COLOR
  const secondary = after.trim() ? resolveColor(after) : FALLBACK_COLOR
  return { primary, secondary }
}
