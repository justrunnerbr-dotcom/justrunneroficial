// Perguntas do quiz do cliente (sócio, 07/10/2026). Fonte única: o quiz
// (quiz-engine.ts) e o admin (/admin/quiz) leem daqui, então os dois não divergem.
// A API que salva (/api/quiz/lead) aceita só estes ids.

export type Answers = Record<string, string | string[]>
export type Option = [string, string]
export interface Question {
  id: string
  type: 'single' | 'multi' | 'text'
  title: string | ((a: Answers) => string)
  hint?: string
  options?: Option[]
  min?: number
  max?: number
  grid?: boolean
  optional?: boolean
  show?: (a: Answers) => boolean
}

/** Impedimentos que abrem a pergunta "o que te daria segurança". */
export const SEGURANCA_GATILHOS = ['confianca', 'qualidade', 'troca', 'firmeza', 'lente']

export const QUESTIONS: Question[] = [
  { id:'status_cliente', type:'single', title:'Você já comprou na Just Runner?', options:[
    ['cliente','Já comprei'],['nunca_comprou','Ainda não'],['abandonou_carrinho','Comecei o pedido, mas não finalizei'] ]},
  { id:'origem', type:'single', title:'Como você conheceu a loja?', options:[
    ['instagram','Instagram'],['tiktok','TikTok'],['anuncio','Anúncio'],['grupo_treino','Grupo de corrida ou pedal'],['indicacao','Indicação'],['google','Google'],['outro','Outro'] ]},
  { id:'esporte', type:'single', title:'Qual esporte você mais pratica?', options:[
    ['ciclismo','Ciclismo de estrada'],['mtb','Mountain bike'],['corrida','Corrida de rua'],['trail','Trail running'],['triatlo','Triatlo'],['beach_tennis','Beach tennis'],['outro','Outro'] ]},
  { id:'freq_treino', type:'single', title:'Quantas vezes por semana você treina?', options:[
    ['1_2','1 a 2 vezes'],['3_4','3 a 4 vezes'],['5_mais','5 vezes ou mais'],['eventual','Só de vez em quando'] ]},
  { id:'freq_anuncios', type:'single', title:'Com que frequência nossos anúncios aparecem pra você?', options:[
    ['quase_todo_dia','Quase todo dia'],['semana','Algumas vezes por semana'],['raramente','Raramente'],['nunca','Nunca vi'] ]},
  { id:'impedimentos', type:'multi', min:1, max:3,
    title: a => a.status_cliente==='cliente' ? 'O que quase te impediu de comprar?' : 'O que mais te impediu de comprar?',
    hint:'Escolha até 3', options:[
    ['preco','Preço'],['prazo','Prazo de entrega'],['confianca','Confiança na loja'],
    ['firmeza','Dúvida se fica firme no treino'],['lente','Dúvida sobre a lente e a proteção'],['rosto','Não sabia como ficaria no rosto'],
    ['modelo','Não achei o modelo que queria'],['fotos','Fotos do site'],['info','Faltou informação técnica'],
    ['qualidade','Dúvida sobre qualidade e durabilidade'],['troca','Troca e garantia'],['marketplace','Prefiro comprar em marketplace'],
    ['ja_tenho','Já tenho óculos pra treinar'],['curioso','Só estava olhando'] ]},
  { id:'seguranca', type:'multi', min:1, max:2, title:'O que te daria mais segurança pra comprar?', hint:'Escolha até 2',
    show: a => ((a.impedimentos as string[] | undefined) ?? []).some(x => SEGURANCA_GATILHOS.includes(x)), options:[
    ['avaliacoes','Avaliações de clientes'],['videos','Vídeos de atletas usando no treino'],['whatsapp','Atendimento no WhatsApp'],
    ['garantia','Garantia de troca'],['ficha','Ficha técnica completa (peso, lente, UV400)'],['cnpj','CNPJ e contato visíveis'] ]},
  { id:'percepcao_preco', type:'single', title:'Na promoção, cada óculos sai por R$ 148,50. Esse valor pra você é:', options:[
    ['barato','Barato'],['justo','Justo'],['um_pouco_caro','Um pouco caro'],['caro','Caro'] ]},
  { id:'preco_max', type:'single', title:'Até quanto você pagaria num óculos esportivo como os nossos?', options:[
    ['100','R$ 100'],['150','R$ 150'],['200','R$ 200'] ]},
  { id:'oferta_preferida', type:'single', title:'Qual oferta faria você comprar?', options:[
    ['compre1leve2','Compre 1, leve 2'],['compra_unica','Compra única'],['progressiva','Oferta progressiva: quanto mais óculos, mais desconto'] ]},
  { id:'segundo_oculos', type:'single', title:'Se você levasse um segundo óculos, ele seria pra quê?', options:[
    ['outra_lente','Pra mim, com lente pra outro horário ou clima'],['reserva','Pra mim, como reserva de treino'],['parceiro_treino','Pra um parceiro(a) de treino'],['presente','Presente'],['nao','Não levaria dois'] ]},
  { id:'lente_preferida', type:'single', title:'Que tipo de lente você mais usa?', options:[
    ['escura','Escura'],['espelhada','Espelhada'],['fotocromatica','Fotocromática (escurece no sol)'],['clara','Clara ou transparente'],['nao_sei','Não sei'] ]},
  { id:'resposta_aberta', type:'text', optional:true, title:'Tem alguma sugestão pra Just Runner?', hint:'Opcional. Pode ser sobre modelos, lentes, fotos, entrega, preço…' }
]

export const optionsOf = (q: Question): Option[] => q.options ?? []

// Rótulos curtos do admin (gráficos e CSV). O que não estiver aqui usa o texto da opção no quiz.
export const ADMIN_LABELS: Record<string, Record<string, string>> = {
  impedimentos: {
    firmeza: 'Firmeza no treino', lente: 'Lente e proteção', rosto: 'Como fica no rosto', modelo: 'Não achou o modelo',
    info: 'Falta info técnica', qualidade: 'Qualidade', troca: 'Troca e garantia', marketplace: 'Prefere marketplace',
    ja_tenho: 'Já tem óculos', curioso: 'Só olhando',
  },
  seguranca: { videos: 'Vídeos de atletas', whatsapp: 'WhatsApp', garantia: 'Garantia de troca', ficha: 'Ficha técnica', cnpj: 'CNPJ e contato' },
  segundo_oculos: { outra_lente: 'Outra lente, pra mim', reserva: 'Reserva, pra mim', parceiro_treino: 'Parceiro(a) de treino' },
  oferta_preferida: { progressiva: 'Oferta progressiva' },
  lente_preferida: { fotocromatica: 'Fotocromática', clara: 'Clara' },
  status_cliente: { abandonou_carrinho: 'Não finalizou o pedido' },
}

export function labelOf(qid: string, v: string): string {
  const short = ADMIN_LABELS[qid]?.[v]
  if (short) return short
  const q = QUESTIONS.find(x => x.id === qid)
  return (q && optionsOf(q).find(o => o[0] === v)?.[1]) ?? v
}
