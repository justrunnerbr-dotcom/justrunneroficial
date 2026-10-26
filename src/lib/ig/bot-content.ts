// Textos do assistente da DM. Fonte única de preço e prazo do direct.
// Porte da JHF (versão sem IA de 10/10/2026) para a Just Runner em 26/10/2026.
// Os fatos vêm do próprio site da JR (FAQ, Frete e entrega, Trocas,
// prototipo-tema/assets/data.js JR.POLICY/JR.CONTACT) — mudou lá, mude aqui:
// 1 óculos R$175, 2 por R$297 (Compre 1 Leve 2), combos 3 por R$327, frete
// grátis acima de R$200, até 12x no cartão, Pix/cartão/boleto na Yampi,
// capitais 3–5 dias úteis e interior até 10, troca/devolução em 7 dias pelo
// WhatsApp, atendimento seg–sáb 9h–18h.

const SITE = 'https://justrunner.com.br'
const UTM = 'utm_source=instagram&utm_medium=dm&utm_campaign=bot_dm'

export const FRETE_GRATIS_MINIMO = 200
export const PRECO_COMBO = 'R$297'
export const PRECO_UM = 'R$175'
export const PRECO_TRES = 'R$327'
export const FRETE_GRATIS = `frete grátis acima de R$${FRETE_GRATIS_MINIMO}`
export const HORA_ABRE = 9
export const HORA_FECHA = 18
export const WHATSAPP = '(11) 98907-2335'
export const WHATSAPP_LINK = 'https://wa.me/5511989072335'

export const LINKS = {
  promo: `${SITE}/colecao/compre-1-leve-2?${UTM}&utm_content=promo`,
  maisVendidos: `${SITE}/colecao/mais-vendidos?${UTM}&utm_content=mais_vendidos`,
  catalogo: `${SITE}/colecao/compre-1-leve-2?${UTM}&utm_content=catalogo`,
  umaUnidade: `${SITE}/colecao/oferta-progressiva?${UTM}&utm_content=uma_unidade`,
}

export function horaBrasilia(d = new Date()): number {
  return Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(d)) % 24
}
const domingo = (d = new Date()) => new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(d) === 'Sun'
export const equipeOnline = () => { const h = horaBrasilia(); return !domingo() && h >= HORA_ABRE && h < HORA_FECHA }

const ABRIR_NO_NAVEGADOR = 'Se o link não abrir, toca nos 3 pontinhos lá em cima e escolhe "Abrir no navegador".'

