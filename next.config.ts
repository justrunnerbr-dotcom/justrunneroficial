import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Tema novo (12/10/2026): o site da loja é o estático em public/tema/ (gerado do protótipo do sócio).
  // A home "/" mostra ele, e desde 16/10 produto, coleção e páginas de texto também, nos endereços do site antigo
  // (anúncios, Google, catálogo da Meta seguem valendo). Admin, quiz, /obrigado, /busca e as APIs seguem no Next.
  async rewrites() {
    return {
      // 16/10: endereços bonitos. O .html do tema é entregue no endereço do site antigo e o tema lê o produto/categoria
      // pelo caminho (JR.Q em public/tema/assets/catalogo-real.js). Produto que saiu do catálogo: o tema manda pra Compre 1 Leve 2.
      beforeFiles: [
        { source: '/', destination: '/tema/index.html' },
        { source: '/produto/:slug', destination: '/tema/produto.html' },
        { source: '/colecao', destination: '/tema/colecao.html' },
        { source: '/colecao/:slug', destination: '/tema/colecao.html' },
        ...['faq', 'sobre', 'contato', 'trocas-e-devolucoes', 'politica-de-privacidade', 'frete-e-entrega']
          .map(pg => ({ source: `/${pg}`, destination: `/tema/${pg}.html` })),
      ],
      afterFiles: [
        { source: '/tema', destination: '/tema/index.html' },
        { source: '/tema/', destination: '/tema/index.html' },
      ],
      fallback: [],
    }
  },
  async redirects() {
    // 15/10: o endereço da home é "/" (o link "Início" do tema levava pra /tema/index.html)
    return [{ source: '/tema/index.html', destination: '/', permanent: false }]
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
