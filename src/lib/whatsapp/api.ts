import { createHmac, timingSafeEqual } from 'crypto'

const META_API_VER = 'v21.0'

export function verifyWhatsappSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.META_APP_SECRET
  if (!secret || !signatureHeader) return false

  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Manda texto livre via Cloud API — só funciona dentro da janela de 24h após o cliente
 * ter mandado a última mensagem (regra da Meta). Serve pra responder, não pra iniciar
 * contato (isso exige template aprovado, fora de escopo aqui).
 */
export async function sendWhatsappText(phoneNumberId: string, to: string, body: string): Promise<{ ok: boolean; waMessageId?: string; error?: string }> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return { ok: false, error: 'META_ACCESS_TOKEN ausente' }

  try {
    const res = await fetch(`https://graph.facebook.com/${META_API_VER}/${phoneNumberId}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    })
    const json = await res.json() as { messages?: Array<{ id: string }>; error?: { message?: string } }
    if (!res.ok) return { ok: false, error: json.error?.message ?? 'falha ao enviar' }
    return { ok: true, waMessageId: json.messages?.[0]?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'erro desconhecido' }
  }
}
