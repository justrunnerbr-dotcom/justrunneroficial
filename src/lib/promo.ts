/**
 * Promoção "Compre 1 Leve 2" — contagem que reinicia todo dia à meia-noite.
 *
 * Não existe mais data de fim marcada: antes era uma constante `PROMO_END_ISO`
 * que precisava ser prorrogada na mão toda vez que a promo era estendida (e que
 * de fato venceu, derrubando a barra do site). Agora o relógio conta até as
 * 00:00 do horário de Brasília e volta pras 24h sozinho.
 *
 * Para encerrar a promo de verdade, basta virar `PROMO_ATIVA` para `false` —
 * a barra some do topo e o layout reajusta o espaçamento sozinho.
 */
export const PROMO_ATIVA = true

/** Fuso que define a virada. A operação toda é BR, então a contagem é a mesma
 *  para todo visitante, independente do relógio da máquina dele. */
const PROMO_TIMEZONE = 'America/Sao_Paulo'

const DAY_MS = 86_400_000

/** `hourCycle: 'h23'` (e não `hour12: false`) porque parte dos runtimes devolve
 *  "24" em vez de "00" à meia-noite com a segunda forma. */
const brtClock = new Intl.DateTimeFormat('en-US', {
  timeZone: PROMO_TIMEZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/**
 * Milissegundos até a próxima meia-noite de Brasília.
 *
 * Lê a hora de parede no fuso alvo em vez de calcular offset, então continua
 * certo se o Brasil voltar a ter horário de verão.
 */
export function msUntilReset(now: number = Date.now()): number {
  const parts = brtClock.formatToParts(new Date(now))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)

  const elapsed =
    (part('hour') * 3600 + part('minute') * 60 + part('second')) * 1000 +
    // O deslocamento de fuso é sempre em minutos inteiros, então os
    // milissegundos do relógio de Brasília são os mesmos do timestamp.
    (now % 1000)

  // No instante exato da virada faltam 24h cheias, e o relógio mostraria
  // "24:00:00" por um segundo. O teto de 23:59:59.999 evita isso.
  return Math.min(DAY_MS - elapsed, DAY_MS - 1)
}

/** Altura da barra em px — precisa bater com o spacer em `(store)/layout.tsx`. */
export const PROMO_BAR_HEIGHT = 48

export function isPromoActive(): boolean {
  return PROMO_ATIVA
}
