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

export const metadata: Metadata = {
  title: 'Just Have Fun Store',
  description: 'Óculos de alta performance e estilo.',
  icons: {
    icon: '/favicon.ico?v=2',
  },
  verification: {
    google: '-vFwnd3dhefPd0O4rzg1kbaF5cBvwE1lawVkpAoUiN4',
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