export const BOT = {
  // ── entrada ──
  boasVindas: `Oi! 👋 Aqui é o assistente da Just Runner.\n\n🔥 Promoção: 2 óculos por ${PRECO_COMBO}, e ${FRETE_GRATIS} pra todo o Brasil.\n\nComo posso te ajudar?`,
  boasVindasStory: `Oi! 👋 Viu algo no nosso story?\n\nSe souber o nome do modelo, escreve aqui que eu te mostro na hora. Se não souber, toca em "Achar meu óculos" 👇\n\n🔥 2 óculos por ${PRECO_COMBO}.`,
  boasVindasFoto: `Recebi! 👀 Alguém da equipe já te confirma qual é esse modelo.\n\nEnquanto isso, olha os mais vendidos 👇 Se o seu estiver aí, é só tocar em "Ver e comprar".`,
  depoisDaFoto: 'Não achou o seu? Me fala o nome do modelo, ou como ele é (cor da armação e da lente), que eu procuro 👇',
  saudacaoCurta: 'Oi! 👋 Aqui é o assistente da Just Runner.',
  oiDeNovo: 'Oi de novo! 👋 Me fala o modelo que você procura ou a sua dúvida 👇',
  menuDeNovo: 'Em que mais posso te ajudar? 👇',

  // ── promoção ──
  promo: `🔥 Compre 1 Leve 2\n\n✅ 2 óculos por ${PRECO_COMBO}, com frete grátis\n✅ Pode escolher 2 modelos diferentes, de todo o catálogo\n✅ Coloca os 2 no carrinho que o desconto entra sozinho\n\nQuer só 1? Sai por ${PRECO_UM} + frete. Nos combos, 3 óculos por ${PRECO_TRES}.\n\n💳 Pix, boleto ou cartão em até 12x.`,
  promoCurta: `2 por ${PRECO_COMBO} · 1 por ${PRECO_UM}`,
  soUm: `Com 1 óculos fica ${PRECO_UM} + frete.\n\n💡 Dica: no combo você paga ${PRECO_COMBO} pelos 2. Muita gente leva o segundo pra variar o estilo ou pra dar de presente.\n\nQual modelo você quer? Escreve o nome ou toca abaixo 👇`,

  // ── busca ──
  perguntaModelo: 'Me fala o nome do modelo, ou como ele é, que eu te mostro 👇\n\nEx: "juliet espelhada", "armação preta e lente vermelha"\n\nOu escolhe direto pela cor da lente:',
  buscaAchouModelo: (modelo: string) => `Achei! Olha o ${modelo} 👇 Arrasta pro lado pra ver as cores.`,
  buscaAchouCor: 'Separei os modelos que têm essa cor 👇 Arrasta pro lado.',
  buscaVazia: 'Não achei esse modelo no nosso catálogo 🤔\n\nPode ser que ele tenha outro nome aqui. Manda um print ou foto que a equipe confere pra você, ou dá uma olhada nos mais vendidos 👇',
  catalogo: `📖 Aqui está o nosso catálogo 👇 Arrasta pro lado pra ver os mais vendidos.\n\n🔥 Todos entram no Compre 1 Leve 2: 2 por ${PRECO_COMBO}.`,
  catalogoDepois: `Quer ver o catálogo completo no site, ou prefere que eu te ajude a achar um modelo? 👇\n\n${ABRIR_NO_NAVEGADOR}`,
  maisVendidos: `🔥 Os mais vendidos da semana 👇 Arrasta pro lado.\n\nLembrando: 2 por ${PRECO_COMBO}.`,
  perguntaCor: 'Qual cor ou lente você curte? 👇',
  outrasCores: (modelo: string) => `Todas as cores do ${modelo} 👇`,
  depoisDosCards: `Toca em "Ver e comprar" pra ir direto pro site. ${ABRIR_NO_NAVEGADOR}\n\nPrecisa de mais alguma coisa?`,
  ofereceVideos: (modelo: string) => `Toca em "Ver e comprar" pra ir direto pro site. ${ABRIR_NO_NAVEGADOR}\n\n🎥 Quer ver os vídeos do ${modelo} e uma foto dele no rosto? Ajuda a ter noção do tamanho e do acabamento.`,
  perguntaVideoModelo: 'De qual modelo você quer ver os vídeos? Escreve o nome que eu te mando 🎥',
  videosIntro: (modelo: string, n: number) => `🎥 Aqui ${n === 1 ? 'está o vídeo' : `estão os ${n} vídeos`} do ${modelo}, pra você ver o óculos de perto, de vários ângulos.\n\nPode levar alguns segundos pra carregar 👇`,
  semVideosIntro: (modelo: string) => `O ${modelo} ainda não tem vídeo gravado, mas separei as fotos pra você ver os detalhes 👇`,
  ugcIntro: (modelo: string) => `📸 E esse é o ${modelo} no rosto, pra você ter noção do tamanho e de como ele veste.`,
  fotosIntro: 'Fotos do óculos 👇',
  depoisDosVideos: (modelo: string) => `Curtiu o ${modelo}? 😎\n\n🔥 2 óculos por ${PRECO_COMBO}, ou 1 por ${PRECO_UM}. ${FRETE_GRATIS[0].toUpperCase()}${FRETE_GRATIS.slice(1)}.\n\n${ABRIR_NO_NAVEGADOR}`,
  lembrete: `Ficou alguma dúvida? 😊\n\nLembrando que no Compre 1 Leve 2 são 2 óculos por ${PRECO_COMBO}, com frete grátis.`,

  // ── check-in do funil (15 min depois de chegar ao carrinho/checkout sem comprar) ──
  checkinCheckout: `Oi! Passando pra saber: deu certo a finalização do seu pedido? 🙌\n\nSe travou em alguma coisa (frete, prazo, pagamento, cupom ou o site não abriu), me fala que eu te ajudo a concluir agora.`,
  checkinCarrinho: (produto: string | null) => `Oi! Vi que você separou ${produto ? `o ${produto}` : 'um óculos'} 😎 Conseguiu finalizar a compra?\n\n💡 No combo são 2 por ${PRECO_COMBO}. Se quiser, te ajudo a escolher o segundo ou tiro qualquer dúvida pra fechar o pedido.`,
  comprou: 'Que demais! 🎉 Obrigado pela compra.\n\nAssim que o pedido for despachado, o código de rastreio chega no seu e-mail e no WhatsApp (olha o spam também). Qualquer coisa, é só chamar aqui.',
  travouPagamento: `Entendi! Me conta o que aconteceu no pagamento, ou manda um print da tela, que a equipe te ajuda a concluir 🙏\n\n💳 Aceitamos Pix, boleto ou cartão em até 12x. ${ABRIR_NO_NAVEGADOR}`,

  // ── pedido ──
  pedidoPergunta: 'Me manda o e-mail usado na compra (ou o número do pedido) que eu consulto pra você 📦',
  pedidoNaoEntendi: 'Não consegui ler um e-mail ou número de pedido 🤔 Manda só o e-mail usado na compra, tipo nome@gmail.com.',
  pedidoNaoAchei: 'Não encontrei pedido com esse dado. Pode ter sido outro e-mail. Quer que alguém da equipe confira?',
  pedidoStatus: (numero: string, status: string, criadoEm: string, dias: number) => {
    const data = new Date(criadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    if (status === 'cancelled') return `Encontrei o pedido ${numero}, de ${data}, mas ele consta como cancelado ou não pago. Quer que alguém da equipe veja com você?`
    const base = `Encontrei seu pedido ${numero}, de ${data} ✅ Pagamento confirmado.\n\nO prazo conta da confirmação do pagamento: capitais recebem em 3 a 5 dias úteis e interior em até 10. Assim que despachar, o código de rastreio chega no seu e-mail e no WhatsApp (olha o spam também).\n\n⚠️ Os Correios não cobram taxa por SMS ou link. Se receber cobrança assim, é golpe.`
    return dias >= 10 ? `${base}\n\nComo já passaram ${dias} dias, avisei a equipe pra conferir o envio e te mandar o código aqui.` : base
  },

  // ── troca ──
  trocaPergunta: 'Sinto muito por isso 🙏 O que aconteceu?',
  trocaResposta: (tipo: string) => ({
    errado: 'Veio modelo errado ou faltando peça? A gente resolve com você.',
    defeito: 'Produto com defeito ou que chegou danificado: a equipe analisa e te orienta nos próximos passos.',
    trocar: 'Você pode pedir a troca em até 7 dias corridos depois de receber, com o óculos sem uso, na embalagem e com os acessórios.',
    devolver: 'Você pode desistir da compra em até 7 dias corridos depois de receber (direito de arrependimento), com o óculos sem uso, na embalagem e com os acessórios.',
  }[tipo] ?? '') + `\n\nPra abrir a solicitação, fala com a gente no WhatsApp ${WHATSAPP} com o número do pedido e fotos do óculos: ${WHATSAPP_LINK}`,

  // ── equipe ──
  humanoHorario: 'Já chamei alguém da equipe 🙌 Em alguns minutos te respondem aqui.\n\nSe quiser, já adianta sua dúvida.',
  humanoForaHorario: `Nossa equipe responde de segunda a sábado, das ${HORA_ABRE}h às ${HORA_FECHA}h. Deixa sua mensagem aqui que a gente te responde assim que abrir 🙏`,
  humanoUrgente: 'Entendi, e sinto muito pelo transtorno 🙏 Já passei sua conversa para a equipe com prioridade.',
  dataApertada: 'Me conta pra que dia você precisa e sua cidade (ou CEP) que a equipe confere se dá tempo 🙌\n\nO prazo conta da confirmação do pagamento: capitais em 3 a 5 dias úteis, interior em até 10.',
  parceria: 'Que massa! 🤝 Manda aqui seu @, seu nicho e quantos seguidores você tem. O time de parcerias responde por aqui.',
} as const

export type FaqKey = 'prazo' | 'pagamento' | 'original' | 'tamanho' | 'site'

export const FAQ: Record<FaqKey, { botao: string; resposta: string }> = {
  prazo: {
    botao: '🚚 Prazo e frete',
    resposta: `🚚 O prazo conta da confirmação do pagamento: capitais recebem em 3 a 5 dias úteis e interior em até 10 dias úteis. Enviamos para todo o Brasil.\n\n• Frete grátis em compras acima de R$${FRETE_GRATIS_MINIMO} (a partir de 2 óculos)\n• Abaixo disso, o frete é calculado no checkout pelo CEP\n• O código de rastreio chega por e-mail e WhatsApp assim que o pedido é despachado`,
  },
  pagamento: {
    botao: '💳 Pagamento',
    resposta: '💳 Pix, boleto ou cartão em até 12x, tudo pelo site, no checkout seguro da Yampi, que já calcula o desconto do Compre 1 Leve 2.\n\nA compra é sempre pelo site; pelo direct a gente te ajuda em tudo.',
  },
  original: {
    botao: '🕶️ Lentes e qualidade',
    resposta: '🕶️ Todas as lentes da Just Runner são polarizadas e têm proteção UV400, que bloqueia 100% dos raios UVA e UVB.\n\nE se não curtir, você pode trocar ou devolver em até 7 dias depois de receber 😉',
  },
  tamanho: {
    botao: '📏 Tamanho',
    resposta: 'Os modelos têm tamanho padrão adulto e servem na maioria dos rostos. Se você tem rosto mais largo ou mais fino, me fala o modelo que a equipe te diz se é mais justo ou mais folgado.',
  },
  site: {
    botao: '🌐 Problema no site',
    resposta: `Se o link não abrir aqui pelo Instagram, toca nos 3 pontinhos lá em cima e escolhe "Abrir no navegador".\n\nO desconto do Compre 1 Leve 2 aparece no carrinho quando você coloca 2 óculos. Se aparecer valor diferente de ${PRECO_COMBO} pelos 2, manda um print que a equipe resolve.`,
  },
}

const has = (t: string, re: RegExp) => re.test(t)

/** "ok", "obrigado", "valeu", 👍: confirmação ou agradecimento não pede resposta. */
export function isAgradecimento(raw: string): boolean {
  const t = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[!.,]+/g, ' ').trim()
  if (/^[\p{Extended_Pictographic}\s\u200d\ufe0f]+$/u.test(t)) return true // só emoji (👍, ❤️, 🙏)
  return /^(ok|okay|okk+|blz|beleza|tranquilo|show|top|perfeito|certo|ta bom|entendi|ah sim|vlw|valeu|obg|obrigad[oa]|muito obrigad[oa]|brigad[oa]|tmj|massa|boa|de nada|kk+|haha+)( (mano|irmao|man|mn|demais|viu))?$/.test(t)
}

