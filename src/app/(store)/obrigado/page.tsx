import type { Metadata } from 'next'
import { ObrigadoTracker } from './obrigado-tracker'

// Pagina tecnica, so acessada via redirect pos-compra configurado na Yampi
// (Checkout -> Redirecionamento) com as variaveis %%sale_id%%, %%sale_amount%%,
// %%customer_email%%, %%customer_phone%%. Nao aparece em nenhum link do site,
// nao deve ser indexada — existe so pra disparar o Purchase do navegador (com
// fbp/fbc reais do cookie) complementando o que o webhook ja manda server-side.
export const metadata: Metadata = {
  title: 'Pedido confirmado',
  robots: { index: false, follow: false },
}

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const get = (key: string) => {
    const v = params[key]
    return Array.isArray(v) ? v[0] : v
  }

  const saleId = get('sale_id')
  const value = get('value')
  const email = get('email')
  const phone = get('phone')

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', fontFamily: 'var(--font-poppins), sans-serif' }}>
          Pedido confirmado!
        </h1>
        <p style={{ color: '#71717a', fontSize: '14px' }}>
          Obrigado pela compra. Você vai receber os detalhes por e-mail.
        </p>
      </div>
      {saleId && value && (
        <ObrigadoTracker saleId={saleId} value={value} email={email} phone={phone} />
      )}
    </div>
  )
}
