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

// Copy aprovada pelo usuário em 27/07/2026. Termo principal escolhido:
// "óculos de sol esportivos". O title cabe inteiro no resultado do Google
// (53 caracteres) e a description em 148.
const SITE_TITLE = 'Óculos de Sol Esportivos | 2 por R$ 297 — Just Runner'
const SITE_DESCRIPTION =
  'Óculos de sol esportivos com proteção UV400 e lentes polarizadas. Leve 2 por R$ 297 com frete grátis para todo o Brasil. Mais de 150 mil clientes.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
