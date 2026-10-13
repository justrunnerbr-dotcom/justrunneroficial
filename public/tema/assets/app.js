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
  /* Menu igual ao site antigo (13/10): Início · Compre 1 Leve 2 · Combos · Categorias (lista) · Oferta Progressiva */
  const navLinks = [
    ["Início", "index.html"],
    ["Compre 1 Leve 2", "colecao.html?cat=leve2", "hot"],
    ["Combos", "colecao.html?cat=leve3"],
    ["Categorias", "colecao.html", "cats"],
    ["Oferta Progressiva", "colecao.html?cat=oferta"]
  ];
  const cats = () => `<a href="colecao.html?cat=mais-vendidos" class="dd-hot">Mais vendidos</a>` + (JR.CATEGORIAS || []).map(c => `<a href="colecao.html?cat=${c.slug}">${c.nome}</a>`).join("");
  const navItem = ([t, h, c]) => c === "cats"
    ? `<div class="nav-dd"><button type="button" class="nav-dd-btn" aria-expanded="false" aria-controls="dd-cats">${t}<span class="dd-seta" aria-hidden="true"></span></button>
        <div class="dd-panel" id="dd-cats" role="region" aria-label="Categorias">${cats()}<span class="dd-sep"></span><a href="colecao.html" class="dd-all">Ver todas as coleções →</a></div></div>`
    : `<a href="${h}" class="${c || ""}">${t}</a>`;
  const logo = `<a href="index.html" class="logo" aria-label="Just Runner — início"><img src="fotos/logo.png" alt="Just Runner" width="96" height="38"></a>`;

  function renderHeader() {
    const el = $("#header");
    if (!el) return;
    el.outerHTML = `
      <div class="topbar"><b>Compre 1, Leve 2 por R$ 297</b><span class="sep hide-sm">|</span><span class="hide-sm">Frete grátis acima de R$ 200</span><span class="sep hide-sm">|</span><span class="hide-sm">Parcele em até 12x</span></div>
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
      <div class="marquee" aria-label="Benefícios"><div class="marquee-track">${Array(2).fill([
        ["truck", "Frete grátis acima de R$ 200"], ["card", "Parcele em até 12x"], ["swap", "Troca em até 7 dias"],
        ["polar", "Lentes polarizadas UV400"], ["lock", "Checkout seguro Yampi"]
      ].map(([i, t]) => `<span>${JR.icon[i]}${t}</span>`).join("")).join("")}</div></div>
      <div class="mobile-nav" id="mobile-nav"><div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">${logo}<button class="icon-btn" data-close-menu aria-label="Fechar">${JR.icon.close}</button></div>
        ${navLinks.map(([t, h, c]) => c === "cats"
          ? `<details class="m-cats"><summary>${t}<span class="dd-seta" aria-hidden="true"></span></summary>${cats()}<a href="colecao.html" class="dd-all">Ver todas as coleções →</a></details>`
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
              <li><a href="index.html#oferta">Compre 1 Leve 2</a></li><li><a href="colecao.html">Todos os modelos</a></li>
              <li><a href="index.html#estilos">Comprar por estilo</a></li><li><a href="index.html#lentes">Qual lente escolher</a></li>
              <li><a href="sobre.html">Sobre a Just Runner</a></li></ul></div>
            <div><h4>Ajuda</h4><ul>
              <li><a href="faq.html">Perguntas frequentes</a></li><li><a href="frete-e-entrega.html">Frete e entrega</a></li>
              <li><a href="trocas-e-devolucoes.html">Trocas e devoluções</a></li><li><a href="contato.html">Contato</a></li>
              <li><a href="politica-de-privacidade.html">Política de privacidade</a></li></ul></div>
            <div><h4>Atendimento</h4><ul>
              <li><a href="${JR.waLink()}" target="_blank" rel="noopener">WhatsApp ${JR.CONTACT.phone}</a></li>
              <li>${JR.CONTACT.hours}</li><li><a href="mailto:${JR.CONTACT.email}">${JR.CONTACT.email}</a></li></ul>
              <div class="pay">${JR.CONTACT.payments.map(p => `<span>${p}</span>`).join("")}</div>
              <p style="margin:10px 0 0;font-size:12px">Checkout seguro Yampi · Parcele em até 12x</p></div>
          </div>
          <div class="legal"><span>© 2026 Just Runner · CNPJ ${JR.CONTACT.cnpj} · justrunner.com.br</span>${JR.LOCAL ? "<span>Protótipo de layout — não é a loja em produção</span>" : ""}</div>
        </div>
      </footer>
      <div class="overlay" id="overlay"></div>
      <aside class="drawer" id="drawer" aria-label="Carrinho" aria-hidden="true">
        <div class="drawer-head"><h3>Seu carrinho</h3><button data-close-cart aria-label="Fechar carrinho">${JR.icon.close}</button></div>
        <div class="ship-meter" id="ship-meter"></div>
        <div class="drawer-body" id="drawer-body"></div>
        <div class="drawer-foot" id="drawer-foot"></div>
      </aside>
      <div class="modal" id="pick-modal" role="dialog" aria-modal="true" aria-labelledby="pick-title">
        <div class="modal-head"><div><h3 id="pick-title">Escolha seu segundo estilo</h3><p>Leve 2 pelo preço de 1: o 2º óculos sai grátis.</p></div>
        <button class="icon-btn" data-close-modal aria-label="Fechar" style="color:#111">${JR.icon.close}</button></div>
        <div class="grid-4" id="pick-grid"></div>
      </div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      ${JR.LOCAL ? `<div class="proto-flag">Protótipo · ${page === "pdp" ? '<a href="index.html">ver Home</a>' : '<a href="produto.html?p=radar-ev">ver PDP</a>'}</div>` : ""}`;
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
    const op = !!(opts.op && JR.opOf && JR.opOf(slug, vIdx, lens));   // Oferta Progressiva só se a lente tiver versão JROP
    const found = cart.find(i => i.slug === slug && i.v === vIdx && i.lens === lens && !!i.op === op);
    if (found) found.qty += qty; else cart.push(op ? { slug, v: vIdx, lens, qty, op: true } : { slug, v: vIdx, lens, qty });
    { const l = JR.realLens && JR.realLens(slug, vIdx, lens);
      JR.meta && JR.meta("AddToCart", { content_ids: [JR.skuOf ? JR.skuOf(slug, vIdx, lens, op) : (l ? l.sku : slug)], content_name: JR.cardName ? JR.cardName(p, v) : p.name, content_category: p.name,
        value: (JR.priceOf ? JR.priceOf(slug, vIdx, lens, op) : JR.PRICE.one) * qty, currency: "BRL", content_type: "product", num_items: qty }); }
    save(); renderCart();
    const c = $("#cart-count"); c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
    if (opts.open !== false) openCart();
    const n = units();
    const tt = JR.cartTotals ? JR.cartTotals(cart) : null;
    if (n === 1 && !JR.isCombo?.(slug)) JR.toast("Adicionado. Leve mais um: o 2º óculos sai grátis.");
    else if (tt && tt.desconto && tt.oculos % 2 === 0) JR.toast(`Leve 2 pelo preço de 1 aplicado: ${brl(tt.desconto)} de desconto.`);
    else JR.toast("Adicionado ao carrinho.");
  };

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
    meter.innerHTML = n === 0 ? "Frete grátis em compras acima de R$ 200." :
      free ? `<b>Frete grátis garantido:</b> seu pedido passou de R$ 200.` : `Falta pouco: leve o 2º óculos e ganhe <b>frete grátis</b>.`;
    meter.innerHTML += `<div class="track"><i style="width:${Math.min(100, (total / (JR.PRICE.freeShipping + 1)) * 100)}%"></i></div>`;
    if (!n) {
      body.innerHTML = `<div class="empty">${JR.glasses({ shape: "shield", lens: "Espelhada" })}<p>Seu carrinho está vazio.<br>Escolha. Coloque. Vá.</p><a class="btn btn-dark" href="index.html#oferta">Escolher meu estilo ${JR.icon.arrow}</a></div>`;
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = cart.map((i, k) => {
      const p = JR.bySlug(i.slug), v = p.variants[i.v];
      return `<div class="line">
        <a class="lm" href="produto.html?p=${p.slug}&c=${i.v}&l=${encodeURIComponent(i.lens)}${i.op ? "&op=1" : ""}">${JR.thumb ? JR.thumb(p.slug, i.v, i.lens) : JR.glasses({ shape: p.shape, frame: v.frame, lens: i.lens, shadow: false })}</a>
        <div><div class="ln">${p.name}</div><div class="lv">Armação ${v.name}${JR.optLabel(i.lens) ? " · " + JR.optLabel(i.lens) : ""}${i.op ? " · Oferta Progressiva" : ""}</div>
          <div class="lq"><button data-q="${k}" data-d="-1" aria-label="Diminuir">−</button><span>${i.qty}</span><button data-q="${k}" data-d="1" aria-label="Aumentar">+</button></div></div>
        <button class="rm" data-rm="${k}">Remover</button>
      </div>`;
    }).join("") + (tt.oculos % 2 === 1 ? `<div class="upsell"><strong>Seu próximo óculos sai grátis</strong>Leve 2 pelo preço de 1: adicione mais um e ele não custa nada.<br><button class="btn btn-green" data-pick>Escolher meu ${n === 1 ? "segundo" : "próximo"} estilo ${JR.icon.arrow}</button></div>` : "");
    foot.innerHTML = `
      <div class="row"><span>${n} ${n > 1 ? "itens" : "item"}</span><span>${brl(full)}</span></div>
      ${tt.desconto ? `<div class="row save"><span>Leve 2 pelo preço de 1</span><span>− ${brl(tt.desconto)}</span></div>` : ""}
      ${tt.descontoOp ? `<div class="row save"><span>Oferta Progressiva</span><span>− ${brl(tt.descontoOp)}</span></div>` : ""}
      <div class="row"><span>Frete</span><span>${free ? "Grátis" : "calculado no checkout"}</span></div>
      <div class="row total"><span>Total</span><span>${brl(total)}</span></div>
      <div class="row" style="justify-content:flex-end"><small>Parcele em até 12x</small></div>
      <button class="btn btn-green btn-block" data-checkout>Finalizar compra ${JR.icon.lock}</button>
      <div class="pay-note">Checkout seguro Yampi · Parcele em até 12x · troca em até 7 dias</div>`;
  }

  const overlay = () => $("#overlay");
  function openCart() { $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden", "false"); overlay().classList.add("open"); }
  function closeAll() {
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
  JR.card = (slug, vIdx = 0, lens, o = {}) => {
    const p = JR.bySlug(slug), v = p.variants[vIdx];
    lens = lens || v.lenses[0];
    const op = !!(o.op && JR.opOf && JR.opOf(slug, vIdx, lens));
    const href = `produto.html?p=${slug}&c=${vIdx}&l=${encodeURIComponent(lens)}${op ? "&op=1" : ""}`;
    const dots = p.variants.slice(0, 5).map((x, i) =>
      `<button class="dot ${i === vIdx ? "on" : ""}" style="background:${x.frame}" data-dot="${i}" aria-label="Armação ${x.name}" title="${x.name}"></button>`).join("");
    const lensCount = new Set(p.variants.flatMap(x => x.lenses).filter(JR.isLens)).size;
    /* Modelo de cor única ("Padrão": Half Jacket, Encoder, Dartboard) guarda as opções como "lentes", e nem todas
       têm nome de lente (Cooper, Full Black…): conta todas como opções em vez de mostrar "1 lente" ou nada. */
    const totalOpc = new Set(p.variants.flatMap(x => x.lenses)).size;
    const opcoes = p.variants.length === 1 && totalOpc > lensCount ? `${totalOpc} opções` : lensCount ? `${lensCount} ${lensCount > 1 ? "lentes" : "lente"}` : "";
    return `<article class="card ${o.mini ? "mini" : ""}" data-slug="${slug}" data-v="${vIdx}" data-lens="${lens}"${op ? ' data-op="1"' : ""}>
      ${o.tag ? `<span class="tag ${o.tag === "Novo" ? "new" : ""}">${o.tag}</span>` : ""}
      <a class="media" href="${href}" aria-label="${p.name}">${JR.thumb ? JR.thumb(slug, vIdx, lens) : JR.glasses({ shape: p.shape, frame: v.frame, lens })}</a>
      <div class="info">
        <a class="name" href="${href}">${JR.cardName(p, v)}</a>
        ${o.mini ? "" : op ? `<div class="price">${brl(JR.priceOf(slug, vIdx, lens, true))}</div><div class="pair"><b>2 por R$ 297</b> · Oferta Progressiva</div>` : (() => { const pr = JR.minPrice ? JR.minPrice(slug) : JR.PRICE.one, lz = JR.realLens && JR.realLens(slug, vIdx, lens), de = lz && lz.de;
          return `<div class="price">${de ? `<s class="de">${brl(de)}</s> ` : ""}${brl(pr)}</div><div class="pair">${p.combo ? "<b>3 óculos</b> no kit · Parcele em até 12x" : o.semLeve2 ? "Parcele em até 12x" : "<b>Leve 2 pelo preço de 1</b> · Parcele em até 12x"}</div>`; })()}
        <div class="swatches" ${p.combo ? "hidden" : ""}>${dots}${p.variants.length > 5 ? `<span class="more">+${p.variants.length - 5}</span>` : ""}${opcoes ? `<span class="more">· ${opcoes}</span>` : ""}</div>
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
          const href = `produto.html?p=${p.slug}&c=${i}&l=${encodeURIComponent(lens)}${card.dataset.op ? "&op=1" : ""}`;
          card.querySelectorAll("a").forEach(a => a.href = href);
          card.querySelectorAll(".dot").forEach(d => d.classList.toggle("on", d === dot));
        }
        if (e.target.closest("[data-add]")) {
          e.preventDefault();
          const inModal = !!card.closest("#pick-modal");
          JR.addToCart(p.slug, +card.dataset.v, card.dataset.lens, 1, { op: !!card.dataset.op });
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
    renderHeader(); renderFooter(); renderCart(); bindCards(); reveal();
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
      if (t.closest("[data-pick]")) JR.openPicker(cart[cart.length - 1]?.slug);
      if (t.closest("[data-checkout]") && JR.meta) { const tt = JR.cartTotals ? JR.cartTotals(cart) : { total: 0 };
        JR.meta("InitiateCheckout", { content_ids: cart.map(i => JR.skuOf(i.slug, i.v, i.lens, i.op)).filter(Boolean), value: tt.total, currency: "BRL", num_items: cart.reduce((a, i) => a + i.qty, 0) }); }
      if (t.closest("[data-checkout]")) { const u = JR.checkoutUrl && JR.checkoutUrl(cart); if (u) location.href = u; else JR.toast("Não consegui montar o checkout: atualize a página e tente de novo."); }
      const soon = t.closest("[data-soon]");
      if (soon) { e.preventDefault(); JR.toast(`${soon.dataset.soon}: fora do escopo deste protótipo.`); }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeAll(); $("#mobile-nav").classList.remove("open"); } });
  };
})();
