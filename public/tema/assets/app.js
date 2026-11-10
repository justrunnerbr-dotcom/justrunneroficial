/* Lógica compartilhada: header, footer, carrinho (regra Compre 1 Leve 2), cards, toast. */
window.JR = window.JR || {};
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  JR.$ = $; JR.$$ = $$;

  /* Rodando no computador (localhost) = modo protótipo; publicado = sem marcas de protótipo e sem exemplos. */
  JR.LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const brl = v => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  JR.brl = brl;

  /* Preço: catalogo-real.js define JR.total/JR.cartTotals com a regra do site no ar (Leve 2 pelo preço de 1). */
  JR.total = JR.total || (n => Math.floor(n / 2) * JR.PRICE.pair + (n % 2) * JR.PRICE.one);
  JR.installment = v => brl(Math.round((v / JR.PRICE.installments) * 100) / 100);

  /* ---------- Header / footer ---------- */
  const page = document.body.dataset.page;
    /* 04/11: menu enxuto a pedido do dono — só Início · Compre 1 Leve 2 · Categorias. Oferta Exclusiva, Combos e
     Oferta Progressiva foram para dentro de Categorias; Lentes Mais Vendidas saiu do menu (páginas seguem no ar). */
  const navLinks = [
    ["Início", "/"],
    ["Compre 1 Leve 2", "colecao.html?cat=leve2", "hot"],
    ["Compre 1 Leve 3 🔥", "colecao.html?cat=l3", "hot"],   // 10/11: Black, 3 por R$ 297 nos óculos selecionados (JRL3-)
    ["Categorias", "colecao.html", "cats"]
  ];
  const cats = () => `<a href="colecao.html?cat=l3" class="dd-hot">Compre 1 Leve 3 · R$ 297</a><a href="colecao.html?cat=mais-vendidos" class="dd-hot">Mais vendidos</a>` +
    `<a href="colecao.html?cat=exclusiva" class="dd-hot">Oferta Exclusiva</a>` +
    `<a href="colecao.html?cat=leve3">Combos</a><a href="colecao.html?cat=oferta">Oferta Progressiva</a><span class="dd-sep"></span>` + (JR.CATEGORIAS || []).map(c => `<a href="colecao.html?cat=${c.slug}">${c.nome}</a>`).join("");
  /* Lentes Mais Vendidas (13/10, igual à JHF): uma página por cor de lente (JR.LENTES em catalogo-real.js) */
  const lentes = () => (JR.LENTES || []).map(l => `<a href="colecao.html?lente=${l.slug}"><span aria-hidden="true">${l.emoji}</span> ${l.nome}</a>`).join("");
  const navItem = ([t, h, c]) => c === "cats"
    ? `<div class="nav-dd"><button type="button" class="nav-dd-btn" aria-expanded="false" aria-controls="dd-cats">${t}<span class="dd-seta" aria-hidden="true"></span></button>
        <div class="dd-panel" id="dd-cats" role="region" aria-label="Categorias">${cats()}<span class="dd-sep"></span><a href="colecao.html" class="dd-all">Ver todas as coleções →</a></div></div>`
    : c === "lentes"
    ? `<div class="nav-dd"><button type="button" class="nav-dd-btn" aria-expanded="false" aria-controls="dd-lentes">${t}<span class="dd-seta" aria-hidden="true"></span></button>
        <div class="dd-panel" id="dd-lentes" role="region" aria-label="Lentes Mais Vendidas">${lentes()}</div></div>`
    : `<a href="${h}" class="${c || ""}">${t}</a>`;
  const logo = `<a href="/" class="logo" aria-label="Just Runner — início"><img src="fotos/logo.png" alt="Just Runner" width="96" height="38"></a>`;

  /* 10/11 (pedido do dono, igual à barra da JHF em modo diário): barra de contagem no topo. O prazo é a próxima
     meia-noite de Brasília, o MESMO para todo visitante (nunca por sessão/localStorage), e renova sozinho na virada.
     O texto diz "condições de hoje até a meia-noite", não "termina": a oferta segue enquanto o dono não avisar.
     Desligar: JR.PROMO.ativo = false. */
  JR.PROMO = { ativo: true, titulo: "Black November Just Runner", link: "colecao.html?cat=l3" };
  const meiaNoiteBRT = () => {
    const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).split("-").map(Number);
    return new Date(`${new Date(Date.UTC(hoje[0], hoje[1] - 1, hoje[2] + 1)).toISOString().slice(0, 10)}T00:00:00-03:00`).getTime();
  };
  const tickPromo = () => {
    const box = document.getElementById("promo-cd-blocos"); if (!box) return;
    const t = Math.max(0, Math.floor((meiaNoiteBRT() - Date.now()) / 1000));
    const v = { h: Math.floor(t / 3600), min: Math.floor((t % 3600) / 60), seg: t % 60 };
    box.querySelectorAll("[data-pc]").forEach(el => { el.textContent = String(v[el.dataset.pc]).padStart(2, "0"); });
  };
  setInterval(tickPromo, 1000);

  function renderHeader() {
    const el = $("#header");
    if (!el) return;
    el.outerHTML = `
      <!-- 06/11: a pedido do dono, a faixa preta "Compre 1, Leve 2 por R$ 297" saiu e a faixa de benefícios (marquee) subiu pro topo, acima do logo. -->
      ${JR.PROMO && JR.PROMO.ativo ? `<a class="promo-cd" href="${JR.PROMO.link}" aria-label="${JR.PROMO.titulo}"><span class="pc-tit">${JR.PROMO.titulo}</span><span class="pc-sub">Condições de hoje até a meia-noite</span><span class="pc-blocos" id="promo-cd-blocos">${["h", "min", "seg"].map(r => `<span class="pc-b"><b data-pc="${r}">--</b><i>${r}</i></span>`).join("")}</span></a>` : ""}
      <div class="marquee" aria-label="Benefícios"><div class="marquee-track">${Array(2).fill([
        ["truck", "Frete grátis acima de R$ 200"], ["card", "Parcele em até 3x sem juros"], ["swap", "Troca em até 7 dias"],
        ["polar", "Lentes polarizadas UV400"], ["lock", "Checkout seguro Yampi"]
      ].map(([i, t]) => `<span>${JR.icon[i]}${t}</span>`).join("")).join("")}</div></div>
      <header class="header" id="site-header">
        <div class="wrap">
          <button class="icon-btn menu-btn" data-open-menu aria-label="Abrir menu">${JR.icon.menu}</button>
          ${logo}
          <nav class="nav" aria-label="Principal">${navLinks.map(navItem).join("")}</nav>
          <div class="icons">
            <a class="icon-btn" aria-label="Buscar" href="/busca">${JR.icon.search}</a>
            <button class="icon-btn" aria-label="Carrinho" data-open-cart>${JR.icon.bag}<span class="cart-count" id="cart-count">0</span></button>
          </div>
        </div>
      </header>
      <div class="mobile-nav" id="mobile-nav"><div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">${logo}<button class="icon-btn" data-close-menu aria-label="Fechar">${JR.icon.close}</button></div>
        ${navLinks.map(([t, h, c]) => c === "cats"
          ? `<details class="m-cats"><summary>${t}<span class="dd-seta" aria-hidden="true"></span></summary>${cats()}<a href="colecao.html" class="dd-all">Ver todas as coleções →</a></details>`
          : c === "lentes"
          ? `<details class="m-cats"><summary>${t}<span class="dd-seta" aria-hidden="true"></span></summary>${lentes()}</details>`
          : `<a href="${h}" data-close-menu>${t}</a>`).join("")}
      </div></div>`;
  }

  function renderFooter() {
    const el = $("#footer");
    if (!el) return;
    el.outerHTML = `
      <footer class="footer" id="ajuda">
        <div class="wrap">
          <div class="cols">
            <div>
              ${logo}
              <div class="sig">Sua corrida como você nunca viu.</div>
              <p style="margin:0;max-width:32ch">Óculos de performance para quem está em movimento. Proteção, conforto e estilo no mesmo produto.</p>
              <p style="margin:14px 0 0"><a href="https://instagram.com/${JR.CONTACT.instagram}" target="_blank" rel="noopener" style="display:inline-flex;gap:8px;align-items:center"><span style="width:18px;height:18px;display:inline-block">${JR.icon.insta}</span>@${JR.CONTACT.instagram}</a></p>
            </div>
            <div><h4>Loja</h4><ul>
              <li><a href="/#oferta">Compre 1 Leve 2</a></li><li><a href="colecao.html">Todos os modelos</a></li>
              <li><a href="/#estilos">Comprar por estilo</a></li><li><a href="/#lentes">Qual lente escolher</a></li>
              <li><a href="sobre.html">Sobre a Just Runner</a></li></ul></div>
            <div><h4>Ajuda</h4><ul>
              <li><a href="faq.html">Perguntas frequentes</a></li><li><a href="frete-e-entrega.html">Frete e entrega</a></li>
              <li><a href="trocas-e-devolucoes.html">Trocas e devoluções</a></li><li><a href="contato.html">Contato</a></li>
              <li><a href="politica-de-privacidade.html">Política de privacidade</a></li></ul></div>
            <div><h4>Atendimento</h4><ul>
              <li><a href="${JR.waLink()}" target="_blank" rel="noopener">WhatsApp ${JR.CONTACT.phone}</a></li>
              <li>${JR.CONTACT.hours}</li><li><a href="mailto:${JR.CONTACT.email}">${JR.CONTACT.email}</a></li></ul>
              <div class="pay">${JR.CONTACT.payments.map(p => `<span>${p}</span>`).join("")}</div>
              <p style="margin:10px 0 0;font-size:12px">Checkout seguro Yampi · Parcele em até 3x sem juros</p></div>
          </div>
          <div class="legal"><span>© 2026 Just Runner · CNPJ ${JR.CONTACT.cnpj} · justrunner.com.br</span>${JR.LOCAL ? "<span>Protótipo de layout — não é a loja em produção</span>" : ""}</div>
        </div>
      </footer>
      <div class="overlay" id="overlay"></div>
      <aside class="drawer" id="drawer" aria-label="Carrinho" aria-hidden="true">
        <div class="drawer-head"><h3>Carrinho <span class="cm-count" id="drawer-count" hidden>0</span></h3><button data-close-cart aria-label="Fechar carrinho">${JR.icon.close}</button></div>
        <div class="ship-meter" id="ship-meter"></div>
        <div class="drawer-body" id="drawer-body"></div>
        <div class="drawer-foot" id="drawer-foot"></div>
      </aside>
      <div class="modal" id="pick-modal" role="dialog" aria-modal="true" aria-labelledby="pick-title">
        <div class="modal-head"><div><h3 id="pick-title">Escolha seu segundo estilo</h3><p>${JR.OP_PADRAO ? "Leve 2 por R$ 297, com frete grátis." : "Leve 2 pelo preço de 1: o 2º óculos sai grátis."}</p></div>
        <button class="icon-btn" data-close-modal aria-label="Fechar" style="color:#111">${JR.icon.close}</button></div>
        <div class="grid-4" id="pick-grid"></div>
      </div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      ${JR.LOCAL ? `<div class="proto-flag">Protótipo · ${page === "pdp" ? '<a href="/">ver Home</a>' : '<a href="produto.html?p=radar-ev">ver PDP</a>'}</div>` : ""}`;
  }

  /* ---------- Toast ---------- */
  let tt;
  JR.toast = msg => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(tt);
    tt = setTimeout(() => t.classList.remove("show"), 2600);
  };

  /* ---------- Carrinho ---------- */
  const KEY = "jr-proto-cart";
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { cart = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* sem storage */ } };
  const units = () => cart.reduce((a, i) => a + i.qty, 0);

  JR.addToCart = (slug, vIdx = 0, lens, qty = 1, opts = {}) => {
    const p = JR.bySlug(slug);
    const v = p.variants[vIdx] || p.variants[0];
    lens = lens && v.lenses.includes(lens) ? lens : v.lenses[0];
    const l3 = !!(opts.l3 && JR.l3Of && JR.l3Of(slug, vIdx, lens));   // Compre 1 Leve 3 (JRL3-, 3 por R$ 297): só quando a página/card pediu
    const oe = !l3 && !!(opts.oe && JR.oeOf && JR.oeOf(slug, vIdx, lens));   // Oferta Exclusiva (JROE, R$ 147,90): só quando a página/card pediu
    const op = oe || l3 ? false : JR.querOp ? JR.querOp(slug, vIdx, lens, opts.op) : false;   // versão JROP (R$ 175) quando existe; padrão do site desde 19/10
    const found = cart.find(i => i.slug === slug && i.v === vIdx && i.lens === lens && !!i.op === op && !!i.oe === oe && !!i.l3 === l3);
    if (found) found.qty += qty; else cart.push(l3 ? { slug, v: vIdx, lens, qty, l3: true } : oe ? { slug, v: vIdx, lens, qty, oe: true } : op ? { slug, v: vIdx, lens, qty, op: true } : { slug, v: vIdx, lens, qty });
    { const l = JR.realLens && JR.realLens(slug, vIdx, lens);
      JR.meta && JR.meta("AddToCart", { content_ids: [JR.skuOf ? JR.skuOf(slug, vIdx, lens, op, oe, l3) : (l ? l.sku : slug)], content_name: JR.cardName ? JR.cardName(p, v) : p.name, content_category: p.name,
        value: (JR.priceOf ? JR.priceOf(slug, vIdx, lens, op, oe, l3) : JR.PRICE.one) * qty, currency: "BRL", content_type: "product", num_items: qty }); }
    save(); renderCart();
    const c = $("#cart-count"); c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
    if (opts.open !== false) openCart();
    /* 06/11 (análise de conversão): com o carrinho aberto o aviso "Adicionado" cobria a caixa da promoção e o frete.
       O próprio carrinho já diz o que mudou, então o aviso só aparece quando o carrinho não abre. */
    if (opts.open !== false && slug !== "case") return;
    const n = units();
    const tt = JR.cartTotals ? JR.cartTotals(cart) : null;
    if (slug === "case") JR.toast("Case adicionado ao carrinho.");
    else if (l3) JR.toast(tt && tt.l3Qtd % 3 === 0 ? "Compre 1 Leve 3 aplicado: 3 óculos por R$ 297." : `Adicionado. Escolha mais ${3 - (tt ? tt.l3Qtd % 3 : 1)}: ${tt && tt.l3Qtd % 3 === 2 ? "sai grátis" : "saem grátis"}.`);
    else if (oe) JR.toast("Adicionado: Oferta Exclusiva por R$ 147,90.");
    else if (op) JR.toast(tt && tt.opQtd >= 2 ? "Leve 2 aplicado: R$ 53 de desconto." : "Adicionado. Leve mais 1: os 2 saem por R$ 297, com frete grátis.");
    else if (n === 1 && !JR.isCombo?.(slug) && !JR.OP_PADRAO) JR.toast("Adicionado. Leve mais um: o 2º óculos sai grátis.");
    else if (tt && tt.desconto && tt.oculos % 2 === 0) JR.toast(`Leve 2 pelo preço de 1 aplicado: ${brl(tt.desconto)} de desconto.`);
    else JR.toast("Adicionado ao carrinho.");
  };

  JR.AVAL_CARRINHO = [
    { n: "@dra.luanaribeiro", t: "Ótimo custo benefício, lentes clarinhas de policarbonato com proteção UV400 ameiiiii, +1 na minha coleção hahahah!" },
    { n: "@aannieoliveira", t: "O melhor óculos de corrida! Qualidade é absurda e o envio foi muito rápido" },
    { n: "Kelvin Yamamoto", t: "Já tenho três óculos dessa loja, o material é muito bom e o encaixe no rosto é perfeito para corrida!" },
    { n: "Yuri Farias", t: "O melhor óculos para corrida! Fiquei surpreso com a qualidade das lentes, e a entrega também foi muito rápida" }
  ];
  JR._avalIdx = 0;
  setInterval(() => {
    const el = document.getElementById("cm-aval-txt");
    if (!el || !document.querySelector("#drawer.open") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    JR._avalIdx++; const a = JR.AVAL_CARRINHO[JR._avalIdx % JR.AVAL_CARRINHO.length];
    el.classList.add("troca"); setTimeout(() => { el.innerHTML = `“${a.t}”<span>${a.n}</span>`; el.classList.remove("troca"); }, 250);
  }, 4500);

  function renderCart() {
    const n = units();
    const count = $("#cart-count");
    if (count) { count.textContent = n; count.classList.toggle("show", n > 0); }
    const body = $("#drawer-body"), foot = $("#drawer-foot"), meter = $("#ship-meter");
    if (!body) return;
    /* Mesma conta do site no ar (JR.cartTotals): 2º óculos grátis, combos fora da promoção. */
    const tt = JR.cartTotals ? JR.cartTotals(cart) : { subtotal: n * JR.PRICE.one, total: JR.total(n), desconto: n * JR.PRICE.one - JR.total(n), oculos: n };
    const full = tt.subtotal, total = tt.total, saving = tt.desconto;
    const free = total > JR.PRICE.freeShipping;
    /* 15/10: quanto falta pro frete grátis (Oferta Progressiva de R$ 175 fica abaixo dos R$ 200) */
    const falta = Math.max(0, JR.PRICE.freeShipping - total);
    /* 26/10 (print do dono, carrinho da JHF): caixa de progresso no topo (2 por R$ 297 + frete grátis), item limpo com preço e lixeira,
       total com parcelamento, botão preto "Finalizar compra segura" e o 2º óculos como botão secundário. Sem cronômetro: a oferta não
       tem hora pra acabar (contador que reinicia é urgência falsa) e sem o case de R$ 35 no meio do caminho do checkout. */
    const dc = $("#drawer-count"); if (dc) { dc.textContent = n; dc.hidden = !n; }
    const temOe = cart.some(i => i.oe);
    /* Compre 1 Leve 3 (10/11): quantos faltam pra fechar o trio */
    const l3Falta = tt.l3Qtd ? (3 - (tt.l3Qtd % 3)) % 3 : 0;
    /* 06/11 (análise de conversão): a conta do 2º óculos em reais (R$ 297 − preço do 1º) (a linha "frete a partir de R$ 12,62" saiu a pedido do dono). */
    const opItem = cart.find(i => i.op);
    const segundo = tt.opQtd === 1 && opItem ? 297 - (JR.priceOf ? JR.priceOf(opItem.slug, opItem.v, opItem.lens, true, false) : 175) : 0;
    const promo = tt.l3Qtd && l3Falta ? `🎁 Escolha mais <b>${l3Falta} óculos</b> do <a href="colecao.html?cat=l3"><b>Compre 1 Leve 3</b></a>: ${l3Falta > 1 ? "saem" : "sai"} <b>grátis</b>`
      : tt.l3Qtd ? `✅ <b>Compre 1 Leve 3</b> aplicado: 3 óculos por R$ 297`
      : tt.opQtd === 1 && segundo > 0 ? `🎁 Adicione mais 1 por só <b>${brl(segundo)}</b> e ganhe <b>frete grátis</b>`
      : tt.opQtd === 2 ? `✅ <b>2 óculos por R$ 297</b> aplicado: sai ${brl(148.5)} cada` : tt.opQtd > 2 ? `✅ <b>2 por R$ 297</b> aplicado` : temOe ? `🔥 <b>Oferta Exclusiva</b>: R$ 147,90 cada` : "";
    const frete = free ? `🚚 <b>Frete grátis</b> garantido` : `🚚 Faltam <b>${brl(falta)}</b> para frete grátis`;
    meter.hidden = !n;
    meter.innerHTML = n ? `<div class="cm-box">${promo ? `<div class="cm-promo">${promo}</div>` : ""}<div class="track"><i style="width:${Math.min(100, (total / JR.PRICE.freeShipping) * 100)}%"></i></div><div class="cm-frete">${frete}</div></div>` : "";
    if (!n) {
      body.innerHTML = `<div class="empty">${JR.glasses({ shape: "shield", lens: "Espelhada" })}<p>Seu carrinho está vazio.<br>Escolha. Coloque. Vá.</p><a class="btn btn-dark" href="/#oferta">Escolher meu estilo ${JR.icon.arrow}</a></div>`;
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = `<div class="cm-label">Seus itens</div>` + cart.map((i, k) => {
      const p = JR.bySlug(i.slug), v = p.variants[i.v];
      const preco = (JR.priceOf ? JR.priceOf(i.slug, i.v, i.lens, i.op, i.oe, i.l3) : JR.PRICE.one) * i.qty;
      const sub = p.slug === "case" ? "Acessório · protege seu óculos" : `${v.name === "Padrão" ? "" : v.name} ${JR.optLabel(i.lens)}${i.l3 ? " · Compre 1 Leve 3" : i.oe ? " · Oferta Exclusiva" : ""}`.trim();
      return `<div class="line cm-line">
        <a class="lm" href="produto.html?p=${p.slug}&c=${i.v}&l=${encodeURIComponent(i.lens)}${i.l3 ? "&l3=1" : i.oe ? "&oe=1" : i.op ? "&op=1" : ""}">${JR.thumb ? JR.thumb(p.slug, i.v, i.lens) : JR.glasses({ shape: p.shape, frame: v.frame, lens: i.lens, shadow: false })}</a>
        <div class="cm-info"><div class="ln">${p.name}</div><div class="lv">${sub}</div></div>
        <div class="cm-dir"><div class="cm-preco">${brl(preco)}</div>
          <div class="cm-acoes"><div class="lq"><button data-q="${k}" data-d="-1" aria-label="Diminuir">−</button><span>${i.qty}</span><button data-q="${k}" data-d="1" aria-label="Aumentar">+</button></div>
          <button class="rm cm-lixo" data-rm="${k}" aria-label="Remover ${p.name}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg></button></div></div>
      </div>`;
    }).join("");
    /* 06/11 (análise de conversão, pedido do dono): avaliações no carrinho. Os 4 depoimentos são os mesmos que a loja já mostra
       no checkout da Yampi (seguro.justrunner.com.br, com 5 estrelas), copiados como estão; trocam sozinhos a cada 4,5 s.
       Embaixo, as fotos/vídeos reais de clientes (JR.DEPOIMENTOS, sem parceiro/publi) abrem a janela da aba "Avaliações". */
    const AVAL = JR.AVAL_CARRINHO || [];
    /* 06/11 (pedido do dono): "Ver fotos e vídeos" abre uma galeria DENTRO do carrinho (fileira deslizante), sem sair dele. */
    const depsAll = (JR.DEPOIMENTOS || []).filter(d => !d.parceiro && (d.capa || d.tipo === "foto"));
    const deps = depsAll.slice(0, 4);
    const temJanela = depsAll.length > 0;
    const galeria = JR._avalAberto ? `<div class="cm-galeria">${depsAll.slice(0, 10).map((d, k) => d.tipo === "video"
      ? `<button type="button" class="cm-vid" data-cm-vid aria-label="Tocar vídeo de cliente ${k + 1}"><video src="${d.src}" poster="${d.capa}" preload="none" playsinline loop></video><span class="cm-play" aria-hidden="true"></span></button>`
      : `<img src="${d.src}" alt="Foto de cliente usando Just Runner" loading="lazy" decoding="async">`).join("")}</div>` : "";
    if (AVAL.length) {
      const a = AVAL[JR._avalIdx % AVAL.length];
      body.innerHTML += `<div class="cm-aval" aria-label="Avaliações de clientes">
        <div class="cm-aval-top"><span class="cm-estrelas" role="img" aria-label="5 de 5 estrelas">★★★★★</span><b>Avaliações de clientes</b></div>
        <p class="cm-aval-txt" id="cm-aval-txt">“${a.t}”<span>${a.n}</span></p>
        ${deps.length && temJanela ? `<button type="button" class="cm-aval-ver" data-ver-clientes aria-expanded="${!!JR._avalAberto}">${JR._avalAberto ? "Fechar fotos e vídeos" : `<span class="cm-prova-fotos">${deps.map(d => `<img src="${d.capa || d.src}" alt="" loading="lazy" decoding="async">`).join("")}</span>Ver fotos e vídeos de clientes`} <span class="cm-seta">${JR.icon.arrow}</span></button>${galeria}` : ""}
      </div>`;
    }
    /* Bônus do quiz: não é item do carrinho, a Yampi entrega como brinde pelo cupom (JR.checkoutUrl). */
    const qc = JR.quizCupom && JR.quizCupom();
    if (qc) {
      const ok = JR.quizLiberado(cart);
      body.innerHTML += `<div class="line cm-line" style="border:1px dashed ${ok ? "#16a34a" : "#d4d4d8"};border-radius:8px;padding:8px">
        <div class="lm">${qc.imagem ? `<img src="${qc.imagem}" alt="" style="width:100%;height:100%;object-fit:contain">` : "🎁"}</div>
        <div class="cm-info"><div class="ln">🎁 Bônus do quiz</div><div class="lv">${qc.nome || "Seu óculos bônus"}</div>
          <div class="lv" style="font-weight:700;color:${ok ? "#15803d" : "#b45309"}">${ok ? "✓ Liberado, entra no checkout" : `Falta ${brl(JR.QUIZ_MIN - full)} pra liberar`}</div></div>
        <div class="cm-dir"><div class="cm-preco">Grátis</div></div>
      </div>`;
    }
    const parcela = total >= 100 ? `em até 3x sem juros no cartão` : "";
    foot.innerHTML = `
      <div class="row"><span>${n} ${n > 1 ? "itens" : "item"}</span><span>${brl(full)}</span></div>
      ${tt.desconto - (tt.descontoL3 || 0) ? `<div class="row save"><span>Leve 2 pelo preço de 1</span><span>− ${brl(tt.desconto - (tt.descontoL3 || 0))}</span></div>` : ""}
      ${tt.descontoL3 ? `<div class="row save"><span>Compre 1 Leve 3</span><span>− ${brl(tt.descontoL3)}</span></div>` : ""}
      ${tt.descontoOp ? `<div class="row save"><span>Desconto 2 por R$ 297</span><span>− ${brl(tt.descontoOp)}</span></div>` : ""}
      <div class="row total cm-total"><span>Total</span><span>${brl(total)}${parcela ? `<small>${parcela}</small>` : ""}</span></div>
      <button class="btn btn-block cm-finalizar" data-checkout>${JR.icon.lock} Finalizar compra segura</button>
      ${tt.opQtd === 1 ? `<a class="btn btn-block cm-segundo" href="colecao.html?cat=leve2">Escolher meu 2º óculos por ${segundo > 0 ? brl(segundo) : "R$ 297 os 2"}</a>` : ""}
      <div class="pay-note cm-selos">🔒 Pagamento seguro · 💳 Pix e cartão · 📦 Entrega rastreada</div>`;
  }

  const overlay = () => $("#overlay");
  function openCart() { renderCart(); $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden", "false"); overlay().classList.add("open"); }
  function closeAll() {
    if (JR._avalAberto) { JR._avalAberto = false; renderCart(); }
    $("#drawer")?.classList.remove("open"); $("#drawer")?.setAttribute("aria-hidden", "true");
    $("#pick-modal")?.classList.remove("open"); overlay()?.classList.remove("open");
  }
  JR.openCart = openCart;

  JR.openPicker = (exclude) => {
    $("#pick-grid").innerHTML = JR.PRODUCTS.filter(p => p.slug !== exclude).slice(0, 8)
      .map(p => JR.card(p.slug, 0, null, { pick: true })).join("");
    $("#drawer").classList.remove("open");
    $("#pick-modal").classList.add("open"); overlay().classList.add("open");
    bindCards($("#pick-grid"));
  };

  /* ---------- Card de produto ---------- */
  /* Nome do card igual ao produto do site no ar: modelo + cor ("Radar EV Piet"); combo pelo nome dele ("Combo 3"). */
  JR.cardName = (p, v) => p.combo ? v.name : (!v || v.name === "Padrão" ? p.name : `${p.name} ${v.name}`);
  /* Bolinhas de lente no card (home, 15/10): metade armação, metade lente, igual à página do produto. Trocam foto e link ali mesmo. */
  const MAX_LDOT = 6;
  JR.lenteDots = (p, vIdx, lens, href) => {
    const v = p.variants[vIdx], cor = l => JR.lensCss(l.split(/\s*[+·]\s*/)[0]);
    return `<div class="swatches lente-dots" role="radiogroup" aria-label="Lentes">${v.lenses.slice(0, MAX_LDOT).map(l =>
      `<button class="ldot ${l === lens ? "on" : ""}" role="radio" aria-checked="${l === lens}" data-ldot="${l}" aria-label="Lente ${l}" title="Lente ${l}"><i style="background:${v.frame}"></i><i style="background:${cor(l)}"></i></button>`).join("")}${
      v.lenses.length > MAX_LDOT ? `<a class="more" href="${href}">+${v.lenses.length - MAX_LDOT}</a>` : ""}</div>`;
  };
  /* 15/10: lente no card, abaixo do nome. Cada lente é um card na categoria e todos se chamavam só "Minute Preta". */
  JR.cardLente = l => !l || l === "Único" ? "" : (JR.isLens(l.split(/\s*[+·]\s*/)[0]) ? `Lente ${l}` : l);
  JR.card = (slug, vIdx = 0, lens, o = {}) => {
    const p = JR.bySlug(slug), v = p.variants[vIdx];
    lens = lens || v.lenses[0];
    const l3 = !!(o.l3 && JR.l3Of && JR.l3Of(slug, vIdx, lens));
    const oe = !l3 && !!(o.oe && JR.oeOf && JR.oeOf(slug, vIdx, lens));
    const op = oe || l3 ? false : JR.querOp ? JR.querOp(slug, vIdx, lens, o.op) : false;
    const href = `produto.html?p=${slug}&c=${vIdx}&l=${encodeURIComponent(lens)}${l3 ? "&l3=1" : oe ? "&oe=1" : op && !JR.OP_PADRAO ? "&op=1" : ""}`;
    const dots = p.variants.slice(0, 5).map((x, i) =>
      `<button class="dot ${i === vIdx ? "on" : ""}" style="background:${x.frame}" data-dot="${i}" aria-label="Armação ${x.name}" title="${x.name}"></button>`).join("");
    const lensCount = new Set(p.variants.flatMap(x => x.lenses).filter(JR.isLens)).size;
    /* Modelo de cor única ("Padrão": Half Jacket, Encoder, Dartboard) guarda as opções como "lentes", e nem todas
       têm nome de lente (Cooper, Full Black…): conta todas como opções em vez de mostrar "1 lente" ou nada. */
    const totalOpc = new Set(p.variants.flatMap(x => x.lenses)).size;
    const opcoes = p.variants.length === 1 && totalOpc > lensCount ? `${totalOpc} opções` : lensCount ? `${lensCount} ${lensCount > 1 ? "lentes" : "lente"}` : "";
    return `<article class="card ${o.mini ? "mini" : ""}" data-slug="${slug}" data-v="${vIdx}" data-lens="${lens}"${l3 ? ' data-l3="1"' : oe ? ' data-oe="1"' : op ? ' data-op="1"' : ""}>
      ${o.tag ? `<span class="tag ${o.tag === "Novo" ? "new" : ""}">${o.tag}</span>` : ""}
      <a class="media" href="${href}" aria-label="${p.name}">${JR.thumb ? JR.thumb(slug, vIdx, lens) : JR.glasses({ shape: p.shape, frame: v.frame, lens })}</a>
      <div class="info">
        <a class="name" href="${href}">${JR.cardName(p, v)}</a>${p.combo ? "" : `<div class="card-lente">${JR.cardLente(lens)}</div>`}
        ${o.mini ? "" : l3 ? `<div class="price">3 por ${brl(297)}</div><div class="pair"><b>Compre 1 Leve 3</b> · sai ${brl(99)} cada</div>` : oe ? `<div class="price"><s class="de">${brl(JR.priceOf(slug, vIdx, lens, true))}</s> ${brl(JR.priceOf(slug, vIdx, lens, false, true))}</div><div class="pair"><b>Oferta Exclusiva</b> · Parcele em até 3x sem juros</div>` : op ? `<div class="price">${brl(JR.priceOf(slug, vIdx, lens, true))}</div><div class="pair"><b>2 por R$ 297</b> · ${JR.OP_PADRAO ? "Parcele em até 3x sem juros" : "Oferta Progressiva"}</div>` : (() => { const pr = JR.minPrice ? JR.minPrice(slug) : JR.PRICE.one, lz = JR.realLens && JR.realLens(slug, vIdx, lens), de = lz && lz.de;
          return `<div class="price">${de ? `<s class="de">${brl(de)}</s> ` : ""}${brl(pr)}</div><div class="pair">${p.combo ? "<b>3 óculos</b> no kit · Parcele em até 3x sem juros" : o.semLeve2 || JR.OP_PADRAO ? "Parcele em até 3x sem juros" : "<b>Leve 2 pelo preço de 1</b> · Parcele em até 3x sem juros"}</div>`; })()}
        ${oe || l3 ? "" : o.lentes && !p.combo && v.lenses.length > 1 ? JR.lenteDots(p, vIdx, lens, href) : `<div class="swatches" ${p.combo ? "hidden" : ""}>${dots}${p.variants.length > 5 ? `<span class="more">+${p.variants.length - 5}</span>` : ""}${opcoes ? `<span class="more">· ${opcoes}</span>` : ""}</div>`}
        ${o.mini ? "" : `<button class="quick" data-add>${o.pick ? "Escolher este" : "Adicionar ao carrinho"}</button>`}
      </div>
    </article>`;
  };

  function bindCards(root = document) {
    $$(".card", root).forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = 1;
      const p = JR.bySlug(card.dataset.slug);
      card.addEventListener("click", e => {
        const dot = e.target.closest("[data-dot]");
        if (dot) {
          e.preventDefault();
          const i = +dot.dataset.dot, v = p.variants[i];
          const lens = v.lenses.includes(card.dataset.lens) ? card.dataset.lens : v.lenses[0];
          card.dataset.v = i; card.dataset.lens = lens;
          const nm = card.querySelector(".name"); if (nm) nm.textContent = JR.cardName(p, v);
          card.querySelector(".media").innerHTML = JR.thumb ? JR.thumb(p.slug, i, lens) : JR.glasses({ shape: p.shape, frame: v.frame, lens });
          const href = `produto.html?p=${p.slug}&c=${i}&l=${encodeURIComponent(lens)}${card.dataset.op && !JR.OP_PADRAO ? "&op=1" : ""}`;
          card.querySelectorAll("a").forEach(a => a.href = href);
          card.querySelectorAll(".dot").forEach(d => d.classList.toggle("on", d === dot));
          const cl = card.querySelector(".card-lente"); if (cl) cl.textContent = JR.cardLente(lens);
        }
        const ld = e.target.closest("[data-ldot]");
        if (ld) {
          e.preventDefault();
          const i = +card.dataset.v, lens = ld.dataset.ldot;
          card.dataset.lens = lens;
          card.querySelector(".media").innerHTML = JR.thumb ? JR.thumb(p.slug, i, lens) : JR.glasses({ shape: p.shape, frame: p.variants[i].frame, lens });
          const href = `produto.html?p=${p.slug}&c=${i}&l=${encodeURIComponent(lens)}${card.dataset.op && !JR.OP_PADRAO ? "&op=1" : ""}`;
          card.querySelectorAll("a").forEach(a => a.href = href);
          card.querySelectorAll(".ldot").forEach(d => { d.classList.toggle("on", d === ld); d.setAttribute("aria-checked", d === ld); });
          const cl = card.querySelector(".card-lente"); if (cl) cl.textContent = JR.cardLente(lens);
        }
        if (e.target.closest("[data-add]")) {
          e.preventDefault();
          const inModal = !!card.closest("#pick-modal");
          JR.addToCart(p.slug, +card.dataset.v, card.dataset.lens, 1, { op: !!card.dataset.op, oe: !!card.dataset.oe, l3: !!card.dataset.l3 });   // card já decidiu (data-op) pelo JR.querOp
          if (inModal) $("#pick-modal").classList.remove("open");
        }
      });
    });
  }
  JR.bindCards = bindCards;

  /* ---------- Revelar ao rolar ---------- */
  function reveal() {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return els.forEach(e => e.classList.add("in"));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    els.forEach(e => io.observe(e));
  }

  /* ---------- Boot ---------- */
  JR.boot = function () {
    renderHeader(); tickPromo(); renderFooter(); renderCart(); bindCards(); reveal();
    const header = $("#site-header");
    const onScroll = () => header.classList.toggle("scrolled", scrollY > 10);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    document.addEventListener("click", e => {
      const t = e.target;
      const dd = t.closest(".nav-dd-btn");
      $$(".nav-dd").forEach(x => { const open = dd && x.contains(dd) ? !x.classList.contains("open") : false; x.classList.toggle("open", open); x.querySelector(".nav-dd-btn").setAttribute("aria-expanded", open); });
      if (t.closest("[data-open-cart]")) { openCart(); }
      if (t.closest("[data-close-cart]") || t.closest("[data-close-modal]") || t === overlay()) closeAll();
      if (t.closest("[data-open-menu]")) $("#mobile-nav").classList.add("open");
      if (t.closest("[data-close-menu]") || t.id === "mobile-nav") $("#mobile-nav").classList.remove("open");
      const q = t.closest("[data-q]");
      if (q) { const i = cart[+q.dataset.q]; i.qty += +q.dataset.d; if (i.qty < 1) cart.splice(+q.dataset.q, 1); save(); renderCart(); }
      const rm = t.closest("[data-rm]");
      if (rm) { cart.splice(+rm.dataset.rm, 1); save(); renderCart(); }
      const vb = t.closest("[data-cm-vid]");
      if (vb) { const v = vb.querySelector("video"); const tocar = v.paused;
        $$(".cm-vid video").forEach(x => { x.pause(); x.parentElement.classList.remove("tocando"); });
        if (tocar) { v.muted = false; v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); vb.classList.add("tocando"); } }
      if (t.closest("[data-ver-clientes]")) { JR._avalAberto = !JR._avalAberto; renderCart();
        if (JR._avalAberto) $(".cm-galeria")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
      if (t.closest("[data-pick]")) JR.openPicker(cart[cart.length - 1]?.slug);
      if (t.closest("[data-case]")) JR.addToCart("case", 0, "Único", 1);
      if (t.closest("[data-checkout]") && JR.meta) { const tt = JR.cartTotals ? JR.cartTotals(cart) : { total: 0 };
        JR.meta("InitiateCheckout", { content_ids: cart.map(i => JR.skuOf(i.slug, i.v, i.lens, i.op, i.oe, i.l3)).filter(Boolean), value: tt.total, currency: "BRL", num_items: cart.reduce((a, i) => a + i.qty, 0) }); }
      if (t.closest("[data-checkout]")) { const u = JR.checkoutUrl && JR.checkoutUrl(cart); if (u) location.href = u; else JR.toast("Não consegui montar o checkout: atualize a página e tente de novo."); }
      const soon = t.closest("[data-soon]");
      if (soon) { e.preventDefault(); JR.toast(`${soon.dataset.soon}: fora do escopo deste protótipo.`); }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeAll(); $("#mobile-nav").classList.remove("open"); } });
  };
})();
