import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { CartDrawer } from '@/components/store/cart-drawer'
import { getSettings, getCollections } from '@/lib/queries'
import { HeaderProvider } from '@/contexts/header-context'
import { TrackingProvider } from '@/components/TrackingProvider'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, collections] = await Promise.all([
    getSettings(['logo_url', 'logo_transparent_url']),
    getCollections(),
  ])

  return (
    <HeaderProvider>
      <TrackingProvider>
        <Header
          collections={collections}
          logoUrl={settings['logo_url']}
          logoTransparentUrl={settings['logo_transparent_url']}
        />
        {/* Spacer so content starts below the fixed header */}
        <div style={{ height: 'var(--header-height)' }} aria-hidden="true" />
        <main>{children}</main>
        <Footer />
        <CartDrawer />
      </TrackingProvider>
    </HeaderProvider>
  )
}
