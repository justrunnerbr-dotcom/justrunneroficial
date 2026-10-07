// Lógica do quiz do sócio (script.js de 07/10/2026), portada para TypeScript e
// agindo sobre a marcação de quiz-markup.ts pelos mesmos ids. Perguntas, regras
// de exibição e textos são os dele; o que mudou são as 3 integrações que vieram
// vazias: salvar resposta (/api/quiz/lead), bônus reais (vêm da página) e gerar
// o cupom único do bônus (/api/quiz/bonus) antes de mandar pra loja.

import { track, getAttribution, initSession, getVisitorId } from '@/lib/analytics/client'
import { metaLead } from '@/lib/meta'
import { saveQuizCupom } from '@/lib/quiz/client'

type Answers = Record<string, string | string[]>
type Option = [string, string]
interface Question {
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
export interface EngineBonus { id: string; nome: string; imagem: string | null; precoOriginal: number }

/* ===== PERGUNTAS (do sócio, sem alteração) ===== */
const QUESTIONS: Question[] = [
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
    show: a => ((a.impedimentos as string[] | undefined) ?? []).some(x => ['confianca','qualidade','troca','firmeza','lente'].includes(x)), options:[
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

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

export function initQuiz(root: HTMLElement, bonus: EngineBonus[]): () => void {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!
  const answers: Answers = {}
  const attribution = getAttribution() ?? {}
  const params = new URLSearchParams(window.location.search)
  const utms = Object.fromEntries(UTM_KEYS.map(k => [k, params.get(k) || attribution[k] || null]))
  let step = 0
  let bonusSel: string | null = null
  let advancing = false
  let leadId: string | null = null
  // 1ª gravação (só respostas) em andamento: o envio do contato espera ela
  // voltar com o id, senão quem preenche rápido (autofill) gera uma 2ª linha.
  let salvandoRespostas: Promise<boolean> | null = null
  let started = false
  const timers: number[] = []

  const screens = ['s-intro', 's-quiz', 's-dados', 's-bonus']
  function show(id: string) {
    screens.forEach(s => { $(s).hidden = s !== id })
    $('top').classList.toggle('hide', id === 's-intro')
    $('back').hidden = !(id === 's-quiz' || id === 's-dados')
    window.scrollTo(0, 0)
  }

  const visible = () => QUESTIONS.filter(q => !q.show || q.show(answers))
  $('intro-count').textContent = String(QUESTIONS.length)

  function render() {
    window.scrollTo(0, 0)
    const list = visible(), q = list[step]
    $('bar').style.width = (step / (list.length + 1) * 100) + '%'
    const faltam = list.length - step
    $('reward').textContent =
      step === 0 ? 'Seu óculos grátis começa aqui' :
      faltam === 1 ? 'Última pergunta antes do seu óculos grátis' :
      faltam <= 3 ? `Seu óculos grátis está a ${faltam} perguntas` :
      `Faltam ${faltam} perguntas pro seu óculos grátis`
    $('q-title').textContent = typeof q.title === 'function' ? q.title(answers) : q.title
    $('q-hint').textContent = q.hint || ''
    $('q-hint').hidden = !q.hint
    const body = $('q-body'); body.innerHTML = ''

    if (q.type === 'text') {
      const t = document.createElement('textarea')
      t.value = (answers[q.id] as string) || ''; t.placeholder = 'Escreva sua sugestão'; t.maxLength = 1000
      t.oninput = () => { answers[q.id] = t.value }
      body.appendChild(t)
    } else {
      const wrap = document.createElement('div')
      wrap.className = 'options' + (q.grid ? ' grid2' : '')
      q.options!.forEach(([v, l]) => {
        const b = document.createElement('button')
        b.type = 'button'; b.className = 'opt ' + q.type; b.dataset.v = v
        const box = document.createElement('span'); box.className = 'box'
        const label = document.createElement('span'); label.textContent = l
        b.append(box, label)
        b.onclick = () => choose(q, v)
        wrap.appendChild(b)
      })
      body.appendChild(wrap)
    }
    $('skip').hidden = !q.optional
    $('next').hidden = q.type === 'single'
    sync(q)
  }

  function sync(q: Question) {
    const val = answers[q.id]
    const sel = q.type === 'multi' ? ((val as string[]) || []) : [val as string]
    root.querySelectorAll<HTMLButtonElement>('#q-body .opt').forEach(b => {
      const on = sel.includes(b.dataset.v!)
      b.setAttribute('aria-pressed', String(on))
      b.disabled = q.type === 'multi' && !on && sel.length >= (q.max ?? 99)
    })
    const next = $<HTMLButtonElement>('next')
    if (q.type === 'multi') next.disabled = sel.length < (q.min ?? 0)
    if (q.type === 'text') next.disabled = false
  }

  function choose(q: Question, v: string) {
    if (q.type === 'single') {
      if (advancing) return
      answers[q.id] = v; sync(q)
      advancing = true
      timers.push(window.setTimeout(() => { advancing = false; advance() }, 220))
    } else {
      const arr = (answers[q.id] as string[]) || []
      answers[q.id] = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
      sync(q)
    }
  }

  function advance() {
    const list = visible()
    // limpa resposta de pergunta condicional que deixou de aparecer
    QUESTIONS.forEach(q => { if (q.show && !q.show(answers)) delete answers[q.id] })
    if (step < list.length - 1) { step++; render() }
    else {
      track({ event_type: 'quiz_complete', page: '/quiz' })
      salvandoRespostas = salvarLead(false)
      show('s-dados')
    }
  }

  $('start').onclick = () => {
    if (!started) { started = true; track({ event_type: 'quiz_start', page: '/quiz' }) }
    step = 0; show('s-quiz'); render()
  }
  $('next').onclick = advance
  $('skip').onclick = () => { delete answers.resposta_aberta; advance() }
  $('back').onclick = () => {
    if (!$('s-dados').hidden) { show('s-quiz'); step = visible().length - 1; render(); return }
    if (step > 0) { step--; render() } else show('s-intro')
  }

  /* ===== FORMULÁRIO ===== */
  const estado = $<HTMLSelectElement>('estado')
  if (estado.options.length <= 1) {
    ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
      .forEach(uf => estado.insertAdjacentHTML('beforeend', `<option>${uf}</option>`))
  }

  const whats = $<HTMLInputElement>('whatsapp')
  whats.addEventListener('input', () => {
    const d = whats.value.replace(/\D/g, '').slice(0, 11)
    whats.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d
  })

  const val = (id: string) => $<HTMLInputElement>(id).value.trim()

  async function salvarLead(completo: boolean): Promise<boolean> {
    const payload: Record<string, unknown> = {
      id: leadId, completo, respostas: answers, ...utms,
      session_id: initSession(), visitor_id: getVisitorId(),
    }
    if (completo) Object.assign(payload, {
      nome: val('nome'), whatsapp: val('whatsapp').replace(/\D/g, ''), email: val('email'),
      cidade: val('cidade'), estado: val('estado'), faixa_idade: val('idade'),
      consentimento: $<HTMLInputElement>('consent').checked,
    })
    try {
      const r = await fetch('/api/quiz/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await r.json() as { ok: boolean; id?: string }
      if (j.ok && j.id) leadId = j.id
      return j.ok
    } catch { return false }
  }

  $<HTMLFormElement>('form').onsubmit = async e => {
    e.preventDefault()
    const err = $('form-error')
    if (!val('nome')) { err.textContent = 'Preencha seu nome.'; return }
    if (val('whatsapp').replace(/\D/g, '').length < 10) { err.textContent = 'Preencha um WhatsApp com DDD.'; return }
    if (!/^\S+@\S+\.\S+$/.test(val('email'))) { err.textContent = 'Preencha um e-mail válido.'; return }
    if (!$<HTMLInputElement>('consent').checked) { err.textContent = 'Marque a autorização pra receber seu bônus.'; return }
    err.textContent = ''
    const submit = root.querySelector<HTMLButtonElement>('#form button[type=submit]')!
    submit.disabled = true
    if (salvandoRespostas) await salvandoRespostas
    const ok = await salvarLead(true)
    submit.disabled = false
    if (!ok) { err.textContent = 'Não conseguimos salvar agora. Tente de novo em instantes.'; return }
    metaLead({ content_name: 'Quiz Just Runner', content_category: 'Quiz' })
    track({ event_type: 'quiz_lead', page: '/quiz' })
    $('thanks').textContent = `Valeu, ${val('nome').split(' ')[0]}! Você ganhou um óculos`
    renderProducts()
    show('s-bonus')
  }

  /* ===== PRODUTOS ===== */
  function renderProducts() {
    const wrap = $('products'); wrap.innerHTML = ''
    bonus.forEach(p => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'product'; b.setAttribute('aria-pressed', 'false')
      const img = document.createElement('div'); img.className = 'img'
      if (p.imagem) { const i = document.createElement('img'); i.src = p.imagem; i.alt = p.nome; i.loading = 'lazy'; img.appendChild(i) }
      const name = document.createElement('span'); name.className = 'name'; name.textContent = p.nome
      const price = document.createElement('span'); price.className = 'price'
      const s = document.createElement('s'); s.textContent = `R$ ${p.precoOriginal}`
      price.append(s, 'R$ 0')
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = 'Seu bônus'
      b.append(img, name, price, tag)
      b.onclick = () => {
        bonusSel = p.id
        root.querySelectorAll('.product').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
        $('sum-bonus').textContent = `Bônus: ${p.nome}`
        const go = $<HTMLButtonElement>('go-store')
        go.disabled = false
        go.textContent = 'Adicionar bônus e ir pra loja'
      }
      wrap.appendChild(b)
    })
  }

  $<HTMLButtonElement>('go-store').onclick = async () => {
    const go = $<HTMLButtonElement>('go-store')
    if (!bonusSel || !leadId) return
    go.disabled = true; go.textContent = 'Gerando seu bônus…'
    try {
      const r = await fetch('/api/quiz/bonus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: leadId, bonusId: bonusSel }) })
      const j = await r.json() as { ok: boolean; code?: string; destino?: string; error?: string }
      if (!j.ok || !j.code) throw new Error(j.error ?? 'falhou')
      const escolhido = bonus.find(b => b.id === bonusSel)!
      saveQuizCupom(j.code, { id: escolhido.id, nome: escolhido.nome, imagem: escolhido.imagem })
      track({ event_type: 'quiz_bonus', page: '/quiz', properties: { bonus: bonusSel } })
      window.location.href = j.destino ?? '/colecao/compre-1-leve-2'
    } catch (e) {
      go.disabled = false; go.textContent = 'Adicionar bônus e ir pra loja'
      $('form-error').textContent = ''
      alertBonus(e instanceof Error && e.message !== 'falhou' ? `Não deu: ${e.message}.` : 'Não conseguimos gerar seu bônus agora. Tente de novo em instantes.')
    }
  }

  function alertBonus(msg: string) {
    let el = root.querySelector<HTMLParagraphElement>('#bonus-error')
    if (!el) {
      el = document.createElement('p'); el.id = 'bonus-error'; el.className = 'error'; el.setAttribute('role', 'alert')
      $('go-store').insertAdjacentElement('beforebegin', el)
    }
    el.textContent = msg
  }

  return () => { timers.forEach(t => clearTimeout(t)) }
}
