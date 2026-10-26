// Cliente da API "Instagram com Login do Instagram" — base graph.instagram.com,
// v25.0. Não usa a Graph API do Facebook nem precisa de página conectada.
// Independente do resto do projeto (Meta Ads usa a Graph API normal, produto
// diferente) — não reaproveitar META_ACCESS_TOKEN/META_APP_SECRET daqui.

const GRAPH_BASE = 'https://graph.instagram.com/v25.0'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Env var ${name} faltando`)
  return v
}

export function buildAuthorizeUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv('IG_APP_ID'),
    redirect_uri: redirectUri,
    response_type: 'code',
    // content_publish: publicar stories agendados (lib/ig/stories). manage_insights:
    // alcance/respostas/navegação dos stories (sem ele a API devolve código 10,
    // visto em 24/10/2026). Cada escopo novo exige reconectar uma vez.
    scope: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights',
  })
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`
}

export async function exchangeCodeForShortToken(code: string, redirectUri: string): Promise<{ access_token: string; user_id: string }> {
  const form = new URLSearchParams({
    client_id: requireEnv('IG_APP_ID'),
    client_secret: requireEnv('IG_APP_SECRET'),
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  })
  const res = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`troca de code falhou: ${await res.text()}`)
  return res.json()
}

export async function exchangeForLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: requireEnv('IG_APP_SECRET'),
    access_token: shortToken,
  })
  const res = await fetch(`${GRAPH_BASE}/access_token?${params.toString()}`)
  if (!res.ok) throw new Error(`troca pra token longo falhou: ${await res.text()}`)
  return res.json()
}

export async function refreshLongLivedToken(longToken: string): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: longToken })
  const res = await fetch(`${GRAPH_BASE}/refresh_access_token?${params.toString()}`)
  if (!res.ok) throw new Error(`renovação de token falhou: ${await res.text()}`)
  return res.json()
}

export type IgProfile = { user_id: string; username: string; name?: string; profile_picture_url?: string }

export async function getProfile(accessToken: string): Promise<IgProfile> {
  const params = new URLSearchParams({ fields: 'user_id,username,name,profile_picture_url', access_token: accessToken })
  const res = await fetch(`${GRAPH_BASE}/me?${params.toString()}`)
  if (!res.ok) throw new Error(`GET /me falhou: ${await res.text()}`)
  return res.json()
}

export type IgMedia = { id: string; media_type: string; media_url?: string; thumbnail_url?: string; caption?: string; permalink: string }

export async function getMedia(igUserId: string, accessToken: string): Promise<IgMedia[]> {
  const params = new URLSearchParams({ fields: 'id,media_type,media_url,thumbnail_url,caption,permalink', access_token: accessToken })
  const res = await fetch(`${GRAPH_BASE}/${igUserId}/media?${params.toString()}`)
  if (!res.ok) throw new Error(`GET /media falhou: ${await res.text()}`)
  const json = await res.json()
  return json.data ?? []
}

export async function subscribeWebhooks(igUserId: string, accessToken: string): Promise<void> {
  const params = new URLSearchParams({ subscribed_fields: 'comments,messages', access_token: accessToken })
  const res = await fetch(`${GRAPH_BASE}/${igUserId}/subscribed_apps?${params.toString()}`, { method: 'POST' })
  if (!res.ok) throw new Error(`inscrição de webhook falhou: ${await res.text()}`)
}

export type SendRecipient = { comment_id: string } | { id: string }

export type IgButton =
  | { type: 'web_url'; url: string; title: string }
  | { type: 'postback'; payload: string; title: string }

export interface IgCard {
  title: string
  subtitle?: string
  image_url?: string
  default_action?: { type: 'web_url'; url: string }
  buttons?: IgButton[]
}

export type SendMessagePayload =
  | { text: string }
  | { attachment: { type: 'template'; payload: { template_type: 'button'; text: string; buttons: IgButton[] } } }
  | { attachment: { type: 'template'; payload: { template_type: 'generic'; elements: IgCard[] } } }
  | { text: string; quick_replies: { content_type: 'text'; title: string; payload: string }[] }
  | { attachment: { type: 'image' | 'video'; payload: { url: string } } }

export async function sendMessage(igUserId: string, accessToken: string, recipient: SendRecipient, message: SendMessagePayload): Promise<{ message_id?: string }> {
  const res = await fetch(`${GRAPH_BASE}/${igUserId}/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, message }),
  })
  if (!res.ok) throw new Error(`envio de mensagem falhou: ${await res.text()}`)
  return res.json()
}

export async function replyToComment(commentId: string, accessToken: string, message: string): Promise<void> {
  const params = new URLSearchParams({ message, access_token: accessToken })
  const res = await fetch(`${GRAPH_BASE}/${commentId}/replies?${params.toString()}`, { method: 'POST' })
  if (!res.ok) throw new Error(`resposta pública falhou: ${await res.text()}`)
}

/** "Digitando…" / visto na conversa (deixa a resposta do assistente mais natural). */
export async function sendSenderAction(igUserId: string, accessToken: string, recipientId: string, action: 'typing_on' | 'mark_seen'): Promise<void> {
  await fetch(`${GRAPH_BASE}/${igUserId}/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, sender_action: action }),
  }).catch(() => { /* só estética: falha não pode travar o envio */ })
}

/** Nome e @ do perfil de quem mandou mensagem. */
export async function getPerfil(igScopedId: string, accessToken: string): Promise<{ name: string | null; username: string | null }> {
  try {
    const r = await (await fetch(`${GRAPH_BASE}/${igScopedId}?fields=name,username&access_token=${encodeURIComponent(accessToken)}`)).json()
    return { name: r.name ?? null, username: r.username ?? null }
  } catch {
    return { name: null, username: null }
  }
}
