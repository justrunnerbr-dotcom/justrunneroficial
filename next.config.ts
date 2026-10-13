import type { NextConfig } from 'next'
import temaRedirects from './src/lib/tema-redirects.json'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Tema novo (12/10/2026): o site da loja é o estático em public/tema/ (gerado do protótipo do sócio).
  // A home "/" mostra ele; links antigos de produto, coleção e páginas de texto (anúncios, Google, catálogo da
  // Meta) redirecionam pro equivalente. 307 (temporário) pra dar pra voltar atrás sem o Google gravar.
  // Admin, quiz, /obrigado, /busca e as APIs seguem no Next. Mapa gerado por scripts/_prototipo-catalogo.mjs.
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/tema/index.html' }],
      afterFiles: [
        { source: '/tema', destination: '/tema/index.html' },
        { source: '/tema/', destination: '/tema/index.html' },
      ],
      fallback: [],
    }
  },
  async redirects() {
    const prod = Object.entries(temaRedirects.produtos as Record<string, { p: string; cor: string; op?: number }>).map(([slug, { p, cor, op }]) => ({
      source: `/produto/${slug}`, destination: `/tema/produto.html?p=${p}&cor=${encodeURIComponent(cor)}${op ? '&op=1' : ''}`, permanent: false,
    }))
    const col = Object.entries(temaRedirects.colecoes).map(([slug, dest]) => ({
      source: `/colecao/${slug}`, destination: `/tema/${dest}`, permanent: false,
    }))
    const paginas = [['/colecao', 'colecao.html'], ['/faq', 'faq.html'], ['/sobre', 'sobre.html'], ['/contato', 'contato.html'],
      ['/trocas-e-devolucoes', 'trocas-e-devolucoes.html'], ['/politica-de-privacidade', 'politica-de-privacidade.html']]
      .map(([source, dest]) => ({ source, destination: `/tema/${dest}`, permanent: false }))
    // produto/coleção que não existe mais no catálogo: cai na lista de todos os óculos
    const resto = [
      { source: '/produto/:slug', destination: '/tema/colecao.html?cat=leve2', permanent: false },
      { source: '/colecao/:slug', destination: '/tema/colecao.html', permanent: false },
    ]
    return [...prod, ...col, ...paginas, ...resto]
  },
  images: {
    // Otimização feita pelo Storage do Supabase, não pelo /_next/image da
    // Vercel (cota estourada, 402). Ver image-loader.ts.
    loader: 'custom',
    loaderFile: './image-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
}

export default nextConfig
