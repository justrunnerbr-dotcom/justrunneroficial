// Loader customizado do next/image.
//
// Por quê: o otimizador da Vercel (/_next/image) passou a responder
// 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED — a cota de otimização de
// imagem da conta estourou. Transformações já cacheadas continuavam servindo,
// mas qualquer imagem nova (ou variação de largura ainda não gerada) quebrava.
// Na prática: a categoria Combos, toda feita de fotos novas, quebrou 100%, e a
// home já estava com dezenas de <img> quebradas pelo mesmo motivo.
//
// A saída é usar o transformador nativo do Storage do Supabase, que faz o mesmo
// trabalho (resize + recompressão: 888KB -> 60KB numa foto de combo a 640px) e
// não consome cota da Vercel. Basta trocar `/object/` por `/render/image/` na
// URL pública e passar width/quality.
//
// Para voltar ao otimizador da Vercel (se a cota for ampliada), remova
// `loader`/`loaderFile` de next.config.ts — nada mais precisa mudar, nenhum
// componente referencia este arquivo diretamente.
interface LoaderArgs {
  src: string
  width: number
  quality?: number
}

const SUPABASE_PUBLIC_OBJECT = '/storage/v1/object/public/'
const SUPABASE_RENDER_IMAGE = '/storage/v1/render/image/public/'

export default function supabaseImageLoader({ src, width, quality }: LoaderArgs): string {
  if (src.includes(SUPABASE_PUBLIC_OBJECT)) {
    const base = src.replace(SUPABASE_PUBLIC_OBJECT, SUPABASE_RENDER_IMAGE)
    return `${base}?width=${width}&quality=${quality ?? 75}`
  }

  // Arquivos locais em /public (banners) e qualquer outra origem seguem
  // servidos como estão — sem otimização, mas sem quebrar.
  return src
}
