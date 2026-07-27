import type { Metadata, Viewport } from 'next'
import { Poppins, Montserrat } from 'next/font/google'
import './globals.css'
import { GTMScript } from '@/components/store/gtm-script'
import { MetaPixel } from '@/components/store/meta-pixel'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
})

// metadataBase é obrigatório para o Next resolver as URLs relativas de
// openGraph/twitter em URL absoluta — sem ele, link compartilhado no WhatsApp
// não renderiza a imagem.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://justrunner.com.br'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Just Runner',
  description: 'Óculos de alta performance e estilo.',
  icons: {
    icon: '/favicon.ico?v=2',
  },
  verification: {
    google: '-vFwnd3dhefPd0O4rzg1kbaF5cBvwE1lawVkpAoUiN4',
  },
  openGraph: {
    type: 'website',
    siteName: 'Just Runner',
    locale: 'pt_BR',
    url: SITE_URL,
    title: 'Just Runner',
    description: 'Óculos de alta performance e estilo.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Just Runner — 2 óculos por R$ 297 com frete grátis para todo o Brasil',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Just Runner',
    description: 'Óculos de alta performance e estilo.',
    images: ['/og-image.jpg'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${montserrat.variable}`}>
      <body>
        <GTMScript gtmId={process.env.NEXT_PUBLIC_GTM_ID ?? ''} />
        <MetaPixel />
        {children}
      </body>
    </html>
  )
}
