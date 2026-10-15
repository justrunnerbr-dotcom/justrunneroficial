/* Home — monta as seções a partir dos dados e das ilustrações. */
(function () {
  const { $, icon } = JR;
  const mount = (id, html, cls) => {
    const el = $("#" + id);
    el.insertAdjacentHTML("beforebegin", html);
    const node = el.previousElementSibling;
    if (cls) node.classList.add(cls);
    el.remove();
  };

  JR.boot();
  document.querySelectorAll("[data-i]").forEach(s => s.outerHTML = icon[s.dataset.i]);

  /* Hero */
  if ($("#hero-scene")) mount("hero-scene", JR.scene({ slot: "home-hero", eager: true,
    sky: "sunset", setting: "bridge", seed: 11, figure: "bust",
    x: 95, y: 100, s: .7, light: "right", hair: "short", skin: "#b9805a", shirt: "#0e0f12",
    lens: "Espelhada", frame: "#e9ecef", beard: true
  }), "hero-scene");

  if ($("#hero-benefits")) $("#hero-benefits").innerHTML = [
    ["feather", "Leve", "Quase não sente"], ["grip", "Firme", "Menos ajustes"], ["uv", "UV400", "Polarizada"], ["swap", "Versátil", "Treino e dia a dia"]
  ].map(([i, t, s]) => `<div class="benefit"><div class="b-ico">${icon[i]}</div><strong>${t}</strong><span>${s}</span></div>`).join("");

  /* Oferta */
  if ($("#offer-scene")) mount("offer-scene", JR.scene({ slot: "home-oferta", sky: "golden", setting: "rocks", seed: 5, align: "xMidYMax" }));
  /* Desenho dos dois óculos removido a pedido (12/10). */

  const cards = (list, opts) => list.map(([s, v, l]) => JR.card(s, v, l, opts)).join("");
  /* Vitrines iguais ao site no ar (12/10): destaques do Leve 2 + resto do catálogo, combos e lançamentos. */
  const vit = (id, list) => { const el = $("#" + id); if (el) el.innerHTML = list.map(([sl, v, l]) => JR.card(sl, v, l, { lentes: true })).join(""); };
  vit("vit-leve2", JR.SHOWCASE.homeLeve2(JR.SHOWCASE.leve2));
  vit("vit-leve3", JR.SHOWCASE.combos.slice(0, 8));   // 15/10: 8 combos na home (a categoria Combos mostra todos)
  vit("vit-lanc", JR.SHOWCASE.lancamentos);
  vit("vit-mais", (JR.SHOWCASE.maisVendidos || []).slice(0, 8));
  JR.bindCards();

  /* Feito para correr */
  if ($("#made-scene")) mount("made-scene", JR.scene({ slot: "home-feito-para",
    sky: "sunset", setting: "road", seed: 3, figure: "runner", x: 230, y: 30, s: .85, lens: "Ruby", align: "xMidYMin"
  }));
  const feats = [
    { ico: "feather", t: "Leve", p: "Leve o suficiente para você esquecer que está usando.",
      sc: { sky: "day", setting: "track", seed: 21, figure: "runner", x: 90, y: 130, s: 1.25, lens: "Sapphire", color: "#1a1d22" } },
    { ico: "grip", t: "Firme", p: "Você se movimenta. Ele permanece no lugar.",
      sc: { sky: "studio", setting: "city", seed: 8, figure: "bust", x: 20, y: 40, s: .9, hair: "buzz", skin: "#9a6848", lens: "Espelhada", light: "left" } },
    { ico: "uv", t: "Proteção UV400", p: "Mais conforto para os olhos no sol.",
      sc: { sky: "golden", setting: "road", seed: 14, figure: "bust", x: 20, y: 46, s: .9, hair: "pony", skin: "#c28d68", lens: "Azul", light: "right", tank: true } },
    { ico: "lens", t: "Estilo", p: "Visual esportivo, sem exagero.",
      sc: { sky: "overcast", setting: "city", seed: 30, figure: "bust", x: 20, y: 40, s: .9, hair: "cap", cap: "#d8dde3", skin: "#a87352", lens: "Sapphire", light: "left" } }
  ];
  /* Versão clean: ícone de traço fino no lugar da foto (pedido de 09/10). */
  const LINE = {
    feather: '<path d="M44 6c-9 1-18 6-24 14-5 7-7 15-7 22l-6 6"/><path d="M13 42c8 0 16-3 22-9 6-7 9-16 9-27"/><path d="M20 33h11M24 26h13M29 19h11"/>',
    grip: '<path d="M4 31c6-10 15-15 24-15s18 5 24 15"/><path d="M4 31c3 2 7 2 10-1 4-4 8-6 14-6s10 2 14 6c3 3 7 3 10 1"/><path d="M22 18c2 3 2 6 0 8M34 18c-2 3-2 6 0 8"/>',
    uv: '<path d="M28 5l18 7v13c0 12-8 21-18 25C18 46 10 37 10 25V12z"/><path d="M20 27l6 6 11-12"/>',
    lens: '<path d="M4 18h48v6c0 6-4 11-10 11h-4c-4 0-6-2-8-6l-2-3-2 3c-2 4-4 6-8 6h-4C8 35 4 30 4 24z"/><path d="M4 18c0-2 1-3 3-3h42c2 0 3 1 3 3"/>'
  };
  if ($("#feats")) $("#feats").innerHTML = feats.map(f => `
    <div class="feat feat-clean reveal">
      <svg viewBox="0 0 56 52" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE[f.ico]}</svg>
      <strong>${f.t}</strong><p>${f.p}</p>
    </div>`).join("");

  /* Prova social */
  mount("social-scene", JR.scene({ slot: "home-comunidade-fundo", sky: "forest", setting: "forest", seed: 41 }));
  const people = [
    { sky: "day", setting: "city", seed: 2, hair: "cap", cap: "#1d2430", skin: "#b07a55", lens: "Azul", who: "Longão de domingo" },
    { sky: "sunset", setting: "bridge", seed: 4, hair: "short", hairColor: "#3a2a1e", skin: "#d39a74", lens: "Ruby", tank: true, who: "Pedal de sábado" },
    { sky: "overcast", setting: "city", seed: 6, hair: "visor", cap: "#f2f4f6", skin: "#c98f68", lens: "Tanzanite", who: "Pace na rua" },
    { sky: "forest", setting: "trees", seed: 9, hair: "pony", skin: "#c48a62", lens: "Gold", tank: true, shirt: "#e9ecef", who: "Trail no fim de semana" },
    { sky: "day", setting: "track", seed: 12, hair: "short", skin: "#a26e4c", lens: "Sapphire", shirt: "#1f4ea6", who: "Treino de pista" },
    { sky: "dusk", setting: "city", seed: 13, hair: "buzz", skin: "#7a5038", lens: "Prizm", who: "Do treino para o trabalho" },
    { sky: "golden", setting: "road", seed: 15, hair: "short", hairColor: "#2a1d14", skin: "#c99572", lens: "Espelhada", tank: true, shirt: "#e6e8eb", who: "Dia de prova" }
  ];
  $("#strip").innerHTML = people.map((p, i) => `
    <div class="ph reveal">${JR.scene({ ...p, slot: "home-comunidade-" + (i + 1), figure: "bust", x: -20 + (i % 2) * 8, y: 30, s: 1.05, light: i % 2 ? "left" : "right", beard: i === 6 })}<span class="who">${(JR.SITE_IMAGES["home-comunidade-" + (i + 1)] || {}).who || p.who}</span></div>`).join("") +
    `<a class="btn btn-white more-btn" href="https://instagram.com/${JR.CONTACT.instagram}" target="_blank" rel="noopener">Ver no Instagram ${icon.arrow}</a>`;

  /* Encontre seu Just Runner */
  const tiles = [
    { t: "Para correr", p: "Pronto para qualquer treino", href: "produto.html?p=radar-ev",
      sc: { sky: "day", setting: "track", seed: 22, figure: "bust", x: 10, y: 40, s: .92, hair: "short", skin: "#b07a55", lens: "Azul", tank: true, light: "right" } },
    { t: "Para treinar", p: "Mais estabilidade. Menos ajustes.", href: "produto.html?p=flak",
      sc: { sky: "day", setting: "trees", seed: 24, figure: "bust", x: 10, y: 40, s: .92, hair: "buzz", skin: "#c48d66", lens: "Espelhada", shirt: "#1d3a4a", light: "left" } },
    { t: "Para o dia a dia", p: "Do treino para o resto do dia", href: "produto.html?p=hstn",
      sc: { sky: "overcast", setting: "city", seed: 26, figure: "bust", x: 10, y: 40, s: .92, hair: "short", hairColor: "#3b2a1e", skin: "#d0a07c", lens: "Preta", shirt: "#2a2d33", light: "right", beard: true } },
    { t: "Lentes claras", p: "Mais contraste com pouca luz", href: "produto.html?p=minute&c=1&l=Low%20Light",
      sc: { sky: "dusk", setting: "city", seed: 28, figure: "bust", x: 10, y: 40, s: .92, hair: "cap", cap: "#b7a3e6", skin: "#c99572", lens: "Sapphire", light: "left" } }
  ];
  /* Fotos prontas do usuário (12/10): já trazem título, frase e seta; sem legenda por cima. */
  const fotosUso = [
    { src: "fotos/encontre-corrida.jpg",   alt: "Corrida: pronta para acompanhar cada treino",      href: "colecao.html?cat=corrida" },
    { src: "fotos/encontre-bike.jpg",      alt: "Bike: feito para acompanhar o seu ritmo",          href: "colecao.html?cat=bike" },
    { src: "fotos/encontre-trail.jpg",     alt: "Trail: proteção e foco em qualquer terreno",       href: "colecao.html?cat=trail" },
    { src: "fotos/encontre-beach.jpg",     alt: "Beach sports: leveza e foco para jogar na areia",  href: "colecao.html?cat=beach" },
    { src: "fotos/encontre-lifestyle.jpg", alt: "Lifestyle: estilo para acompanhar sua rotina",     href: "colecao.html?cat=lifestyle" }
  ];
  if (fotosUso.length) {
    $("#tiles").classList.add("tiles-foto");
    $("#tiles").innerHTML = fotosUso.map(f => `
    <a class="tile-foto reveal" href="${f.href}"><img src="${f.src}" alt="${f.alt}" loading="lazy" decoding="async" width="1000" height="1111"></a>`).join("");
  } else
  $("#tiles").innerHTML = tiles.map((t, i) => `
    <a class="tile reveal" href="${t.href}">${JR.scene({ ...t.sc, slot: "home-uso-" + (i + 1) })}
      <div class="cap"><h3>${t.t}</h3><p>${t.p}</p><span class="go">${icon.arrow}</span></div></a>`).join("");

  /* Educação: lente pela luz do treino (mesma classificação do guia da PDP) */
  $("#edu-grid").innerHTML = JR.LENS_GUIDE.map(g => `
    <a class="edu-card reveal" href="produto.html?p=radar-ev#guia-lentes">
      <span class="edu-dots">${g.lenses.slice(0, 3).map(l => `<i style="background:${JR.lensCss(l)}" title="${l}"></i>`).join("")}</span>
      <strong>${g.title}</strong><span>${g.text}</span>
    </a>`).join("");

  /* Redução de risco: só sinais reais e documentados */
  $("#risk-grid").innerHTML = [
    ["truck", "Frete grátis acima de R$ 200", "Envio com código de rastreio."],
    ["swap", "Troca em até 7 dias", "Não gostou de como ficou? Dá para trocar em até 7 dias corridos após o recebimento (produto sem uso, na embalagem)."],
    ["lock", "Checkout seguro Yampi", "Parcele em até 12x no cartão."],
    ["chat", "Dúvida antes de comprar?", "Fale com a gente no WhatsApp."]
  ].map(([i, t, s], n) => `<div class="risk-item reveal">${icon[i]}<div><strong>${t}</strong><span>${s}</span></div>${n === 3 ? `<a class="btn btn-outline-dark" href="${JR.waLink()}" target="_blank" rel="noopener">Chamar ${icon.arrow}</a>` : ""}</div>`).join("");

  /* Institucional */
  /* 13/10: fundo da seção da marca = banner "footer" do usuário (desktop 3:1 e mobile quadrado) */
  mount("brand-scene", `<picture class="brand-bg"><source media="(max-width: 760px)" srcset="fotos/banner-footer-mobile.jpg"><img src="fotos/banner-footer.jpg" alt="" loading="lazy" decoding="async"></picture>`);

  /* Newsletter */
  $("#news-form").addEventListener("submit", e => {
    e.preventDefault();
    const input = e.target.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) { input.focus(); JR.toast("Confere o e-mail: parece incompleto."); return; }
    input.value = "";
    JR.toast("Pronto! Você vai receber as novidades da Just Runner.");
  });

  document.querySelectorAll(".reveal:not(.in)").forEach(el => {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: .12 });
      io.observe(el);
    } else el.classList.add("in");
  });
})();

/* Banners de oferta: carrossel com rolagem nativa, troca sozinho a cada 6 s (pausa com reduced-motion). */
(function () {
  const track = document.getElementById("rb-track"), dots = document.getElementById("rb-dots");
  if (!track) return;
  const n = track.children.length;
  dots.innerHTML = Array.from({ length: n }, (_, i) => `<button aria-label="Banner ${i + 1}" data-rb="${i}"></button>`).join("");
  const cur = () => Math.round(track.scrollLeft / track.clientWidth);
  const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle("on", i === cur()));
  const to = i => track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  dots.addEventListener("click", e => { const b = e.target.closest("[data-rb]"); if (b) to(+b.dataset.rb); });
  track.addEventListener("scroll", paint, { passive: true }); paint();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setInterval(() => { if (!document.hidden) to((cur() + 1) % n); }, 6000);
})();
