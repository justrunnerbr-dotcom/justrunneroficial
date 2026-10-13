/* Páginas internas: coleção, FAQ, políticas, frete, contato, sobre. */
(function () {
  const { $, $$, icon } = JR;
  JR.boot();
  const page = document.body.dataset.page;
  const C = JR.CONTACT;

  /* Dados compartilhados (uma fonte só: data.js) */
  /* data-i sozinho vira o ícone; com classe (selo/círculo), o ícone entra dentro */
  $$("[data-i]").forEach(s => s.className ? (s.innerHTML = icon[s.dataset.i] || "") : (s.outerHTML = icon[s.dataset.i] || ""));
  $$("[data-cnpj]").forEach(e => e.textContent = C.cnpj);
  $$("[data-delivery-short]").forEach(e => e.textContent = JR.POLICY.delivery.replace(" · ", " / "));
  $$("[data-delivery-long]").forEach(e => e.textContent = JR.POLICY.deliveryLong);
  $$("[data-phone-hours]").forEach(e => e.textContent = `${C.phone} · ${C.hours}`);
  $$("[data-contact]").forEach(e => e.innerHTML = `
    <a href="${JR.waLink()}" target="_blank" rel="noopener">${icon.chat}<span><b>WhatsApp</b> ${C.phone} · ${C.hours}</span></a>
    <a href="mailto:${C.email}">${icon.mail}<span><b>E-mail</b> ${C.email}</span></a>`);
  $$("[data-phone]").forEach(e => e.textContent = C.phone);
  $$("[data-email]").forEach(e => e.textContent = C.email);
  $$("[data-ig]").forEach(e => e.textContent = "@" + C.instagram);
  $$("[data-hours]").forEach(e => e.textContent = C.hours);

  /* Atendimento aberto agora? (horário oficial em JR.CONTACT.open, fuso de São Paulo) */
  const openNow = (() => {
    try {
      const o = C.open, parts = new Intl.DateTimeFormat("en-US", { timeZone: o.tz, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(new Date());
      const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find(p => p.type === "weekday").value);
      const h = +parts.find(p => p.type === "hour").value;
      return o.days.includes(day) && h >= o.from && h < o.to;
    } catch { return null; }
  })();
  $$("[data-status]").forEach(e => {
    if (openNow === null) return e.remove();
    e.classList.add(openNow ? "on" : "off");
    e.textContent = openNow ? `Atendimento aberto agora · até ${C.open.to}h` : e.closest(".hours") ? "Fora do horário agora" : `Fora do horário · ${C.hours}`;
  });

  /* ---------- Central de ajuda (FAQ, frete, trocas, contato, privacidade) ---------- */
  if (document.body.hasAttribute("data-help")) {
    const HELP = [
      ["faq", "faq.html", "help", "Perguntas frequentes"],
      ["frete-e-entrega", "frete-e-entrega.html", "truck", "Frete e entrega"],
      ["trocas-e-devolucoes", "trocas-e-devolucoes.html", "swap", "Trocas e devoluções"],
      ["contato", "contato.html", "chat", "Contato"],
      ["politica-de-privacidade", "politica-de-privacidade.html", "lock", "Privacidade"]
    ];
    $("#help-nav").innerHTML = `<div class="wrap">${HELP.map(([k, href, i, t]) =>
      `<a href="${href}"${k === page ? ' aria-current="page"' : ""}>${icon[i]}<span>${t}</span></a>`).join("")}</div>`;
    $("#help-nav [aria-current]")?.scrollIntoView({ block: "nearest", inline: "center" });

    /* Arte do hero: ícone da página em anel de lente + 3 sinais reais (desenha uma vez ao abrir) */
    const ART = {
      faq: ["help", [["lens", "Lentes"], ["card", "6x sem juros"], ["swap", "Trocas"]]],
      frete: ["truck", [["check", "Grátis acima de R$ 200"], ["search", "Rastreio"], ["pin", "Todo o Brasil"]]],
      trocas: ["swap", [["clock", "7 dias corridos"], ["box", "Sem uso"], ["chat", "WhatsApp"]]],
      contato: ["chat", [["clock", C.hours], ["mail", "E-mail"], ["insta", "@" + C.instagram]]],
      privacidade: ["lock", [["shield", "Não vendemos dados"], ["cookie", "Cookies"], ["eye", "Seus direitos"]]]
    };
    const hero = $(".help-hero"), a = ART[hero?.dataset.art];
    if (a) {
      hero.querySelector(".wrap").insertAdjacentHTML("beforeend", `<div class="hh-art" aria-hidden="true">
        <svg class="hh-rings" viewBox="0 0 320 320"><circle cx="160" cy="160" r="150" pathLength="1"/><circle cx="160" cy="160" r="112" pathLength="1"/><circle cx="160" cy="160" r="74" pathLength="1"/></svg>
        <span class="hh-main">${icon[a[0]]}</span>
        ${a[1].map(([i, t], n) => `<span class="hh-chip hh-chip-${n + 1}">${icon[i]}${t}</span>`).join("")}
      </div>`);
      hero.querySelectorAll(".hh-main svg *").forEach(el => el.setAttribute("pathLength", "1"));
    }

    /* Faixa final: falar com uma pessoa (não repete na própria página de contato) */
    if (page !== "contato") $("main").insertAdjacentHTML("beforeend", `<section class="help-band"><div class="wrap">
      <div><span class="hb-ico">${icon.headphones}</span><h2 class="display h-md">Ainda com dúvida?</h2><p class="sub">Fale com o nosso time. ${openNow === null ? "" : `<em class="status ${openNow ? "on" : "off"}">${openNow ? `Atendimento aberto agora · até ${C.open.to}h` : `Fora do horário · ${C.hours}`}</em>`}</p></div>
      <div class="hb-actions"><a class="btn btn-green" href="${JR.waLink("Olá! Tenho uma dúvida sobre a Just Runner.")}" target="_blank" rel="noopener">${icon.chat} Falar no WhatsApp</a><a class="btn btn-ghost" href="contato.html">Outros canais ${icon.arrow}</a></div>
    </div></section>`);

    /* Linha do tempo: fallback do preenchimento quando não há animação por scroll */
    if (!CSS.supports("animation-timeline: view()") && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .3 });
      $$(".tl").forEach(t => io.observe(t));
    }

    /* Sumário lateral com indicação da seção atual (políticas longas) */
    const doc = $("[data-toc]"), toc = $("#toc");
    if (doc && toc) {
      const hs = $$("h2", doc);
      hs.forEach((h, n) => h.id ||= "s" + (n + 1));
      toc.innerHTML = `<details${matchMedia("(min-width: 1021px)").matches ? " open" : ""}><summary>Nesta página <span class="toc-n">${hs.length} seções</span></summary>
        <ol>${hs.map(h => `<li><a href="#${h.id}">${h.textContent.replace(/^\d+\.\s*/, "")}</a></li>`).join("")}</ol></details><div class="toc-progress"><i></i></div>`;
      const links = $$("a", toc);
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => l.toggleAttribute("aria-current", l.hash === "#" + e.target.id));
      }), { rootMargin: "-20% 0px -70% 0px" });
      hs.forEach(h => io.observe(h));
      toc.addEventListener("click", e => { if (e.target.closest("a") && !matchMedia("(min-width: 1021px)").matches) $("details", toc).open = false; });
      /* progresso de leitura: CSS por scroll quando houver suporte; senão, JS leve */
      if (!CSS.supports("animation-timeline: scroll()")) {
        const bar = $(".toc-progress i", toc);
        const upd = () => { const r = doc.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); bar.style.transform = `scaleX(${p})`; };
        addEventListener("scroll", upd, { passive: true }); upd();
      }
    }
  }

  /* ---------- Coleção ---------- */
  if (page === "colecao") {
    const STYLES = [["todos", "Todos"], ["performance", "Performance"], ["sportstyle", "Sportstyle"], ["everyday", "Everyday"]];
    const qs = new URLSearchParams(location.search);
    let style = STYLES.some(([k]) => k === qs.get("estilo")) ? qs.get("estilo") : "todos";
    /* Categorias por esporte (banners do usuário, 12/10): todas mostram todos os óculos, cada cor como um card. */
    const CATS = {
      corrida:   { nome: "Corrida",      banner: "fotos/banner-cat-corrida.jpg",   alt: "Corrida: leveza e proteção para acompanhar cada treino" },
      bike:      { nome: "Bike",         banner: "fotos/banner-cat-bike.jpg",      alt: "Bike" },
      trail:     { nome: "Trail",        banner: "fotos/banner-cat-trail.jpg",     alt: "Trail" },
      beach:     { nome: "Beach Sports", banner: "fotos/banner-cat-beach.jpg",     alt: "Beach sports: leveza e conforto para jogar na areia" },
      lifestyle: { nome: "Lifestyle",    banner: "fotos/banner-cat-lifestyle.jpg", alt: "Lifestyle" },
      /* Vitrines do site no ar (12/10) */
      leve2:       { nome: "Leve 2 pelo preço de 1", banner: "fotos/hero-atual.jpg", alt: "Compre 1 Leve 2", lista: () => JR.SHOWCASE.leve2 },
      leve3:       { nome: "Compre 1 Leve 3", banner: "fotos/cat-banner-combos.jpg", alt: "Compre 1 Leve 3: 3 óculos por R$ 327", lista: () => JR.SHOWCASE.combos },
      lancamentos: { nome: "Lançamentos", banner: "fotos/cat-banner-lancamentos.jpg", alt: "Lançamentos Just Runner", lista: () => JR.SHOWCASE.lancamentos }
    };
    const cat = CATS[qs.get("cat")];
    if (cat) {
      document.title = `${cat.nome} | Just Runner`;
      // O banner tem o botão "Escolher agora" desenhado: o clique leva até os óculos.
      $(".page-hero").outerHTML = `
        <section class="cat-banner"><a href="#col-grid" aria-label="Ver os óculos de ${cat.nome}"><img src="${cat.banner}" alt="${cat.alt}" width="2000" height="667" fetchpriority="high"></a></section>`;
      $(".filters").insertAdjacentHTML("beforebegin", `<nav class="crumbs cat-crumbs" aria-label="Você está em"><a href="index.html">Início</a><span>›</span><span>${cat.nome}</span></nav>`);
    }
    const todasAsCores = () => (cat && cat.lista) ? cat.lista() : JR.PRODUCTS.filter(p => !p.combo && p.style !== "acessorio").flatMap(p => p.variants.map((v, i) => [p.slug, i, v.lenses[0]]));
    const lensCount = slug => new Set(JR.bySlug(slug).variants.flatMap(v => v.lenses).filter(JR.isLens)).size;
    const render = () => {
      const sort = $("#f-sort").value;
      let list = (cat ? todasAsCores() : JR.SHOWCASE.all).filter(([sl]) => style === "todos" || JR.bySlug(sl).style === style);
      if (sort === "az") list = [...list].sort((a, b) => JR.bySlug(a[0]).name.localeCompare(JR.bySlug(b[0]).name));
      if (sort === "lens") list = [...list].sort((a, b) => lensCount(b[0]) - lensCount(a[0]));
      $("#f-style").innerHTML = STYLES.map(([k, t]) => `<button class="${k === style ? "on" : ""}" aria-pressed="${k === style}" data-style="${k}">${t}</button>`).join("");
      $("#f-count").textContent = `${list.length} ${cat ? (list.length > 1 ? "óculos" : "óculos") : (list.length > 1 ? "modelos" : "modelo")} · todos com lente polarizada UV400`;
      $("#col-grid").innerHTML = list.map(([sl, v, l]) => JR.card(sl, v, l, {})).join("");
      JR.bindCards($("#col-grid"));
      const u = new URL(location.href); style === "todos" ? u.searchParams.delete("estilo") : u.searchParams.set("estilo", style); history.replaceState(null, "", u);
    };
    $("#f-style").addEventListener("click", e => { const b = e.target.closest("[data-style]"); if (b) { style = b.dataset.style; render(); } });
    $("#f-sort").addEventListener("change", render);
    render();
  }

  /* ---------- FAQ ---------- */
  if (page === "faq") {
    const FAQ = {
      "Produto e lentes": [
        ["As lentes têm proteção UV?", "Sim! Nossas lentes possuem proteção UV400, bloqueando 100% dos raios ultravioleta nocivos (UVA e UVB)."],
        ["As lentes são polarizadas?", "Sim. Todas as lentes da Just Runner são polarizadas: elas reduzem o reflexo do sol em superfícies brilhantes, como asfalto molhado, água e vidro."],
        ["Qual lente eu escolho?", `Escolha pela luz do seu treino: lentes escuras ou espelhadas para sol forte, lentes mais claras para dias nublados e fim de tarde. Veja o <a href="produto.html?p=radar-ev#guia-lentes">guia de lentes</a>.`],
        ["O Radar EV troca de lente?", "O Radar EV é compatível com o Kit de Lentes Radar EV, vendido à parte."],
        ["Como cuidar do meu óculos?", "Depois do treino, lave com água corrente e sabão neutro, seque com pano macio de microfibra, não deixe no painel do carro ao sol e guarde com a lente para cima."]
      ],
      "Oferta e pagamento": [
        ["Como funciona o Compre 1 Leve 2?", "Cada óculos custa R$ 297. Coloque 2 no carrinho e o 2º sai grátis: o desconto entra sozinho, e o frete também sai grátis. Os combos do Compre 1 Leve 3 já vêm com 3 óculos por R$ 327."],
        ["Posso parcelar?", "Sim, em até 6x sem juros no cartão."],
        ["Como funciona o checkout?", "Ao clicar em \"Comprar Agora\" ou \"Finalizar Compra\", você será redirecionado para nossa plataforma de pagamento segura (Yampi), onde poderá pagar com cartão de crédito, boleto ou Pix."]
      ],
      "Frete e entrega": [
        ["O frete é grátis?", "Sim, em compras acima de R$ 200 (a partir de 2 óculos). Abaixo disso, o frete é calculado no checkout."],
        ["Qual o prazo de entrega?", JR.POLICY.deliveryLong],
        ["Como rastrear meu pedido?", "Você receberá o código de rastreio por e-mail e WhatsApp assim que o pedido for despachado."]
      ],
      "Trocas e devoluções": [
        ["Posso trocar ou devolver um produto?", `Sim. Você tem até ${JR.POLICY.exchangeDays} dias corridos após o recebimento para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor. O produto deve estar sem uso, com embalagem e acessórios. Entre em contato pelo nosso WhatsApp. <a href="trocas-e-devolucoes.html">Ver a política completa</a>.`],
        ["E se o produto chegar com defeito?", "Fale com a gente o quanto antes pelos canais oficiais, com o número do pedido, a descrição do problema e fotos ou vídeos, quando necessário."]
      ],
      "Atendimento": [
        ["Como entro em contato com o suporte?", `Você pode falar conosco pelo formulário na <a href="contato.html">página de contato</a> ou pelo WhatsApp ${C.phone}. Respondemos em horário comercial, de segunda a sábado (${C.hours}).`]
      ]
    };
    const TOPICS = { "Produto e lentes": ["lentes", "lens"], "Oferta e pagamento": ["oferta", "card"], "Frete e entrega": ["frete", "truck"], "Trocas e devoluções": ["trocas", "swap"], "Atendimento": ["atendimento", "chat"] };
    const keys = Object.keys(FAQ);
    const fromQs = keys.find(k => TOPICS[k][0] === new URLSearchParams(location.search).get("tema"));
    let tab = fromQs || keys[0], query = "";
    const plain = h => h.replace(/<[^>]+>/g, "");
    const norm = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const mark = (q, term) => {
      if (!term) return q;
      const i = norm(q).indexOf(norm(term));
      return i < 0 ? q : q.slice(0, i) + "<mark>" + q.slice(i, i + term.length) + "</mark>" + q.slice(i + term.length);
    };
    const item = ([q, a], cat) => `<div class="pfaq-item">${cat ? `<span class="faq-cat">${icon[TOPICS[cat][1]]}${cat}</span>` : ""}<button class="pfaq-q" aria-expanded="false">${mark(q, query)}<span class="pm"></span></button><div class="pfaq-a"><div><p>${a}</p></div></div></div>`;
    const render = () => {
      $("#faq-tabs").innerHTML = keys.map(t => `<button role="tab" aria-selected="${!query && t === tab}" class="${!query && t === tab ? "on" : ""}" data-tab="${t}">${icon[TOPICS[t][1]]}<span>${t}</span><small>${FAQ[t].length} ${FAQ[t].length > 1 ? "perguntas" : "pergunta"}</small></button>`).join("");
      let html, meta = "";
      if (query) {
        const hits = keys.flatMap(k => FAQ[k].filter(([q, a]) => norm(q + " " + plain(a)).includes(norm(query))).map(x => [x, k]));
        meta = hits.length ? `${hits.length} ${hits.length > 1 ? "respostas" : "resposta"} para “${query.replace(/[<>&"]/g, "")}”` : "";
        html = hits.length ? hits.map(([x, k]) => item(x, k)).join("") :
          `<div class="faq-empty">${icon.search}<strong>Nada encontrado para “${query.replace(/[<>&"]/g, "")}”.</strong><span>Tente outra palavra ou pergunte direto para a gente.</span><a class="btn btn-dark" href="${JR.waLink("Olá! Tenho uma dúvida: " + query)}" target="_blank" rel="noopener">${icon.chat} Perguntar no WhatsApp</a></div>`;
      } else html = FAQ[tab].map(x => item(x)).join("");
      $("#faq-meta").textContent = meta;
      const list = $("#faq-list");
      list.innerHTML = html;
      list.classList.remove("swap"); void list.offsetWidth; list.classList.add("swap");
    };
    $("#faq-tabs").addEventListener("click", e => {
      const b = e.target.closest("[data-tab]"); if (!b) return;
      tab = b.dataset.tab; query = ""; $("#faq-q").value = "";
      const u = new URL(location.href); u.searchParams.set("tema", TOPICS[tab][0]); history.replaceState(null, "", u);
      render();
    });
    let t0;
    $("#faq-q").addEventListener("input", e => { clearTimeout(t0); t0 = setTimeout(() => { query = e.target.value.trim(); render(); }, 120); });
    document.addEventListener("keydown", e => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $("#faq-q").focus(); } });
    $("#faq-list").addEventListener("click", e => {
      const q = e.target.closest(".pfaq-q"); if (!q) return;
      const it = q.parentElement, open = !it.classList.contains("open");
      $$("#faq-list .pfaq-item").forEach(x => { x.classList.remove("open"); x.querySelector(".pfaq-q").setAttribute("aria-expanded", "false"); });
      it.classList.toggle("open", open); q.setAttribute("aria-expanded", open);
    });
    render();
  }

  /* ---------- Frete ---------- */
  if (page === "frete-e-entrega") {
    const P = JR.PRICE, max = P.pair;
    $("#sm-rows").innerHTML = [[1, JR.total(1)], [2, JR.total(2)]].map(([n, v]) => {
      const free = v > P.freeShipping;
      return `<div class="sm-row ${free ? "free" : ""}"><span class="sm-label"><b>${n} óculos</b>${JR.brl(v)}</span>
        <span class="sm-track"><i style="--to:${(v / max).toFixed(3)}"></i><u style="left:${(P.freeShipping / max * 100).toFixed(1)}%"><small>${JR.brl(P.freeShipping)}</small></u></span>
        <span class="sm-result">${free ? icon.check + "Frete grátis" : "Frete calculado no checkout"}</span></div>`;
    }).join("");
  }

  /* ---------- Contato ---------- */
  if (page === "contato") {
    $("#wa-card").href = JR.waLink("Olá! Vim pelo site da Just Runner.");
    $("#mail-card").href = `mailto:${C.email}`;
    $("#ig-card").href = `https://instagram.com/${C.instagram}`;
    const f = $("#contact-form"), done = $("#form-done");
    f.addEventListener("submit", e => {
      e.preventDefault();
      const bad = [...f.querySelectorAll("[required]")].find(i => !i.value.trim() || (i.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value)));
      f.querySelectorAll("[required]").forEach(i => i.toggleAttribute("aria-invalid", i === bad));
      if (bad) { bad.focus(); JR.toast("Confere os campos obrigatórios."); return; }
      const swap = () => { f.reset(); f.hidden = true; done.hidden = false; };
      document.startViewTransition ? document.startViewTransition(swap) : swap();
      $("#form-again").focus();
    });
    f.addEventListener("input", e => e.target.removeAttribute("aria-invalid"));
    $("#form-again").addEventListener("click", () => {
      const back = () => { done.hidden = true; f.hidden = false; };
      document.startViewTransition ? document.startViewTransition(back) : back();
      f.querySelector("input").focus();
    });
  }

  /* ---------- Sobre ---------- */
  if (page === "sobre") {
    $("#about-scene").outerHTML = JR.scene({ slot: "sobre-hero", eager: true, sky: "sunset", setting: "bridge", seed: 101, figure: "bust", x: 120, y: 60, s: .75, lens: "Prizm", light: "right" });
    $("#about-pillars").innerHTML = [
      ["Look", "lens", "Performance também pode ter estilo.", "Esportivo no visual, sem exagero."],
      ["Feel", "feather", "Leve o suficiente para você esquecer que está usando.", "Narigueira emborrachada e encaixe confortável."],
      ["Move", "grip", "Você se movimenta. Ele fica no lugar.", "Hastes com grip e encaixe firme."],
      ["Protect", "uv", "Proteção para continuar em movimento.", "Lente polarizada com proteção UV400."]
    ].map(([k, i, t, s]) => `<div class="pl"><span class="pl-k">${icon[i]}${k}</span><strong>${t}</strong><p>${s}</p></div>`).join("");
  }
})();
