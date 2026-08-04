// Camada de confiança das fontes de dados do admin.
//
// Motivação, com dois incidentes reais deste projeto: `fetchAccountInsights`
// devolvia zeros tanto em erro de rede quanto em HTTP 400 da Graph API, porque
// nunca checava `res.ok`. Isso já zerou o gasto silenciosamente aqui — uma vez
// por `META_AD_ACCOUNT_ID` inexistente (a sincronização gravou 0 linhas desde
// sempre, sem erro visível) e outra por `video_play_actions` duplicado no
// parâmetro `fields`, que a Meta rejeita em silêncio. Nos dois casos o painel
// exibiu "R$ 0,00" como se fosse dado real, inflando ROAS e margem.
//
// A regra desta camada: falha NUNCA vira zero. Falha vira um estado que a UI é
// obrigada a renderizar como "indisponível", e que contamina explicitamente
// qualquer métrica derivada dela.

export type SourceStatus =
  | 'ok'              // consulta respondeu e o dado é confiável
  | 'error'           // configurada, mas a consulta falhou (credencial, rede, API)
  | 'not_configured'  // falta variável de ambiente — nunca foi ligada

export interface SourceResult<T> {
  source:    string
  status:    SourceStatus
  data:      T | null
  checkedAt: string
  /** Mensagem técnica pra log/diagnóstico. Não usar direto na UI. */
  error:     string | null
}

/**
 * Teto de tempo por fonte externa.
 *
 * Uma credencial morta não costuma dar erro rápido — costuma pendurar. E como
 * o dashboard resolve as fontes em `Promise.all`, uma fonte pendurada trava a
 * página inteira sem nunca renderizar. Uma fonte morta tem que virar
 * "indisponível" em segundos, nunca prender a requisição.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}: sem resposta em ${ms}ms`)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function sourceOk<T>(source: string, data: T): SourceResult<T> {
  return { source, status: 'ok', data, checkedAt: new Date().toISOString(), error: null }
}

export function sourceError<T>(source: string, error: unknown): SourceResult<T> {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[fonte:${source}] falhou:`, message)
  return { source, status: 'error', data: null, checkedAt: new Date().toISOString(), error: message }
}

export function sourceNotConfigured<T>(source: string, detail: string): SourceResult<T> {
  return { source, status: 'not_configured', data: null, checkedAt: new Date().toISOString(), error: detail }
}

/** Dado utilizável pra cálculo. Só `ok` conta — `not_configured` e `error` não. */
export function isUsable<T>(r: SourceResult<T>): boolean {
  return r.status === 'ok' && r.data !== null
}

/**
 * Valor numérico pra somar, junto com a informação de que ele é confiável.
 * Existe pra tornar impossível escrever `?? 0` sem perceber: quem chama recebe
 * o zero E o aviso de que o zero é falso.
 */
export function spendOrZero<T>(r: SourceResult<T>, pick: (d: T) => number): { value: number; trusted: boolean } {
  if (!isUsable(r)) return { value: 0, trusted: false }
  return { value: pick(r.data as T), trusted: true }
}

/** Texto curto pra UI quando a fonte não está utilizável. */
export function statusLabel(r: SourceResult<unknown>): string {
  if (r.status === 'not_configured') return 'não configurado'
  if (r.status === 'error')          return 'indisponível'
  return 'ok'
}