/** "sim", "por favor", "quero", "pode ser": aceite de uma pergunta (ex.: "Quer conhecer o catálogo?"). */
export function isAceite(raw: string): boolean {
  const t = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[!.,]+/g, ' ').replace(/\s+/g, ' ').trim()
  return /^(sim|s|ss|sim sim|siim+|por favor|pf|pfv|pfvr|quero|quero sim|sim quero|sim por favor|pode ser|pode|pode mandar|manda|claro|bora|opa|uhum|aham|isso|com certeza|gostaria|queria)( (sim|por favor|pf|obrigad[oa]|ver|conhecer))?$/.test(t)
}

/** Intenção reconhecida no texto livre → ação do fluxo. */
export function detectIntent(raw: string): string | null {
  const t = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/^[?!. ]{2,}$/.test(t.trim())) return 'BOT:HUMANO:urgente'
  if (has(t, /procon|reclame ?aqui|processo|advogad|absurdo|descaso|palhacada|enganad|roubad/)) return 'BOT:HUMANO:urgente'
  if (has(t, /troca|trocar|devolv|devoluc|defeit|quebr|arranhad|veio errad|veio outro|faltando|faltou|reembols|estorno|cancelar/)) return 'BOT:TROCA'
  if (has(t, /rastreio|rastrear|codigo|cade (meu|o) pedido|meu pedido|nao chegou|nao recebi|ja comprei|comprei (na|no|dia|ontem|semana)|postad|enviad|faturad/)) return 'BOT:PEDIDO'
  if (has(t, /parceria|divulga|creator|criador de conteudo|permuta|influenc|ugc|atacado|revend|revender/)) return 'BOT:PARCERIA'
  if (has(t, /preciso (ate|pra|para) (dia|sexta|sabado|domingo|segunda|amanha)|chega ate|chega antes|vou viajar|viagem|festival|evento|show (dia|no)/)) return 'BOT:DATA'
  if (has(t, /prazo|entrega|chega em|demora|frete|sedex|correios|retir|loja fisica|onde fica|endereco/)) return 'BOT:FAQ:prazo'
  if (has(t, /parcel|pix|cartao|boleto|vezes/)) return 'BOT:FAQ:pagamento'
  if (has(t, /original|replica|qualidade|material|uv ?400|polariz|resistente|golpe|confiavel|seguro/)) return 'BOT:FAQ:original'
  if (has(t, /tamanho|rosto (grande|pequeno|largo|fino)|cabe|medida/)) return 'BOT:FAQ:tamanho'
  if (has(t, /nao abre|nao abriu|nao carrega|carrinho|link nao|site nao|valor errado|ta cobrando/)) return 'BOT:FAQ:site'
  if (has(t, /so um|so 1|apenas um|apenas 1|uma unidade|1 unidade|um so/)) return 'BOT:UM'
  if (has(t, /video|videos|foto real|fotos reais|no rosto|como fica|como ele fica|tem foto|mais fotos|ver melhor/)) return 'BOT:VIDEOS'
  if (has(t, /preco|valor|quanto|custa|promo|leve 2|compre 1|combo|desconto|cupom|\$/)) return 'BOT:PROMO'
  if (has(t, /catalogo|catalago|catalgo|modelos (disponiveis|que tem|que voces tem)|quais modelos|ver os modelos|todos os modelos|quero conhecer|quero ver|quero comprar|me mostra/)) return 'BOT:CATALOGO'
  if (has(t, /atendente|humano|pessoa real|falar com (alguem|voces)/)) return 'BOT:HUMANO'
  return null
}
