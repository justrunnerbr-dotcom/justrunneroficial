import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { CartDrawer } from '@/components/store/cart-drawer'
import { getSettings, getCollections } from '@/lib/queries'
import { HeaderProvider } from '@/contexts/header-context'
import { TrackingProvider } from '@/components/TrackingProvider'
import { isPromoActive } from '@/lib/promo'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, collections] = await Promise.all([
    getSettings(['logo_url', 'logo_transparent_url']),
    getCollections(),
  ])

  // Constante de build (`PROMO_ATIVA` em lib/promo), não data — o ISR das
  // páginas não tem como deixar isto defasado. O relógio em si roda no cliente
  // e reinicia sozinho à meia-noite.
  const promoAtiva = isPromoActive()

  return (
    <HeaderProvider>
      <TrackingProvider>
        <Header
          collections={collections}
          logoUrl={settings['logo_url']}
          logoTransparentUrl={settings['logo_transparent_url']}
          showPromoBar={promoAtiva}
        />
        {/* Spacer so content starts below the fixed header */}
        <div
          style={{
            height: promoAtiva
              ? 'calc(var(--header-height) + var(--promo-bar-height))'
              : 'var(--header-height)',
          }}
          aria-hidden="true"
        />
        <main>{children}</main>
        <Footer />
        <CartDrawer />
      </TrackingProvider>
    </HeaderProvider>
  )
}
