/* Liga o protótipo ao catálogo real da Just Runner.
   Dados: assets/catalogo-real.json.js (gerado por scripts/_prototipo-catalogo.mjs, só leitura no Supabase).
   Carrega depois de data.js e antes de app.js: substitui produtos, fotos, preço e checkout do protótipo. */
(function () {
  const REAL = window.JR_REAL;
  if (!REAL) { console.error("catalogo-real.json.js não carregou: o protótipo segue com os dados de exemplo"); return; }
  const ORIG = JR.PRODUCTS;
  const origBySlug = s => ORIG.find(p => p.slug === s);

  /* ---------- Produtos: modelo → cores → lentes, com o catálogo do site no ar (JR- e combos JRC-) ---------- */
  const ORDER = ["radar-ev", "minute", "flak", "eye-jacket-redux", "eye-jacket", "plantaris", "hstn", "half-jacket", "encoder",
    "straight-jacket", "dartboard", "plantaris-squared", "m-frame", "1311", "ellipse", "holbrook", "soto", "sutro", "sphaera", "monster-dog", "radar-ev-kit", "combo"];
  const NOVOS = {   // modelos que não existiam no protótipo do sócio: formato e estilo pro desenho e pros filtros
    "plantaris-squared": ["wrap", "sportstyle"], "m-frame": ["dual", "performance"], "1311": ["wrap", "everyday"],
    ellipse: ["wrap", "everyday"], holbrook: ["wrap", "everyday"], soto: ["wrap", "everyday"], sutro: ["shield", "performance"],
    sphaera: ["shield", "performance"], "monster-dog": ["wrap", "everyday"], "radar-ev-kit": ["shield", "acessorio"], combo: ["wrap", "combo"]
  };
  const slugs = Object.keys(REAL.models).sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));

  JR.REAL_LENS = {};   // slug → cor → lente → { id, sku, price, photos }
  JR.PRODUCTS = slugs.map(slug => {
    const o = origBySlug(slug) || {}, real = REAL.models[slug], novo = NOVOS[slug] || [];
    const colors = real.colors;
    const origOrder = (o.variants || []).map(v => v.name);
    const names = Object.keys(colors).sort((a, b) => (origOrder.indexOf(a) + 1 || 99) - (origOrder.indexOf(b) + 1 || 99));
    JR.REAL_LENS[slug] = colors;
    return {
      slug,
      name: real.name || o.name || slug,
      line: o.line || real.name || slug,
      shape: o.shape || novo[0] || "wrap",
      style: o.style || novo[1] || "everyday",
      combo: !!real.combo,
      interchangeable: !!o.interchangeable,
      variants: names.map(n => {
        const lensNames = Object.keys(colors[n].lenses);
        const ov = (o.variants || []).find(v => v.name === n);
        const lenses = ov ? lensNames.sort((a, b) => (ov.lenses.indexOf(a) + 1 || 99) - (ov.lenses.indexOf(b) + 1 || 99)) : lensNames;
        return { name: n, lenses, frame: (ov && ov.frame) || JR.FRAME[n] || JR.FRAME[n.split(" ")[0]] || "#16181c" };
      })
    };
  });
  JR.bySlug = slug => JR.PRODUCTS.find(p => p.slug === slug);
  JR.realLens = (slug, vIdx, lens) => {
    const p = JR.bySlug(slug), v = p && p.variants[vIdx];
    return v && JR.REAL_LENS[slug][v.name].lenses[lens];
  };

  /* ---------- Preço: igual ao site no ar ----------
     JR- R$ 297 com "Leve 2 pelo preço de 1": entre os óculos elegíveis, do mais caro pro mais barato, cada 2º sai grátis
     (src/lib/cart-store.ts, discount). Combos JRC- (3 óculos por R$ 327) não entram nessa conta. */
  JR.PRICE = { one: 297, pair: 297, combo: 327, freeShipping: 200, installments: 6 };
  JR.priceOf = (slug, vIdx, lens) => { const l = JR.realLens(slug, vIdx, lens); return l ? l.price : JR.PRICE.one; };
  JR.minPrice = slug => { const p = JR.bySlug(slug); return Math.min(...p.variants.flatMap((v, i) => v.lenses.map(l => JR.priceOf(slug, i, l)))); };
  JR.isCombo = slug => !!(JR.bySlug(slug) || {}).combo;
  JR.cartTotals = items => {
    const linhas = items.map(i => ({ ...i, price: JR.priceOf(i.slug, i.v, i.lens) }));
    const subtotal = linhas.reduce((a, i) => a + i.price * i.qty, 0);
    const eleg = linhas.filter(i => !JR.isCombo(i.slug) && i.price >= 90).flatMap(i => Array(i.qty).fill(i.price)).sort((a, b) => b - a);
    let desconto = 0; for (let k = 1; k < eleg.length; k += 2) desconto += eleg[k];
    return { subtotal, desconto, total: subtotal - desconto, oculos: eleg.length };
  };
  /* Compatível com o código do tema: n óculos de R$ 297 no Leve 2 (pares pelo preço de 1). */
  JR.total = n => Math.ceil(n / 2) * JR.PRICE.one;

  /* ---------- Fotos de produto: por cor e lente ---------- */
  JR.photos = (slug, color, lens) => {
    const c = JR.REAL_LENS[slug] && JR.REAL_LENS[slug][color];
    if (!c) return [];
    const l = (lens && c.lenses[lens]) || Object.values(c.lenses)[0];
    const alt = `${(JR.bySlug(slug) || {}).name} ${color}${lens && lens !== "Único" ? " lente " + lens : ""}`;
    return l.photos.map(src => ({ src, alt }));
  };
  /* Miniatura do produto (card, carrinho, seletor de cor, barra fixa): foto real ou ilustração de reserva. */
  JR.thumb = (slug, vIdx, lens, extra = "") => {
    const p = JR.bySlug(slug), v = p.variants[vIdx] || p.variants[0];
    const ph = JR.photos(slug, v.name, lens)[0];
    return ph ? `<img src="${ph.src}" alt="${ph.alt}" loading="lazy" decoding="async" ${extra}>`
      : JR.glasses({ shape: p.shape, frame: v.frame, lens, shadow: false });
  };

  /* Foto "em uso" de cada modelo (banners de categoria do site atual). */
  const CAT = { "radar-ev": "radarev", flak: "flak", minute: "minute", plantaris: "plantaris", hstn: "hstn", "eye-jacket": "eyejacket",
    "eye-jacket-redux": "eyejacket", "straight-jacket": "straightjacket", encoder: "encoder", "half-jacket": "halfjacket" };
  JR.lifestyle = slug => CAT[slug] ? { src: `fotos/cat-${CAT[slug]}-mobile.jpg`, alt: `${JR.bySlug(slug).name} em uso` } : null;

  /* Vitrines do site no ar: destaques do "Leve 2" (home), Lançamentos (src/lib/lancamentos.ts) e combos. */
  const idx = ([slug, cor, lente]) => { const p = JR.bySlug(slug); if (!p) return null; const i = p.variants.findIndex(v => v.name === cor); return i < 0 ? null : [slug, i, lente]; };
  const destaque = (REAL.vitrines.leve2Destaque || []).map(idx).filter(Boolean);
  const naoCombo = JR.PRODUCTS.filter(p => !p.combo && p.style !== "acessorio");
  JR.SHOWCASE = {
    offer: destaque,
    leve2: [...destaque, ...naoCombo.flatMap(p => p.variants.map((v, i) => [p.slug, i, v.lenses[0]]))
      .filter(([s, i]) => !destaque.some(d => d[0] === s && d[1] === i))],
    lancamentos: (REAL.vitrines.lancamentos || []).map(idx).filter(Boolean),
    combos: (JR.bySlug("combo") || { variants: [] }).variants.map((v, i) => ["combo", i, v.lenses[0]]),
    all: naoCombo.map(p => [p.slug, 0, p.variants[0].lenses[0]])
  };

  /* ---------- Checkout real da Yampi ---------- */
  const STORE_TOKEN = "BDMGAOde7Xbg3YDZxV5e7IJb5rkqTGKHZJ2SaUtU";   // token público, o mesmo do site
  JR.checkoutUrl = items => {
    const lines = items.map(i => ({ l: JR.realLens(i.slug, i.v, i.lens), q: i.qty })).filter(x => x.l);
    if (!lines.length) return null;
    return `https://${REAL.checkoutDomain}/cart/items?` +
      lines.map(x => `product_option_id%5B%5D=${x.l.id}&quantity%5B%5D=${x.q}`).join("&") +
      `&redirectTo=checkout&skipToCheckout=1&store_token=${STORE_TOKEN}&clearCart=1` +
      `&utm_source=prototipo&utm_medium=teste&utm_campaign=tema-novo`;
  };

  /* ---------- Fotos de página (slots do tema) ---------- */
  const cli = n => `fotos/clientes/feedback-${String(n).padStart(2, "0")}.jpg`;
  JR.SITE_IMAGES = {
    "home-hero":        { src: "fotos/cat-radarev.jpg", alt: "Corredora com Radar EV" },
    "home-feito-para":  { src: "fotos/cat-plantaris.jpg", alt: "Corredor com Plantaris" },
    "home-marca":       { src: "fotos/cat-straightjacket.jpg", alt: "Atleta com Straight Jacket" },
    "sobre-hero":       { src: "fotos/cat-eyejacket.jpg", alt: "Atleta com Eye Jacket" },
    "home-beneficio-1": { src: cli(4),  alt: "Cliente ajustando o óculos" },
    "home-beneficio-2": { src: cli(13), alt: "Cliente usando Just Runner" },
    "home-beneficio-3": { src: cli(18), alt: "Cliente no sol com Just Runner" },
    "home-beneficio-4": { src: cli(22), alt: "Cliente com Just Runner" },
    "home-comunidade-1": { src: cli(1),  who: "Na rua" },
    "home-comunidade-2": { src: cli(21), who: "Dia de prova" },
    "home-comunidade-3": { src: cli(2),  who: "Treino na cidade" },
    "home-comunidade-4": { src: cli(8),  who: "Na pista" },
    "home-comunidade-5": { src: cli(15), who: "Pós-treino" },
    "home-comunidade-6": { src: cli(5),  who: "Medalha no peito" },
    "home-comunidade-7": { src: cli(29), who: "Prova em Brasília" },
    "home-uso-1": { src: "fotos/cat-radarev-mobile.jpg", alt: "Radar EV" },
    "home-uso-2": { src: "fotos/cat-flak-mobile.jpg", alt: "Flak" },
    "home-uso-3": { src: "fotos/cat-hstn-mobile.jpg", alt: "HSTN" },
    "home-uso-4": { src: "fotos/cat-minute-mobile.jpg", alt: "Minute" },
    /* 12/10: visão de dentro do óculos na pista (download do usuário); a anterior era fotos/comparador.jpg. */
    "pdp-comparador": { src: "fotos/comparador-pista.jpg", alt: "Pista de atletismo vista através da lente" },
    /* Ao lado do vídeo (12/10): 3 peças passando sozinhas. ?lado=1 e ?lado=2 mostram as peças únicas anteriores. */
    "pdp-lado-video": (() => {
      const q = new URLSearchParams(location.search).get("lado");
      if (q === "1") return { src: "fotos/ao-lado-video.png", alt: "Sua corrida como você nunca viu. Estilo também é parte do ritmo. Corre, termina, continua." };
      if (q === "2") return { src: "fotos/ao-lado-video-2.png", alt: "Performance em cada detalhe: UV400, leveza, grip e resistência." };
      return { slides: [
        { src: "fotos/lado-video-corrida.jpg", alt: "Sua corrida como você nunca viu. Performance que leva o movimento para além do treino." },
        { src: "fotos/lado-video-trail.jpg",   alt: "No trail, cada passo conta." },
        { src: "fotos/lado-video-bike.jpg",    alt: "Pedala. Segue. Continua." }
      ] };
    })(),
    "pdp-ugc-1": { src: cli(10), alt: "Cliente usando Just Runner" },
    "pdp-ugc-2": { src: cli(11), alt: "Cliente usando Just Runner" },
    "pdp-ugc-3": { src: cli(12), alt: "Cliente usando Just Runner" },
    "pdp-ugc-4": { src: cli(23), alt: "Cliente usando Just Runner" },
    /* Artes prontas do usuário (12/10), com texto embutido: o card mostra a arte inteira, sem legenda por cima. */
    "guia-lente-1": { src: "fotos/guia-lente-1.jpg", alt: "Para sol quente: ideal para dias ensolarados e treinos com alta luminosidade.", arte: true },
    "guia-lente-2": { src: "fotos/guia-lente-2.jpg", alt: "Dias nublados", arte: true },
    "guia-lente-3": { src: "fotos/guia-lente-3.jpg", alt: "Corrida matinal: amanhecer e entardecer", arte: true },
    "guia-lente-4": { src: "fotos/guia-lente-4.jpg", alt: "Óculos versáteis: do treino ao dia a dia", arte: true },
    "estilo-1": { src: "fotos/cat-radarev-mobile.jpg", alt: "Performance" },
    "estilo-2": { src: "fotos/cat-eyejacket-mobile.jpg", alt: "Sportstyle" },
    "estilo-3": { src: "fotos/cat-hstn-mobile.jpg", alt: "Everyday" }
  };
})();
