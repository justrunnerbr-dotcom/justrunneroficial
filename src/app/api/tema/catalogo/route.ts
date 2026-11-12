import { montarCatalogo } from '@/lib/tema/catalogo'

// Catálogo do tema novo como script (window.JR_REAL = …), lido do banco.
// Cache: guardado na Vercel e refeito a cada 5 min, ou na hora quando o admin
// salva produto/variação/coleção (revalidatePath('/api/tema/catalogo')).
// Banco fora: a Vercel segue entregando a última versão boa; se não houver
// nenhuma (build com banco fora), devolve o arquivo fixo do tema.
export const revalidate = 300

const js = (corpo: string, maxAge: number) => new Response(corpo, {
  headers: {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=86400`,
  },
})

export async function GET() {
  try {
    const cat = await montarCatalogo()
    return js(`/* Catálogo ao vivo (banco), ${new Date().toISOString()}. */\nwindow.JR_REAL = ${JSON.stringify(cat)};\n`, 300)
  } catch (err) {
    console.error('[tema/catalogo] banco falhou:', err instanceof Error ? err.message : err)
    // Fora do build, o erro faz a Vercel manter a versão anterior em cache (melhor que o fixo, que pode estar velho).
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw err
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://justrunner.com.br'
    const fixo = await fetch(`${site}/tema/assets/catalogo-real.json.js`, { cache: 'no-store' }).then(r => (r.ok ? r.text() : null)).catch(() => null)
    if (fixo) return js(`/* Reserva: arquivo fixo (banco fora). */\n${fixo}`, 60)
    return new Response('/* catálogo indisponível */', { status: 503, headers: { 'Content-Type': 'application/javascript; charset=utf-8' } })
  }
}
