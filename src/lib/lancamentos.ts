// Vitrine "Lançamentos" — curadoria manual pedida pelo usuário (2026-10-06).
// Não é uma collection do banco: cada produto continua na categoria do modelo
// (Radar, M Frame...), e esta lista só aponta qual produto/variação mostrar, na
// ordem da pasta LANÇAMENTOS que ele enviou. Aparece na home logo abaixo de
// Combos e em /colecao/lancamentos.
export const LANCAMENTOS_SLUG = 'lancamentos'
export const LANCAMENTOS_TITLE = 'Lançamentos'

export const LANCAMENTOS: { collectionSlug: string; productSlug: string; variantId: string }[] = [
  { collectionSlug: '1311', productSlug: '1311-cinza', variantId: '2b64b364-1d35-4e15-bb02-268b34904ee0' }, // Lente Espelhada
  { collectionSlug: '1311', productSlug: '1311-cinza', variantId: '99feb58e-1172-4848-8873-dde13c0d5e43' }, // Lente Preta
  { collectionSlug: 'ellipse', productSlug: 'ellipse-preta', variantId: '5bd5ba7c-5194-47b2-b47f-434507a4db75' }, // Lente Preta
  { collectionSlug: 'encoder', productSlug: 'encoder', variantId: 'f8bd1a2d-e477-4641-b6e0-e5819f871a9c' }, // Espelhada
  { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-cooper', variantId: 'e557c717-e2b5-4e48-8d76-87c2406b00cf' }, // Único
  { collectionSlug: 'm-frame', productSlug: 'm-frame-preta', variantId: '884bdb82-173b-4463-9ade-394c3bd36fbb' }, // Lente Torch
  { collectionSlug: 'm-frame', productSlug: 'm-frame-x-metal', variantId: '2a4d81ec-bcaf-4bfc-912c-f6b59a824626' }, // Lente Gold Café
  { collectionSlug: 'minute', productSlug: 'minute-verde', variantId: 'f26a2fa7-b945-4e3e-820d-bfcf9972dc88' }, // Lente Preta
  { collectionSlug: 'monster-dog', productSlug: 'monster-dog-marrom', variantId: '7e12b517-b1b3-4cbc-84af-61aa29970def' }, // Lente VR28
  { collectionSlug: 'plantaris', productSlug: 'plantaris-piet', variantId: '9e614b1f-086a-4f96-8b45-7fb1dbac7b73' }, // Único
  { collectionSlug: 'plantaris', productSlug: 'plantaris-squared-preta', variantId: '64446867-c8aa-4e25-9949-c43acbaaa29f' }, // Único
  { collectionSlug: 'radar', productSlug: 'radar-ev-neon', variantId: '895ca13f-f8e2-4898-9e9e-9e7630636fcb' }, // Lente Torch
  { collectionSlug: 'radar', productSlug: 'radar-ev-piet', variantId: 'c94016a6-25dd-4d5a-89bd-5a71791f05c6' }, // Lente Gold
  { collectionSlug: 'radar', productSlug: 'radar-ev-thieves', variantId: '85ff12f8-cc90-4b09-9bde-f89b3d4e8399' }, // Lente Ruby + Kit Vermelho (09/10)
  { collectionSlug: 'radar', productSlug: 'radar-ev-thieves-branca', variantId: '52341214-b2a3-48e2-bcb2-18cdf021da65' }, // Lente Ruby + Kit Vermelho (09/10)
  { collectionSlug: 'soto', productSlug: 'soto-carbon', variantId: 'cd9f8e56-82ec-4c9a-b604-9aa4e0f917f9' }, // Lente Preta
]

export const LANCAMENTOS_BANNER = {
  desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_lancamentos.jpg',
  mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_lancamentos_mobile.jpg',
}
