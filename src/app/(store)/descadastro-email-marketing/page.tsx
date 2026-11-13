import type { Metadata } from 'next'
import { BotaoDescadastro } from './botao-descadastro'

// Link do rodapé de todo e-mail marketing (?email={{email}}). Página técnica: não indexa.
export const metadata: Metadata = {
  title: 'Descadastro de e-mail | Just Runner',
  robots: { index: false, follow: false },
}

export default async function DescadastroPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const bruto = (await searchParams).email
  // "+" do endereço chega como espaço quando o link não foi codificado: e-mail não tem espaço
  const email = (Array.isArray(bruto) ? bruto[0] : bruto)?.trim().replace(/ /g, '+') ?? ''

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '460px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '14px', fontFamily: 'var(--font-poppins), sans-serif' }}>
          Descadastro de e-mail
        </h1>
        {email ? (
          <>
            <p style={{ color: '#71717a', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
              Confirma que você não quer mais receber e-mails de ofertas da Just Runner no endereço <b style={{ wordBreak: 'break-all' }}>{email}</b>?
            </p>
            <BotaoDescadastro email={email} />
          </>
        ) : (
          <p style={{ color: '#71717a', fontSize: '15px', lineHeight: 1.6 }}>
            Link incompleto: falta o e-mail. Use o link &quot;Não quero mais receber e-mails&quot; do próprio e-mail que você recebeu.
          </p>
        )}
      </div>
    </div>
  )
}
