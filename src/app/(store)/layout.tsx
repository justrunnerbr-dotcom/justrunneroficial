import { HeaderTema } from '@/components/tema/header-tema'
import { FooterTema } from '@/components/tema/footer-tema'
import '@/styles/tema-novo.css'
import { CartDrawer } from '@/components/store/cart-drawer'
import { getSettings } from '@/lib/queries'
import { HeaderProvider } from '@/contexts/header-context'
import { TrackingProvider } from '@/components/TrackingProvider'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSettings(['logo_url'])

  return (
    <HeaderProvider>
      <TrackingProvider>
        {/* Tema novo (branch tema-novo): visual do protótipo do sócio em .tema; pixel/CAPI ficam no root layout. */}
        <div className="tema">
          <HeaderTema logoUrl={settings['logo_url']} />
          <main>{children}</main>
          <FooterTema logoUrl={settings['logo_url']} />
        </div>
        <CartDrawer />
      </TrackingProvider>
    </HeaderProvider>
  )
}
