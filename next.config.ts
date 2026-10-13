import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Tema novo em teste (branch tema-novo): site estático completo em public/tema/. Sair antes de ir pra main.
  async rewrites() {
    return [
      { source: '/tema', destination: '/tema/index.html' },
      { source: '/tema/', destination: '/tema/index.html' },
    ]
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
