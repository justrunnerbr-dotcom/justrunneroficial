/* PDP — galeria, seletor de cor/lente, acordeões, guia de lentes. */
(function () {
  const { $, $$, icon, brl } = JR;
  JR.boot();

  const qs = new URLSearchParams(location.search);
  const product = JR.bySlug(qs.get("p")) || JR.bySlug("radar-ev");
  JR.currentProduct = product;   // usado por reviews.js
  const state = { v: 0, lens: null, slide: 0, qty: 1 };
  state.v = Math.min(Math.max(+qs.get("c") || 0, 0), product.variants.length - 1);
  /* ?cor=Piet (links antigos /produto/<slug> do site redirecionam com o nome da cor) */
  if (qs.get("cor")) { const i = product.variants.findIndex(v => v.name === qs.get("cor")); if (i >= 0) state.v = i; }
  const variant = () => product.variants[state.v];
  state.lens = variant().lenses.includes(qs.get("l")) ? qs.get("l") : variant().lenses[0];
  { const l0 = JR.realLens(product.slug, state.v, state.lens) || {};
    JR.meta && JR.meta("ViewContent", { content_ids: [l0.sku || product.slug], content_name: product.name, content_category: product.name, value: l0.price || JR.PRICE.one, currency: "BRL", content_type: "product" }); }

  /* (a) título e subtítulo descritivos: "o que é?" + busca orgânica */
  const USE = { performance: "corrida e treino", sportstyle: "treino e rua", everyday: "treino e dia a dia" }[product.style];
  document.title = `${product.name} — Óculos de sol esportivo polarizado | Just Runner`;
  $$("[data-i]").forEach(s => s.outerHTML = icon[s.dataset.i]);
  $("#crumbs").innerHTML = `<a href="index.html">Início</a><span>›</span><a href="index.html#oferta">Compre 1 Leve 2</a><span>›</span><span>${product.name}</span>`;
  $("#p-name").textContent = product.name;
  $("#p-sub").textContent = product.combo ? "Kit com 3 óculos de sol esportivos"
    : product.style === "acessorio" ? "Lentes extras para o seu Radar EV"
    : `Óculos de sol esportivo polarizado para ${USE || "treino e dia a dia"}`;
  /* Selo do topo conforme a oferta: combo, Oferta Progressiva (?op=1) ou Compre 1 Leve 2 */
  { const tg = document.querySelector(".tag-row .tag"); if (tg) tg.textContent = product.combo ? "Combo · 3 óculos" : qs.get("op") === "1" ? "Oferta Progressiva" : "Compre 1 Leve 2"; }

  /* (b) confiança junto do botão: só sinais reais */
  $("#buy-trust").innerHTML = [["swap", `Troca em até ${JR.POLICY.exchangeDays} dias`], ["lock", "Checkout seguro Yampi"], ["card", "Parcele em até 12x"], ["truck", "Frete grátis acima de R$ 200"]]
    .map(([i, t]) => `<li>${icon[i]}${t}</li>`).join("");

  /* (c) prazo por CEP: mostra a política oficial; valor exato do frete fica no checkout */
  const cepIn = $("#cep");
  cepIn.addEventListener("input", () => { const d = cepIn.value.replace(/\D/g, "").slice(0, 8); cepIn.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; });
  $("#cep-form").addEventListener("submit", e => {
    e.preventDefault();
    const d = cepIn.value.replace(/\D/g, "");
    const out = $("#cep-out");
    if (d.length !== 8) { out.textContent = "Digite os 8 números do CEP."; out.className = "err"; cepIn.focus(); return; }
    out.className = "";
    out.innerHTML = `<b>${JR.POLICY.delivery}</b> após a confirmação do pagamento. Frete grátis acima de R$ 200; abaixo disso, o valor aparece no checkout.`;
  });
  /* Preço do site no ar (12/10): o da cor e lente escolhidas, com o "de" riscado; combos são kit de 3 a R$ 327.
     ?op=1 (Oferta Progressiva, 13/10): usa a versão JROP da lente quando ela existe: 1 por R$ 175, 2 por R$ 297. */
  const OP_PAGINA = qs.get("op") === "1";
  const emOp = () => OP_PAGINA && !!JR.opOf(product.slug, state.v, state.lens);
  function renderPreco() {
    if (emOp()) {
      const pr = JR.priceOf(product.slug, state.v, state.lens, true);
      $("#p-price").innerHTML = brl(pr);
      $("#p-inst").innerHTML = "Oferta Progressiva · 2 óculos por R$ 297";
      const sb = $("#sb-price"); if (sb) sb.innerHTML = `<strong>${brl(pr)}</strong><span>2 por R$ 297</span>`;
      $("#add").textContent = `Adicionar · ${brl(state.qty >= 2 ? pr * state.qty - 53 : pr * state.qty)}`;
      $("#add-pair").hidden = $(".pair-box").hidden = true;
      return;
    }
    const l = JR.realLens(product.slug, state.v, state.lens) || {}, pr = l.price || JR.PRICE.one;
    $("#p-price").innerHTML = `${l.de ? `<s class="de">${brl(l.de)}</s> ` : ""}${brl(pr)}`;
    $("#p-inst").innerHTML = "Parcele em até 12x";
    const sb = $("#sb-price"); if (sb) sb.innerHTML = `<strong>${brl(pr)}</strong>${product.combo ? "<span>kit com 3 óculos</span>" : ""}`;   // sem o "Leve 2" verde (13/10)
    $("#add").textContent = `Adicionar · ${brl(product.combo ? pr * state.qty : Math.ceil(state.qty / 2) * pr)}`;
    $("#add-pair").hidden = $(".pair-box").hidden = !!product.combo;
  }

  /* ---------- Galeria ---------- */
  const slides = () => {
    const v = variant(), g = o => JR.glasses({ shape: product.shape, frame: v.frame, lens: state.lens, ...o });
    /* Tema: com fotos cadastradas (JR.PHOTOS), a galeria usa as fotos da cor; senão, as ilustrações */
    const ph = JR.photos(product.slug, v.name, state.lens);
    if (ph.length) {
      const list = ph.map((p, i) => ({ label: p.alt || `Foto ${i + 1}`, prod: true,
        html: `<img src="${p.src}" alt="${p.alt || `${product.name} ${v.name}`}" ${i ? 'loading="lazy" decoding="async"' : 'fetchpriority="high"'}>` }));
      const ls = JR.lifestyle && JR.lifestyle(product.slug);
      if (ls) list.push({ label: "Em uso", html: `<img src="${ls.src}" alt="${ls.alt}" loading="lazy" decoding="async">` });
      return list;
    }
    return [
      { label: "Frente 3/4", html: g({}), prod: true },
      { label: "Em uso", html: JR.scene({ sky: "sunset", setting: "bridge", seed: 51, figure: "bust", x: 0, y: 30, s: 1, hair: "short", skin: "#b9805a", lens: state.lens, frame: v.frame, light: "right" }) },
      { label: "Detalhe da lente", html: `<div style="width:150%;transform:translateX(8%)">${g({ shadow: false, angle: -6 })}</div>`, prod: true },
      { label: "No treino", html: JR.scene({ sky: "golden", setting: "road", seed: 52, figure: "bust", x: 0, y: 30, s: 1, hair: "pony", skin: "#c48a62", lens: state.lens, frame: v.frame, tank: true, light: "left" }) },
      { label: "Ângulo lateral", html: g({ angle: 8 }), prod: true }
    ];
  };

  function renderGallery() {
    const list = slides();
    if (state.slide >= list.length) state.slide = 0;
    $("#stage").innerHTML = list.map((s, i) => `<div class="slide ${i === state.slide ? "on" : ""}" aria-hidden="${i !== state.slide}">${s.html}</div>`).join("") +
      `<span class="count">${state.slide + 1} / ${list.length}</span>
       <button class="nav-arrow prev" aria-label="Foto anterior">${icon.left}</button>
       <button class="nav-arrow next" aria-label="Próxima foto">${icon.arrow}</button>`;
    $$("#stage .slide > svg").forEach(s => s.classList.add("prod"));
    $("#thumbs").innerHTML = list.map((s, i) => `<button class="thumb ${s.prod ? "prod" : ""} ${i === state.slide ? "on" : ""}" role="tab" aria-selected="${i === state.slide}" aria-label="${s.label}" data-slide="${i}">${s.html}</button>`).join("");
  }
  function go(i) {
    const n = $$("#stage .slide").length;
    state.slide = (i + n) % n;
    $$("#stage .slide").forEach((s, k) => { s.classList.toggle("on", k === state.slide); s.setAttribute("aria-hidden", k !== state.slide); });
    $$("#thumbs .thumb").forEach((t, k) => { t.classList.toggle("on", k === state.slide); t.setAttribute("aria-selected", k === state.slide); });
    $("#stage .count").textContent = `${state.slide + 1} / ${n}`;
  }
  $("#thumbs").addEventListener("click", e => { const t = e.target.closest("[data-slide]"); if (t) go(+t.dataset.slide); });
  $("#stage").addEventListener("click", e => {
    if (e.target.closest(".prev")) go(state.slide - 1);
    if (e.target.closest(".next")) go(state.slide + 1);
  });
  let x0 = null;
  $("#stage").addEventListener("touchstart", e => x0 = e.touches[0].clientX, { passive: true });
  $("#stage").addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(state.slide + (dx < 0 ? 1 : -1)); x0 = null; });

  /* ---------- Opções ---------- */
  function renderOptions() {
    const v = variant();
    $("#color-name").textContent = v.name;
    $("#lens-name").textContent = state.lens;
    const all = new Set(product.variants.flatMap(x => x.lenses)).size;
    const lensOnly = product.variants.every(x => x.lenses.every(JR.isLens));
    $("#p-meta").innerHTML = `<span>Armação ${v.name}${JR.optLabel(state.lens) ? " · " + JR.optLabel(state.lens) : ""}</span>` +
      (lensOnly ? `<span class="pill">${all} ${all > 1 ? "lentes disponíveis" : "lente"}</span>` : "");
    /* 13/10 (2): cada armação é um produto, igual ao site antigo — a página mostra só as lentes da armação aberta.
       As outras armações do modelo ficam na categoria (ex.: Categorias › Radar mostra todas as Radar). */
    $("#lens-opt").hidden = true;
    const rotulo = l => l === "Único" ? v.name : (JR.isLens(l) ? `Lente ${l}` : l);
    const nome = JR.cardName ? JR.cardName(product, v) : product.name;
    $("#p-name").textContent = nome;
    document.title = `${nome} — Óculos de sol esportivo | Just Runner`;
    const sbn = $("#sb-name"); if (sbn) sbn.textContent = nome;
    $("#color-name").textContent = rotulo(state.lens);
    $(".opt-cor").hidden = v.lenses.length < 2;
    $("#colors").classList.add("swatches-antigo");
    $("#colors").innerHTML = v.lenses.map(l => {
      const on = l === state.lens;
      return `<button class="sw ${on ? "on" : ""}" role="radio" aria-checked="${on}" aria-label="${rotulo(l)}" title="${rotulo(l)}" data-v="${state.v}" data-lens="${l}">
        <i style="background:${v.frame}"></i><i style="background:${JR.lensCss(l)}"></i></button>`;
    }).join("");
  }
  function refresh() { renderOptions(); renderGallery(); renderGuideResult(); renderPreco(); JR.onRefresh && JR.onRefresh(); }

  /* Troca de variante com continuidade visual: View Transitions quando houver suporte e sem reduced-motion. */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const withVT = fn => (document.startViewTransition && !reduce) ? document.startViewTransition(fn) : fn();
  $("#colors").addEventListener("click", e => {
    const b = e.target.closest("[data-v]"); if (!b) return;
    withVT(() => {
      state.v = +b.dataset.v;
      state.lens = b.dataset.lens && variant().lenses.includes(b.dataset.lens) ? b.dataset.lens : variant().lenses[0];
      refresh(); syncUrl();
    });
  });
  function syncUrl() {
    const u = new URL(location.href);
    u.searchParams.set("p", product.slug); u.searchParams.set("c", state.v); u.searchParams.set("l", state.lens);
    history.replaceState(null, "", u);
  }

  /* Quantidade e compra */
  const setQty = q => {
    state.qty = Math.max(1, Math.min(10, q)); $("#qty").textContent = state.qty;
    renderPreco();
  };
  $("#qminus").onclick = () => setQty(state.qty - 1);
  $("#qplus").onclick = () => setQty(state.qty + 1);
  $("#add").onclick = () => JR.addToCart(product.slug, state.v, state.lens, state.qty, { op: emOp() });
  $("#add-pair").onclick = () => { JR.addToCart(product.slug, state.v, state.lens, 1, { open: false }); JR.openPicker(product.slug); };

  /* Benefício = situação real (brand-voice) */
  $("#sports").innerHTML = ["Corrida", "Treino", "Bike", "Caminhada", "Dia a dia"].map(s => `<span>${s}</span>`).join("");

  /* ---------- Por que você vai gostar: MOVE · FEEL · LOOK · PROTECT ---------- */
  /* 13/10: "Feito para o treino" como letreiro (marquee), igual à faixa do topo: os cards rodam sem parar,
     param com o mouse em cima e ficam parados pra quem desativa animações. Cards repetidos pra emendar o loop. */
  const PILARES = [
    ["Look", "lens", "Performance com estilo.", "Esportivo no visual, fácil de usar. Presença sem exagero."],
    ["Feel", "feather", "Leve no rosto.", "Narigueira emborrachada: menos peso, mais foco no caminho."],
    ["Move", "grip", "Fica no lugar.", "Hastes com grip e encaixe firme: mais estabilidade, menos ajustes."],
    ["Protect", "uv", "Proteção em movimento.", "Lente polarizada com proteção UV400, em policarbonato."]
  ];
  const plCard = ([k, i, t, s], dup) => `<div class="pl"${dup ? ' aria-hidden="true"' : ""}><span class="pl-k">${icon[i]}${k}</span><strong>${t}</strong><p>${s}</p></div>`;
  $("#pillars").innerHTML = `<div class="pl-head"><div><span class="kicker" style="color:#4a5058">Por que você vai gostar</span>
    <h2 class="display h-sm">Feito para o treino. Pensado para o seu estilo.</h2></div></div>
    <div class="pl-marquee"><div class="pl-run">${PILARES.map(x => plCard(x)).join("")}${PILARES.map(x => plCard(x, true)).join("")}</div></div>`;



  /* ---------- Comparativo polarizada ---------- */
  const cmpScene = { sky: "day", setting: "road", seed: 91, figure: "runner", x: 118, y: 150, s: .72, lens: state.lens, color: "#14161a" };
  $("#cmp-off").innerHTML = JR.scene({ ...cmpScene, slot: "pdp-comparador" }) + `<i class="glare"></i>`;
  $("#cmp-on").innerHTML = JR.scene({ ...cmpScene, slot: "pdp-comparador" });
  const setCmp = v => {
    $("#cmp-on").style.clipPath = `inset(0 0 0 ${v}%)`;
    $("#cmp-handle").style.left = v + "%";
  };
  $("#cmp-range").addEventListener("input", e => setCmp(+e.target.value));
  setCmp(50);

  /* ---------- Barra de compra fixa ---------- */
  const sb = $("#sticky-buy");
  const updSticky = () => {
    $("#sb-img").innerHTML = JR.thumb ? JR.thumb(product.slug, state.v, state.lens) : JR.glasses({ shape: product.shape, frame: variant().frame, lens: state.lens, shadow: false });
    $("#sb-name").textContent = JR.cardName ? JR.cardName(product, variant()) : product.name;
    $("#sb-var").textContent = `Armação ${variant().name}${JR.optLabel(state.lens) ? " · " + JR.optLabel(state.lens) : ""}`;
  };
  JR.onRefresh = updSticky;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      const show = !e.isIntersecting;
      sb.classList.toggle("show", show); sb.setAttribute("aria-hidden", !show);
    }).observe($("#add-pair"));
  }
  $("#sb-add").onclick = () => JR.addToCart(product.slug, state.v, state.lens, 1, { op: emOp() });

  /* ---------- Escolha seu segundo óculos (cross-sell do Compre 1 Leve 2) ---------- */
  $("#pair-grid").innerHTML = JR.SHOWCASE.all.filter(([sl]) => sl !== product.slug).slice(0, 4)
    .map(([sl, v, l]) => JR.card(sl, v, l, { tag: "Compre 1 Leve 2", semLeve2: true })).join("");
  JR.bindCards($("#pair-grid"));

  /* ---------- Mídia ---------- */
  /* Vídeo real (vertical 9:16): mudo em loop quando aparece; o play liga o som e recomeça. */
  const VIDEO = "fotos/em-movimento.mp4";
  if (VIDEO) {
    const box = $("#video");
    box.classList.add("has-video");
    box.insertAdjacentHTML("afterbegin", `
      <video class="v-bg" src="${VIDEO}" muted loop playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video>
      <video class="v-main" src="${VIDEO}" muted loop playsinline preload="metadata" aria-label="Just Runner em movimento"></video>`);
    const [bg, main] = box.querySelectorAll("video");
    const both = fn => [bg, main].forEach(fn);
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => {
      if (e.isIntersecting) both(v => v.play().catch(() => {})); else both(v => v.pause());
    }, { threshold: .3 }).observe(box);
    $("#play").onclick = () => { main.currentTime = 0; bg.currentTime = 0; main.muted = false; both(v => v.play().catch(() => {})); box.classList.add("playing"); };
    main.onclick = () => { main.muted = true; box.classList.remove("playing"); };
  } else
  $("#video").insertAdjacentHTML("afterbegin", JR.scene({ slot: "pdp-video-capa", sky: "dusk", setting: "city", seed: 61, figure: "bust", x: 100, y: 20, s: .5, align: "xMidYMin", hair: "short", hairColor: "#1d1712", skin: "#a87352", lens: "Sapphire", light: "left", beard: true, anim: true }));
  if (!VIDEO) $("#play").onclick = () => { $("#video").classList.toggle("playing"); JR.toast("No site real, aqui roda o vídeo do produto em uso."); };
  $("#ugc").innerHTML = [
    { sky: "day", setting: "city", seed: 62, figure: "bust", x: 0, y: 40, s: 1, hair: "short", skin: "#c48d66", lens: "Azul", light: "right" },
    { sky: "day", setting: "track", seed: 63, figure: "runner", x: 110, y: 170, s: 1.3, lens: "Ruby", color: "#15171b" },
    { sky: "golden", setting: "road", seed: 64, figure: "runner", x: 90, y: 160, s: 1.35, lens: "Prizm", color: "#0d0e10", flip: true },
    { sky: "overcast", setting: "bridge", seed: 65, figure: "bust", x: 0, y: 40, s: 1, hair: "cap", cap: "#1d2430", skin: "#9a6848", lens: "Espelhada", light: "left" }
  ].map((sc, i) => `<div class="ph">${JR.scene({ ...sc, slot: "pdp-ugc-" + (i + 1) })}</div>`).join("");
  /* Peça única ao lado do vídeo (09/10): substitui as 4 fotos quando cadastrada. */
  const lado = JR.SITE_IMAGES && JR.SITE_IMAGES["pdp-lado-video"];
  if (lado) {
    $("#ugc").classList.add("ugc-peca");
    if (!lado.slides) $("#ugc").innerHTML = `<img src="${lado.src}" alt="${lado.alt || ""}" loading="lazy" decoding="async">`;
    else {
      /* Várias peças (12/10): lado a lado com o vídeo, todas na mesma altura (largura proporcional ao formato). */
      $(".pdp-media").classList.add("media-linha");
      $("#ugc").classList.add("ugc-linha");
      $("#ugc").innerHTML = lado.slides.map(sl => `<img src="${sl.src}" alt="${sl.alt}" loading="lazy" decoding="async" width="1000" height="1250">`).join("");
    }
  }

  /* ---------- Acordeões ---------- */
  const lensHint = l => (JR.LENS_GUIDE.find(g => g.lenses.includes(l)) || {}).title;
  const description = {
    "radar-ev": "Você pensa no treino, o Radar EV acompanha. Lente ampla e encaixe firme. Quer variar? O Kit de Lentes Radar EV é vendido à parte.",
    "flak": "Feito para ficar no lugar enquanto você segue em frente. Flak é estabilidade no treino, com hastes com grip e lente polarizada.",
    "minute": "Do treino para o resto do dia. Minute é leve e versátil: um óculos, várias formas de usar.",
    "plantaris": "Esportivo no visual, fácil de usar. Plantaris foi feito para o treino e pensado para o seu estilo."
  }[product.slug] || `Seu equipamento deve acompanhar você, não atrapalhar. O ${product.name} combina estabilidade, conforto e lente polarizada UV400 para acompanhar seus movimentos. Menos distração. Mais movimento.`;

  /* Ficha técnica: só campos com dado real (JR.SPECS). */
  const spec = JR.SPECS[product.slug] || {};
  const SPEC_LABELS = [["peso", "Peso", v => `${v} g`], ["largura", "Largura total", v => `${v} mm`],
    ["alturaLente", "Altura da lente", v => `${v} mm`], ["haste", "Haste", v => `${v} mm`], ["armacao", "Material da armação", v => v]];
  const hasSpecs = SPEC_LABELS.some(([k]) => spec[k] != null && spec[k] !== "");
  const specRows = () => SPEC_LABELS.filter(([k]) => spec[k] != null && spec[k] !== "")
    .map(([k, label, fmt]) => `<tr><td>${label}</td><td>${fmt(spec[k])}</td></tr>`).join("");

  const acc = [
    { t: "Descrição", body: `<p style="margin:0">${description}</p><ul><li>Lente polarizada com proteção UV400</li><li>Lentes em policarbonato</li><li>Narigueira emborrachada e hastes com grip: não escorrega no suor</li></ul>` },
    { t: "Especificações técnicas", body: `<table class="spec"><tbody>
        <tr><td>Lente</td><td>Polarizada · proteção UV400</td></tr>
        <tr><td>Material da lente</td><td>Policarbonato</td></tr>
        <tr><td>Narigueira</td><td>Emborrachada</td></tr>
        <tr><td>Hastes</td><td>Com grip</td></tr>
        ${product.interchangeable ? `<tr><td>Troca de lentes</td><td>Compatível com o Kit de Lentes Radar EV (vendido à parte)</td></tr>` : ""}
        <tr><td>Cores de armação</td><td>${product.variants.map(v => v.name).join(" · ")}</td></tr>
        ${specRows()}
      </tbody></table>` },
    { t: "Cuidando do seu Just Runner", body: `<ul style="margin-top:0"><li>Depois do treino, lave com água corrente e sabão neutro</li><li>Seque com pano macio de microfibra, sem esfregar a lente a seco</li><li>Não deixe no painel do carro ao sol</li><li>Guarde com a lente para cima, sem contato com chaves ou moedas</li></ul>` }
  ];
  /* Descrição e cuidados vão para baixo do CEP (12/10); o acordeão do fim da página fica com o resto. */
  const SOB_CEP = { "Descrição": "Descrição do produto", "Cuidando do seu Just Runner": "Cuidando do seu Runner" };
  /* Textos do usuário (12/10), iguais para todos os modelos. */
  const TEXTO_SOB_CEP = {
    "Descrição do produto": `
      <p class="bi-lead">Feito para acompanhar o seu ritmo.</p>
      <p>Os óculos Just Runner unem proteção, conforto e design esportivo para acompanhar você na corrida, no treino e no dia a dia.</p>
      <p>Desenvolvidos para oferecer um encaixe confortável e seguro, nossos modelos contam com estrutura leve e lentes com proteção UV400, ajudando a proteger os olhos contra os raios UVA e UVB durante a exposição ao sol.</p>
      <p>O design foi pensado para quem busca liberdade de movimento sem abrir mão da estética — do treino para a vida.</p>
      <h4>Especificações do modelo</h4>
      <ul><li>Proteção UV400</li><li>Estrutura leve e resistente</li><li>Encaixe confortável</li><li>Ajuste firme durante o movimento</li><li>Lentes desenvolvidas para maior conforto visual</li><li>Design esportivo e versátil</li></ul>
      <p class="bi-obs">As características de lente, acabamento, polarização e medidas podem variar de acordo com cada modelo e cor.</p>
      <h4>Na embalagem</h4>
      <ul><li>1 óculos Just Runner</li><li>Case de proteção</li><li>Saquinho/flanela para proteção e limpeza</li></ul>
      <p class="bi-assina"><b>JUST RUNNER</b><br>Feito para correr.</p>`,
    "Cuidando do seu Runner": `
      <p class="bi-lead">Cuidados com seu óculos</p>
      <p>Seu Just Runner foi feito para acompanhar o movimento. Alguns cuidados simples ajudam a preservar as lentes, a armação e o acabamento por muito mais tempo.</p>
      <p>Após corridas, treinos ou contato intenso com suor, recomendamos lavar os óculos com água corrente e sabão neutro. O mesmo cuidado é importante após contato com água do mar, areia, protetor solar ou outras partículas.</p>
      <h4>Durante a limpeza</h4>
      <ul><li>Evite esfregar as lentes quando estiverem secas ou com poeira;</li><li>Utilize água e sabão neutro para remover resíduos;</li><li>Seque delicadamente com uma flanela ou tecido macio adequado para lentes;</li><li>Não utilize álcool, acetona, produtos abrasivos ou produtos químicos de limpeza;</li><li>Evite apoiar os óculos diretamente sobre as lentes.</li></ul>
      <p>Também evite deixar seu Just Runner exposto a temperaturas muito altas, principalmente dentro de carros, porta-luvas ou diretamente sob o sol por longos períodos. O calor excessivo pode comprometer a armação e o revestimento das lentes.</p>
      <p>Quando não estiver usando, mantenha o óculos dentro do saquinho protetor e da case, evitando riscos, impactos e deformações.</p>
      <p>Cuidando bem do seu Just Runner, ele continua pronto para acompanhar muitos quilômetros com você.</p>
      <p class="bi-assina"><b>CORRA. TREINE. REPITA.</b></p>`
  };
  $("#buy-info").innerHTML = Object.entries(TEXTO_SOB_CEP).map(([t, body]) => `
    <details class="bi-item"><summary>${t}<span class="bi-seta" aria-hidden="true"></span></summary><div class="bi-body">${body}</div></details>`).join("");
  acc.splice(0, acc.length, ...acc.filter(a => !SOB_CEP[a.t]));
  $("#acc").innerHTML = acc.map((a, i) => `
    <div class="acc-item ${a.open ? "open" : ""}">
      <button class="acc-head" aria-expanded="${!!a.open}" aria-controls="acc-${i}">${a.t}<span class="pm"></span></button>
      <div class="acc-body" id="acc-${i}" role="region"><div><div class="in" ${a.id ? `id="${a.id}"` : ""}>${a.body}</div></div></div>
    </div>`).join("");
  $("#acc").addEventListener("click", e => {
    const h = e.target.closest(".acc-head"); if (!h) return;
    const item = h.parentElement, open = !item.classList.contains("open");
    item.classList.toggle("open", open); h.setAttribute("aria-expanded", open);
  });
  /* ---------- Guia de lentes (layout do sócio, 12/10) ----------
     Foto = as 4 artes (slots guia-lente-N). Troca sozinha a cada 6 s com barra de progresso na aba; para com o
     mouse em cima, fora da tela ou com movimento reduzido. Lentes: as do JR.LENS_GUIDE; clicar aplica no produto. */
  const CASOS = [
    { n: "01", menu: "SOL FORTE", title: "Corra sem\nbrigar com a luz.", note: "Todas as lentes Just Runner são polarizadas com proteção UV400.",
      sum: "Em treinos sob sol intenso, lentes mais escuras ou espelhadas reduzem o excesso de luminosidade e trazem mais conforto visual." },
    { n: "02", menu: "DIAS NUBLADOS", title: "Nem toda corrida\ntem sol forte.", note: "Lente clara não escurece demais a pista.",
      sum: "Com luz mais suave ou céu encoberto, prefira uma lente que dê contraste sem escurecer demais a visão do percurso." },
    { n: "03", menu: "AMANHECER / ENTARDECER", title: "Quando a luz\ncomeça a mudar.", note: "Evite lentes muito escuras quando houver pouca luz.",
      sum: "No começo e no fim do dia a luminosidade varia rápido. Vale uma lente que deixe entrar mais luz e mantenha o contorno do terreno." },
    { n: "04", menu: "VERSÁTIL", title: "Do treino\npara a rotina.", note: "Escolha a lente pelas condições reais de uso.",
      sum: "Para quem alterna treino, deslocamento e uso diário: uma lente equilibrada para várias luzes, com o mesmo conforto." }
  ];
  let guide = 0, timer = null, emTela = false, pausado = false;
  const arte = i => (JR.SITE_IMAGES || {})["guia-lente-" + (i + 1)] || {};
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("#jrl-photo").innerHTML = CASOS.map((c, i) => `<img src="${arte(i).src || ""}" alt="${arte(i).alt || c.menu}" class="${i ? "" : "on"}" decoding="async" ${i ? 'loading="lazy"' : ""}>`).join("");
  $("#jrl-tabs").innerHTML = CASOS.map((c, i) => `
    <button type="button" class="jrl-tab" role="tab" aria-controls="jrl-panel" aria-selected="${!i}" tabindex="${i ? -1 : 0}" data-g="${i}">
      <img src="${arte(i).src || ""}" alt=""><span class="jrl-tab-text"><span class="jrl-tab-num">${c.n}</span><span class="jrl-tab-title">${c.menu}</span></span>
      <i class="jrl-prog" aria-hidden="true"></i>
    </button>`).join("");
  const tabs = $$("#jrl-tabs .jrl-tab"), fotos = $$("#jrl-photo img");
  function renderGuideResult() {
    const c = CASOS[guide], g = JR.LENS_GUIDE[guide], avail = variant().lenses;
    $("#jrl-label").textContent = `${c.n} — ${c.menu}`;
    $("#jrl-count").textContent = `${c.n} / 04`;
    $("#jrl-title").textContent = c.title.replace(/\\n/g, "\n");
    $("#jrl-desc").textContent = c.sum;
    $("#jrl-note").textContent = c.note;
    /* 3 óculos reais com as lentes desta luz: primeiro o modelo da página (se tiver a lente), depois os mais vendidos. */
    const ORDEM = ["radar-ev", "minute", "flak", "eye-jacket-redux", "eye-jacket", "plantaris", "hstn", "half-jacket", "encoder", "straight-jacket", "dartboard"];
    const acha = l => {
      if (avail.includes(l)) return { slug: product.slug, v: state.v, nome: product.name, aqui: true };
      for (const sl of [product.slug, ...ORDEM.filter(x => x !== product.slug)]) {
        const p = JR.bySlug(sl); if (!p) continue;
        const v = p.variants.findIndex(x => x.lenses.includes(l));
        if (v >= 0) return { slug: sl, v, nome: p.name, aqui: false };   // outra armação: abre a página nela
      }
    };
    const escolhidos = g.lenses.map(l => ({ l, o: acha(l) })).filter(x => x.o).slice(0, 3);
    $("#jrl-lenses").innerHTML = escolhidos.map(({ l, o }) => {
      const foto = JR.thumb(o.slug, o.v, l);
      const cor = JR.bySlug(o.slug).variants[o.v].name;
      return o.aqui
        ? `<button type="button" class="jrl-oculos" data-try="${l}">${foto}<span>${o.nome} · ${l}</span><small>aplicar neste óculos</small></button>`
        : `<a class="jrl-oculos" href="produto.html?p=${o.slug}&c=${o.v}&l=${encodeURIComponent(l)}">${foto}<span>${o.nome} · ${l}</span><small>${cor === "Padrão" ? "ver modelo" : "armação " + cor}</small></a>`;
    }).join("");
  }
  function mostra(i, auto) {
    guide = (i + CASOS.length) % CASOS.length;
    fotos.forEach((f, k) => f.classList.toggle("on", k === guide));
    tabs.forEach((t, k) => { t.setAttribute("aria-selected", k === guide); t.tabIndex = k === guide ? 0 : -1; });
    const anim = $("#jrl-anim"); anim.classList.remove("in"); void anim.offsetWidth; anim.classList.add("in");
    renderGuideResult();
    if (!auto) roda();
  }
  function roda() {
    clearInterval(timer);
    const sec = $("#guia-lentes"); sec.classList.toggle("auto", !reduz && emTela && !pausado);
    tabs.forEach(t => { const p = t.querySelector(".jrl-prog"); p.style.animation = "none"; void p.offsetWidth; p.style.animation = ""; });
    if (!reduz && emTela && !pausado) timer = setInterval(() => mostra(guide + 1, true) || roda(), 6000);
  }
  $("#jrl-tabs").addEventListener("click", e => { const b = e.target.closest("[data-g]"); if (b) mostra(+b.dataset.g); });
  $("#jrl-tabs").addEventListener("keydown", e => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return;
    e.preventDefault(); mostra(guide + k); tabs[guide].focus();
  });
  $("#jrl-prev").onclick = () => mostra(guide - 1);
  $("#jrl-next").onclick = () => mostra(guide + 1);
  const secLentes = $("#guia-lentes");
  secLentes.addEventListener("mouseenter", () => { pausado = true; roda(); });
  secLentes.addEventListener("mouseleave", () => { pausado = false; roda(); });
  secLentes.addEventListener("focusin", () => { pausado = true; roda(); });
  new IntersectionObserver(([e]) => { emTela = e.isIntersecting; roda(); }, { threshold: .15 }).observe(secLentes);
  $("#jrl-lenses").addEventListener("click", e => {
    const b = e.target.closest("[data-try]"); if (!b) return;
    state.lens = b.dataset.try; refresh(); syncUrl(); go(0);
    $("#buy").scrollIntoView({ behavior: "smooth", block: "start" });
    JR.toast(`Lente ${state.lens} aplicada no ${product.name}.`);
  });
  mostra(0, true);

  /* "Não é bem esse? Veja por estilo" removido a pedido (12/10). */

  /* ---------- Selos + FAQ (textos iguais ao site: src/components/store/product-faq.tsx) ---------- */
  const BADGES = [
    ["star", "Mais de 200 mil clientes", "Marca brasileira atendendo clientes em todo o Brasil desde 2020."],
    ["truck", "Envio com rastreio", "Acompanhe seu pedido do envio até a entrega."],
    ["lock", "Compra segura", "Ambiente protegido com criptografia e pagamentos processados pelo Mercado Pago."],
    ["headphones", "Troca fácil e garantia", "Você pode trocar ou devolver com praticidade e segurança."]
  ];
  const FAQ = {
    "Nossos Óculos": [
      ["Os óculos possuem proteção UV?", "Sim! Nossas lentes possuem proteção UV400, bloqueando 100% dos raios ultravioleta nocivos (UVA e UVB)."],
      ["Qual o material dos óculos?", "Trabalhamos com materiais premium, como acetato de alta resistência e ligas metálicas leves, garantindo durabilidade e conforto."],
      ...(hasSpecs ? [["Como consultar as medidas antes de comprar?", "Na página de cada produto você encontra a aba \"Especificações técnicas\" com todas as medidas detalhadas."]] : []),
      ["Os óculos possuem os emblemas e marcações?", "Sim! Todos acompanham os emblemas das marcas. Ocultamos nas fotos por diretrizes comerciais, mas você recebe o produto oficial."]
    ],
    "Envios": [
      ["Qual o prazo de envio e entrega?", JR.POLICY.deliveryLong],
      ["Como rastrear meu pedido?", "Você receberá o código de rastreio por e-mail e WhatsApp assim que o pedido for despachado."]
    ],
    "Trocas & Devoluções": [
      ["Como funciona a política de trocas?", "Você tem até 7 dias corridos após o recebimento para solicitar a primeira troca gratuitamente."],
      ["E se eu não gostar, posso devolver?", "Sim! Garantimos seu direito de arrependimento com devolução gratuita em até 7 dias após o recebimento."]
    ]
  };
  $("#pfaq-badges").innerHTML = BADGES.map(([i, t, s]) => `<div class="pfaq-badge"><span class="pfaq-ico">${icon[i]}</span><h3>${t}</h3><p>${s}</p></div>`).join("");
  let faqTab = "Nossos Óculos";
  const renderFaq = () => {
    $("#pfaq-tabs").innerHTML = Object.keys(FAQ).map(t => `<button role="tab" aria-selected="${t === faqTab}" class="${t === faqTab ? "on" : ""}" data-tab="${t}">${t}</button>`).join("");
    $("#pfaq-list").innerHTML = FAQ[faqTab].map(([q, a]) => `
      <div class="pfaq-item"><button class="pfaq-q" aria-expanded="false">${q}<span class="pm"></span></button>
      <div class="pfaq-a"><div><p>${a}</p></div></div></div>`).join("");
  };
  $("#pfaq-tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { faqTab = b.dataset.tab; renderFaq(); } });
  $("#pfaq-list").addEventListener("click", e => {
    const q = e.target.closest(".pfaq-q"); if (!q) return;
    const item = q.parentElement, open = !item.classList.contains("open");
    $$("#pfaq-list .pfaq-item").forEach(x => { x.classList.remove("open"); x.firstElementChild.setAttribute("aria-expanded", "false"); });
    item.classList.toggle("open", open); q.setAttribute("aria-expanded", open);
  });
  renderFaq();

  refresh();
})();
