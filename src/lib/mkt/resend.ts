// Cliente da Resend (envio de e-mail marketing da Just Runner) — fetch puro, sem SDK.
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY        chave da API da Resend (obrigatória para enviar)
//   RESEND_FROM           remetente; padrão "Just Runner <contato@justrunner.com.br>"
//                         (o domínio justrunner.com.br precisa estar verificado na Resend)
//   RESEND_WEBHOOK_SECRET segredo "whsec_..." do webhook /api/webhooks/resend
//                         (eventos delivered/opened/clicked/bounced/complained)
//   CRON_SECRET           o mesmo das outras rotinas: o pg_cron chama /api/mkt/drain
//                         e /api/cron/mkt-contatos com "Authorization: Bearer <CRON_SECRET>"

export const RESEND_FROM_PADRAO = 'Just Runner <contato@justrunner.com.br>'

export function remetente(): string {
  return process.env.RESEND_FROM?.trim() || RESEND_FROM_PADRAO
}

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  /** A Resend descarta repetição com a mesma chave por 24h — usamos o id do envio. */
  idempotencyKey?: string
}): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY faltando')

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (params.idempotencyKey) headers['Idempotency-Key'] = params.idempotencyKey

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({ from: remetente(), to: params.to, subject: params.subject, html: params.html }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Resend falhou (${res.status}): ${(await res.text()).slice(0, 300)}`)
  return res.json()
}
