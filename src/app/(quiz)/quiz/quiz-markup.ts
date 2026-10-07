// Marcação do quiz do sócio (index.html de 07/10/2026), igual ao original com 3
// ajustes: logo em /quiz/logo.png, validade preenchida e a resposta da troca com
// a política da loja. O comportamento fica em quiz-engine.ts, que age pelos ids.
export const QUIZ_MARKUP = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="lens-global" x1="0" x2="1"><stop offset="0" stop-color="#3A3A3A"/><stop offset="1" stop-color="#0A0A0A"/></linearGradient></defs></svg>

<div class="app">

  <header class="top hide" id="top">
    <img src="/quiz/logo.png" alt="Just Runner">
    <button class="back" id="back" hidden>Voltar</button>
  </header>

  <!-- INTRO -->
  <section class="screen" id="s-intro">
    <div class="intro-logo"><img src="/quiz/logo.png" alt="Just Runner"></div>
    <h1>Responda e ganhe um óculos</h1>
    <p class="lead">Queremos entender o que melhorar na Just Runner. Responda algumas perguntas rápidas e ganhe um óculos de bônus na sua próxima compra.</p>
    <div class="intro-meta">
      <div><b id="intro-count">12</b>perguntas</div>
      <div><b>2 min</b>pra responder</div>
      <div><b>+1</b>óculos de bônus</div>
    </div>
    <div class="foot"><button class="cta" id="start">Começar</button></div>
  </section>

  <!-- PERGUNTAS -->
  <section class="screen" id="s-quiz" hidden>
    <p class="reward" id="reward"></p>
    <div class="progress-row">
      <div class="progress"><span id="bar"></span></div>
      <svg class="goal" viewBox="0 0 400 150" aria-hidden="true"><path d="M18 52 C70 30 330 30 382 52 L376 64 C360 118 262 128 222 92 C210 82 190 82 178 92 C138 128 40 118 24 64 Z" fill="url(#lens-global)"/><path d="M18 52 C70 30 330 30 382 52 L382 60 C330 42 70 42 18 60 Z" fill="#0A0A0A"/></svg>
    </div>
    <h2 id="q-title"></h2>
    <p class="hint" id="q-hint"></p>
    <div id="q-body"></div>
    <div class="foot">
      <button class="cta" id="next">Continuar</button>
      <button class="skip" id="skip" hidden>Pular</button>
    </div>
  </section>

  <!-- DADOS -->
  <section class="screen" id="s-dados" hidden>
    <p class="reward">Último passo pra liberar seu óculos grátis</p>
    <div class="progress-row">
      <div class="progress"><span style="width:92%"></span></div>
      <svg class="goal" viewBox="0 0 400 150" aria-hidden="true"><path d="M18 52 C70 30 330 30 382 52 L376 64 C360 118 262 128 222 92 C210 82 190 82 178 92 C138 128 40 118 24 64 Z" fill="url(#lens-global)"/><path d="M18 52 C70 30 330 30 382 52 L382 60 C330 42 70 42 18 60 Z" fill="#0A0A0A"/></svg>
    </div>
    <h2>Pra onde mandamos seu bônus?</h2>
    <p class="hint">Use o mesmo WhatsApp e e-mail na hora da compra.</p>
    <form class="form" id="form" novalidate>
      <div class="field"><label for="nome">Nome</label><input type="text" id="nome" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" required></div>
      <div class="field"><label for="whatsapp">WhatsApp</label><input type="tel" id="whatsapp" inputmode="numeric" autocomplete="tel" placeholder="(11) 91234-5678" required></div>
      <div class="field"><label for="email">E-mail</label><input type="email" id="email" autocomplete="email" autocapitalize="off" enterkeyhint="next" required></div>
      <div class="row2">
        <div class="field"><label for="cidade">Cidade</label><input type="text" id="cidade" autocomplete="address-level2"></div>
        <div class="field"><label for="estado">Estado</label><select id="estado"><option value="">UF</option></select></div>
      </div>
      <div class="field"><label for="idade">Faixa de idade</label>
        <select id="idade"><option value="">Selecione</option><option>18 a 24</option><option>25 a 34</option><option>35 a 44</option><option>45 ou mais</option></select>
      </div>
      <label class="consent"><input type="checkbox" id="consent">Autorizo a Just Runner a entrar em contato e usar minhas respostas para melhorar a loja e enviar ofertas.</label>
      <p class="error" id="form-error" role="alert"></p>
      <button class="cta" type="submit">Ver meu bônus</button>
    </form>
  </section>

  <!-- PÁGINA DE BÔNUS -->
  <section class="screen" id="s-bonus" hidden>
    <h1 id="thanks">Valeu! Você ganhou um óculos</h1>
    <p class="lead">Esse quiz foi criado pra melhorar a Just Runner. Cada opinião de quem treina ajuda a decidir os próximos modelos, as lentes, as fotos do site e as promoções. Como agradecimento, seu próximo pedido vem com um óculos a mais, por nossa conta.</p>

    <div class="offer">
      <div class="big">3 óculos</div>
      <div class="price">por R$ 297</div>
      <p>2 óculos da promoção Compre 1, Leve 2 + 1 óculos de bônus do quiz. Frete grátis pra todo o Brasil.</p>
    </div>

    <h2 class="section-title">Como ganhar</h2>
    <ol class="steps">
      <li>Escolha aqui seu óculos de bônus</li>
      <li>No site, escolha 2 óculos da promoção Compre 1, Leve 2</li>
      <li>Finalize o pedido. Seu bônus já vai estar no carrinho</li>
    </ol>

    <h2 class="section-title">Escolha seu bônus</h2>
    <p class="hint">Você pode escolher 1 modelo.</p>
    <div class="products" id="products"></div>

    <div class="summary" aria-label="Como fica seu pedido">
      <div><span>Óculos 1 da promoção</span><span>R$ 297</span></div>
      <div><span>Óculos 2 da promoção</span><span class="muted">incluso</span></div>
      <div><span id="sum-bonus">Óculos de bônus</span><span class="muted">R$ 0</span></div>
      <div><span>Frete</span><span class="muted">grátis</span></div>
      <div><span>Total</span><span>R$ 297</span></div>
    </div>

    <h2 class="section-title">Regras</h2>
    <div class="panel">
      <ul class="rules">
        <li>Válido somente para quem respondeu o quiz completo.</li>
        <li>O bônus só é enviado em pedidos com 2 óculos da promoção Compre 1, Leve 2.</li>
        <li>Pedidos só com o óculos de bônus serão cancelados.</li>
        <li>Não é cumulativo com cupons de desconto.</li>
        <li>Um bônus por pessoa.</li>
        <li>Válido até <span id="validade">__VALIDADE__</span> ou enquanto durar o estoque.</li>
      </ul>
    </div>

    <h2 class="section-title">Perguntas rápidas</h2>
    <div class="panel">
      <details><summary>Posso usar cupom?</summary><p>Não. O bônus não é cumulativo com cupons de desconto.</p></details>
      <details><summary>Posso escolher qualquer modelo de bônus?</summary><p>O bônus é um dos modelos desta página.</p></details>
      <details><summary>Posso pedir só o óculos de bônus?</summary><p>Não. Ele vale junto com 2 óculos da promoção. Pedidos só com o bônus serão cancelados.</p></details>
      <details><summary>Posso trocar o óculos de bônus?</summary><p>Sim, na mesma política da loja: em até 7 dias corridos após o recebimento, sem sinais de uso. Veja em <a href="/trocas-e-devolucoes">Trocas e Devoluções</a>.</p></details>
    </div>

    <div class="sticky">
      <button class="cta" id="go-store" disabled>Escolha seu bônus</button>
      <p class="note">Depois é só escolher os 2 óculos da promoção no site.</p>
    </div>
  </section>

</div>
`
