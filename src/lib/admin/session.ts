// Sessão assinada do admin.
//
// Antes disto, o cookie `jhf_admin` guardava o próprio ADMIN_SECRET em texto:
// o cookie ERA a chave mestra. Consequências: não dava pra revogar o acesso de
// uma pessoa sem trocar o segredo de todo mundo, não existia validade própria
// da sessão, e não havia identidade — logo, nenhuma auditoria por pessoa era
// possível.
//
// Agora o cookie carrega `{usuário, emissão, expiração}` assinado com
// HMAC-SHA256. O segredo nunca sai do servidor.
//
// Usa Web Crypto (`crypto.subtle`), não `node:crypto`, porque o middleware do
// Next roda no Edge runtime — onde os módulos do Node não existem. Web Crypto
// funciona nos dois lados.

export interface SessionPayload {
  /** Usuário autenticado. */
  u:   string
  /** Emitido em (epoch segundos). */
  iat: number
  /** Expira em (epoch segundos). */
  exp: number
}

export const SESSION_COOKIE = 'jhf_admin'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 dias

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// O ArrayBuffer é criado explicitamente porque `crypto.subtle` exige
// BufferSource sobre ArrayBuffer — `new Uint8Array(n)` produz
// Uint8Array<ArrayBufferLike>, que inclui SharedArrayBuffer e não é aceito.
function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/** Monta o token assinado. Formato: base64url(payload).base64url(assinatura) */
export async function signSession(
  user: string,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<string> {
  const now: number = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = { u: user, iat: now, exp: now + ttlSeconds }

  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const sig  = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body))

  return `${body}.${toBase64Url(new Uint8Array(sig))}`
}

/**
 * Devolve o payload se o token for autêntico E não estiver expirado.
 * Qualquer outra situação devolve null — token adulterado, assinado com outro
 * segredo, malformado, ou vencido.
 */
export async function verifySession(
  token: string | undefined,
  secret: string | undefined,
): Promise<SessionPayload | null> {
  if (!token || !secret) return null

  const dot = token.indexOf('.')
  if (dot <= 0) return null

  const body = token.slice(0, dot)
  const sig  = token.slice(dot + 1)

  let valid: boolean
  try {
    // `crypto.subtle.verify` compara em tempo constante — não dá pra descobrir
    // a assinatura byte a byte medindo o tempo de resposta.
    valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromBase64Url(sig),
      encoder.encode(body),
    )
  } catch {
    return null
  }
  if (!valid) return null

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload
    if (typeof payload.u !== 'string' || typeof payload.exp !== 'number') return null
    if (Math.floor(Date.now() / 1000) >= payload.exp) return null
    return payload
  } catch {
    return null
  }
}
