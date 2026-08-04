import { getAdminSupabase } from '@/lib/admin-client'
import { getMetaLiveSpend } from '@/lib/admin/meta-ads'

// Alertas proativos.
//
// Até aqui o admin só contava o que aconteceu para quem abrisse a página e
// soubesse o que procurar. É assim que um gasto zerado por falha de API passa
// dias despercebido: o dado está errado na tela, mas nada dá motivo pra
// desconfiar dele.
//
// Regras de projeto:
// - Alerta só vale se for acionável. "Vendeu menos que ontem" não é alerta, é
//   variação normal — por isso as comparações usam média de 7 dias e a MESMA
//   janela horária, e não o dia fechado anterior.
// - Nada de alarme antes de haver amostra: comparações de ritmo só rodam depois
//   das 12h, e só com pelo menos 3 dias de histórico.
//
// A loja irmã também manda esses alertas por e-mail (via Resend) e guarda um
// histórico pra não repetir o mesmo aviso. Aqui só existe a detecção, exibida
// no /admin/alertas — a Just Runner não tem provedor de e-mail configurado, e
// portar o envio sem ele seria código morto.

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const PAID_STATUSES = ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered']

const TZ = 'America/Sao_Paulo'

export type Severidade = 'critico' | 'atencao'

export interface Alerta {
  /** Identidade estável do alerta, usada pra não repetir o mesmo aviso. */
  chave:      string
  severidade: Severidade
  titulo:     string
  detalhe:    string
}

/** "agora" no fuso de São Paulo, independente do fuso do servidor. */
function agoraSP(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
}

function isoDiaSP(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

const fmtBrl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── 1. Fonte de dados muda ───────────────────────────────────────────────────
async function checarFontes(hoje: string, amanha: string): Promise<Alerta[]> {
  const meta = await getMetaLiveSpend(hoje, amanha)
  const alertas: Alerta[] = []

  if (meta.status === 'error') {
    alertas.push({
      chave:      'fonte-meta',
      severidade: 'critico',
      titulo:     'Gasto do Meta Ads indisponível',
      detalhe:    `A API da Meta não respondeu. Enquanto isso, o investimento no painel está subestimado e Lucro Líquido, ROAS e margem aparecem melhores do que são. Detalhe técnico: ${meta.error ?? 'sem detalhe'}`,
    })
  } else if (meta.status === 'not_configured') {
    alertas.push({
      chave:      'fonte-meta-nao-configurado',
      severidade: 'atencao',
      titulo:     'Meta Ads não configurado',
      detalhe:    meta.error ?? 'Variáveis de ambiente ausentes.',
    })
  } else if ((meta.data?.failedAccounts.length ?? 0) > 0) {
    alertas.push({
      chave:      'fonte-meta-parcial',
      severidade: 'atencao',
      titulo:     'Meta Ads respondendo parcialmente',
      detalhe:    `Sem dados de: ${meta.data?.failedAccounts.join(', ')}. O investimento total está subestimado.`,
    })
  }

  return alertas
}

// ── 2. Ritmo de pedidos e CPA ────────────────────────────────────────────────
/**
 * Compara sempre a MESMA janela do dia (00h até a hora atual) contra os 7 dias
 * anteriores. Comparar dia parcial com dia fechado é o erro clássico que faz
 * qualquer manhã parecer catástrofe.
 */
async function checarRitmo(hoje: string, amanha: string): Promise<Alerta[]> {
  const agora = agoraSP()
  const hora  = agora.getHours()

  // Antes do meio-dia a amostra é pequena demais pra concluir qualquer coisa.
  if (hora < 12) return []

  const db = getAdminSupabase()
  const inicioJanela = new Date(agora)
  inicioJanela.setDate(inicioJanela.getDate() - 7)
  inicioJanela.setHours(0, 0, 0, 0)

  const { data, error } = await db
    .from('orders')
    .select('created_at')
    .eq('store_id', STORE_ID)
    .in('status', PAID_STATUSES)
    .gte('created_at', inicioJanela.toISOString())

  if (error || !data) return []

  // Conta por dia, considerando apenas pedidos feitos ANTES da hora atual.
  const porDia: Record<string, number> = {}
  for (const o of data) {
    const d = new Date(o.created_at as string)
    const diaSP  = isoDiaSP(d)
    const horaSP = Number(d.toLocaleString('en-US', { timeZone: TZ, hour: '2-digit', hour12: false }))
    if (horaSP <= hora) porDia[diaSP] = (porDia[diaSP] ?? 0) + 1
  }

  const pedidosHoje = porDia[hoje] ?? 0
  const anteriores  = Object.entries(porDia)
    .filter(([dia]) => dia !== hoje)
    .map(([, n]) => n)

  if (anteriores.length < 3) return []  // sem histórico suficiente

  const media = anteriores.reduce((s, n) => s + n, 0) / anteriores.length
  const alertas: Alerta[] = []

  if (media >= 5 && pedidosHoje < media * 0.5) {
    alertas.push({
      chave:      `ritmo-pedidos-${hoje}`,
      severidade: 'critico',
      titulo:     'Pedidos bem abaixo do normal',
      detalhe:    `Até ${hora}h: ${pedidosHoje} pedidos pagos, contra média de ${media.toFixed(1)} nos últimos ${anteriores.length} dias na mesma janela. Vale conferir se o checkout está funcionando antes de mexer em campanha.`,
    })
  }

  // CPA do dia — só faz sentido comparar se houve gasto e o dado é confiável.
  const meta = await getMetaLiveSpend(hoje, amanha)
  const gastoConfiavel = meta.status === 'ok' && (meta.data?.failedAccounts.length ?? 0) === 0

  if (gastoConfiavel) {
    const gastoHoje = meta.data?.total.spend ?? 0
    if (gastoHoje > 200 && pedidosHoje > 0 && media > 0) {
      const cpaHoje  = gastoHoje / pedidosHoje
      const cpaMedio = gastoHoje / media   // mesmo gasto, ritmo normal de pedidos
      if (cpaHoje > cpaMedio * 1.5) {
        alertas.push({
          chave:      `cpa-${hoje}`,
          severidade: 'atencao',
          titulo:     'CPA do dia bem acima do normal',
          detalhe:    `Até ${hora}h: ${fmtBrl(gastoHoje)} investidos para ${pedidosHoje} pedidos — CPA de ${fmtBrl(cpaHoje)}. No ritmo médio dos últimos dias o CPA estaria em ${fmtBrl(cpaMedio)}.`,
        })
      }
    }
  }

  return alertas
}

export async function detectarAlertas(): Promise<Alerta[]> {
  const agora   = agoraSP()
  const hoje    = isoDiaSP(agora)
  const amanhaD = new Date(agora); amanhaD.setDate(amanhaD.getDate() + 1)
  const amanha  = isoDiaSP(amanhaD)

  const [fontes, ritmo] = await Promise.all([
    checarFontes(hoje, amanha),
    checarRitmo(hoje, amanha),
  ])

  return [...fontes, ...ritmo]
}
