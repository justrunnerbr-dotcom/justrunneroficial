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
  /* Case Protetor (15/10): order bump do carrinho, R$ 35. Só existe na Yampi (produto 46425569, SKU CASE-PROTETOR),
     fora do Supabase; style "acessorio" deixa ele fora de vitrines e categorias. */
  JR.CASE = { slug: "case", id: "306394762", sku: "CASE-PROTETOR", price: 35, foto: "fotos/case.jpg" };
  JR.REAL_LENS.case = { "Padrão": { productSlug: "case", lenses: { "Único": { id: JR.CASE.id, sku: JR.CASE.sku, price: JR.CASE.price, photos: [JR.CASE.foto] } } } };
  JR.PRODUCTS.push({ slug: "case", name: "Case Protetor", line: "Case", shape: "wrap", style: "acessorio", combo: false, interchangeable: false,
    variants: [{ name: "Padrão", lenses: ["Único"], frame: "#16181c" }] });
  JR.bySlug = slug => JR.PRODUCTS.find(p => p.slug === slug);
  JR.CATEGORIAS = REAL.categorias || [];   // menu "Categorias", na ordem do site antigo
  JR.realLens = (slug, vIdx, lens) => {
    const p = JR.bySlug(slug), v = p && p.variants[vIdx];
    return v && JR.REAL_LENS[slug][v.name].lenses[lens];
  };

  /* ---------- Preço: igual ao site no ar ----------
     JR- R$ 297 com "Leve 2 pelo preço de 1": entre os óculos elegíveis, do mais caro pro mais barato, cada 2º sai grátis
     (src/lib/cart-store.ts, discount). Combos JRC- (3 óculos por R$ 327) não entram nessa conta. */
  JR.PRICE = { one: 297, pair: 297, combo: 327, freeShipping: 200, installments: 12 };
  /* op = item da Oferta Progressiva (SKU JROP-, R$ 175): mesma cor/lente, outro id na Yampi. */
  JR.opOf = (slug, vIdx, lens) => { const l = JR.realLens(slug, vIdx, lens); return l && l.op; };
  /* oe = item da Oferta Exclusiva (SKU JROE-, R$ 147,90, 26/10): mesma ideia, só nos modelos escolhidos pelo dono, sem desconto por quantidade. */
  JR.oeOf = (slug, vIdx, lens) => { const l = JR.realLens(slug, vIdx, lens); return l && l.oe; };
  const versao = (l, op, oe) => (oe && l.oe) || (op && l.op) || l;
  JR.priceOf = (slug, vIdx, lens, op, oe) => { const l = JR.realLens(slug, vIdx, lens); return l ? versao(l, op, oe).price : JR.PRICE.one; };
  JR.skuOf = (slug, vIdx, lens, op, oe) => { const l = JR.realLens(slug, vIdx, lens) || {}; return versao(l, op, oe).sku; };
  JR.minPrice = slug => { const p = JR.bySlug(slug); return Math.min(...p.variants.flatMap((v, i) => v.lenses.map(l => JR.priceOf(slug, i, l)))); };
  JR.isCombo = slug => !!(JR.bySlug(slug) || {}).combo;
  /* 19/10 (pedido do dono): preço de entrada R$ 175 em todo o site. Vende a versão JROP (Oferta Progressiva:
     1 por R$ 175, 2 por R$ 297 com R$ 53 de desconto aplicado pela Yampi). Combos e Kit de Lentes (sem JROP) seguem no preço deles.
     Desligar = false volta tudo pro R$ 297 com 2º grátis. "pedido" = escolha explícita (true/false); sem ela vale o padrão. */
  JR.OP_PADRAO = true;
  JR.querOp = (slug, vIdx, lens, pedido) => !!((pedido ?? JR.OP_PADRAO) && !JR.isCombo(slug) && JR.opOf(slug, vIdx, lens));
  /* Mesmas contas do src/lib/cart-store.ts: Leve 2 (JR-, cada 2º grátis, do mais caro pro mais barato; combo fora)
     + Oferta Progressiva (JROP-, desconto fixo de R$ 53 a partir de 2 óculos). */
  JR.cartTotals = items => {
    const linhas = items.map(i => ({ ...i, price: JR.priceOf(i.slug, i.v, i.lens, i.op, i.oe) }));
    const subtotal = linhas.reduce((a, i) => a + i.price * i.qty, 0);
    const eleg = linhas.filter(i => !i.op && !i.oe && !JR.isCombo(i.slug) && i.price >= 90).flatMap(i => Array(i.qty).fill(i.price)).sort((a, b) => b - a);
    let desconto = 0; for (let k = 1; k < eleg.length; k += 2) desconto += eleg[k];
    const opQtd = linhas.filter(i => i.op && !i.oe).reduce((a, i) => a + i.qty, 0);
    const descontoOp = opQtd >= 2 ? 53 : 0;
    return { subtotal, desconto, descontoOp, total: subtotal - desconto - descontoOp, oculos: eleg.length, opQtd };
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
  /* 15/10, pedido do usuário: no topo da home, Minute Preta → Minute Cooper (marrom) com lente VR28, e Flak Preta com a foto da lente Preta. */
  const TROCA_DESTAQUE = { "minute|Preta": ["minute", "Cooper", "VR28"], "flak|Preta": ["flak", "Preta", "Preta"] };
  const destaque = (REAL.vitrines.leve2Destaque || []).map(d => TROCA_DESTAQUE[d[0] + "|" + d[1]] || d).map(idx).filter(Boolean);
  const naoCombo = JR.PRODUCTS.filter(p => !p.combo && p.style !== "acessorio");
  /* Posição da armação no ranking de vendas (src/lib/best-sellers.ts); quem não vendeu vai pro fim. */
  const RANK = REAL.ranking || [];
  const rankDe = ([slug, i]) => { const v = JR.bySlug(slug).variants[i]; const r = RANK.indexOf(JR.REAL_LENS[slug][v.name].productSlug); return r < 0 ? 999 : r; };
  /* Tira vizinhos do mesmo modelo: troca com o próximo de outro modelo (a partir de `de`, o começo fica fixo). */
  const semVizinho = (lista, de = 0) => {
    for (let k = Math.max(1, de); k < lista.length; k++) {
      if (lista[k][0] !== lista[k - 1][0]) continue;
      const j = lista.findIndex((x, n) => n > k && x[0] !== lista[k - 1][0] && (n + 1 >= lista.length || lista[n + 1][0] !== lista[k][0]) && lista[n - 1][0] !== lista[k][0]);
      if (j > 0) [lista[k], lista[j]] = [lista[j], lista[k]];
    }
    return lista;
  };
  /* Espalha cada modelo por igual na lista (Radar com 13 cores não forma bloco), mais vendido primeiro dentro do modelo. */
  const espalhar = itens => {
    const grupos = {}; itens.forEach(x => (grupos[x[0]] ||= []).push(x));
    const ordem = Object.keys(grupos).map(g => grupos[g].sort((a, b) => rankDe(a) - rankDe(b)));
    ordem.sort((a, b) => rankDe(a[0]) - rankDe(b[0]));
    return semVizinho(ordem.flatMap((g, gi) => g.map((x, j) => ({ x, k: (j + .5) / g.length + gi * 1e-4 }))).sort((a, b) => a.k - b.k).map(o => o.x));
  };
  /* Primeiro a cor mais vendida de cada modelo (mais vendidos primeiro, como "Lentes Mais Vendidas" da JHF), depois o resto espalhado. */
  const rodizio = itens => {
    const grupos = {}; itens.forEach(x => (grupos[x[0]] ||= []).push(x));
    const g = Object.values(grupos).map(l => l.sort((a, b) => rankDe(a) - rankDe(b))).sort((a, b) => rankDe(a[0]) - rankDe(b[0]));
    const topo = g.map(l => l[0]);
    return semVizinho([...topo, ...espalhar(g.flatMap(l => l.slice(1)))], topo.length);
  };

  /* ---------- Lentes Mais Vendidas (13/10, mesma ideia da JHF): uma página por cor de lente ----------
     A cor sai do nome da lente no catálogo ("Ruby + Kit Vermelho" → vermelha; "Roxa · Ruby" → roxa, a 1ª).
     Lente que o nome não diz a cor (Único, Prizm, Degrade, Low Light…) não entra. */
  JR.LENTES = [
    { slug: "preta", emoji: "⚫", nome: "Lente Preta", inclui: "Preta e Full Black", termos: /\b(preta|preto|black)\b/,
      texto: "A mais versátil: segura o sol forte no treino e combina com qualquer roupa no dia a dia. A escolha que nunca erra." },
    { slug: "vermelha", emoji: "🔴", nome: "Lente Vermelha", inclui: "Ruby, Dark Ruby, Prizm Ruby e Torch", termos: /\b(ruby|rubi|torch|vermelh[ao])\b/,
      texto: "Reflexo vermelho que aparece de longe. Contraste alto no asfalto e na trilha, com cara de dia de prova." },
    { slug: "azul", emoji: "🔵", nome: "Lente Azul", inclui: "Tanzanite, Sapphire, Neon Blue e Azul", termos: /\b(tanzanite|sapphire|safira|azul|blue)\b/,
      texto: "Reflexo azul gelado, o clássico dos óculos esportivos. Ideal para sol aberto, praia e pedal." },
    { slug: "espelhada", emoji: "🪞", nome: "Lente Espelhada", inclui: "Espelhada e Silver", termos: /\b(espelhad[ao]|silver|mirror)\b/,
      texto: "Efeito espelho prata que reflete tudo. Moderna, discreta para os olhos e forte nas fotos." },
    { slug: "dourada", emoji: "🟡", nome: "Lente Dourada", inclui: "Gold, Gold Café e Dourada", termos: /\b(gold|24k|dourad[ao])\b/,
      texto: "Reflexo dourado com presença. Fica bonita em armação preta, cinza ou transparente." },
    { slug: "roxa", emoji: "🟣", nome: "Lente Roxa", inclui: "Roxa", termos: /\b(roxa|roxo|violet|violeta)\b/,
      texto: "Um tom que foge do óbvio. Estilo com personalidade, do treino ao rolê." },
    { slug: "vr28", emoji: "🟤", nome: "Lente VR28", inclui: "VR28 e Marrom", termos: /\b(vr2[89]|marrom|bronze)\b/,
      texto: "Tom marrom quente que realça o contraste. Boa em dia nublado, fim de tarde e trilha com sombra." }
  ];
  const norm = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  JR.lenteDe = nome => { const l = norm(nome.split(/\s*[+·]\s*/)[0]); return JR.LENTES.find(x => x.termos.test(l)) || null; };
  JR.lenteLista = slug => rodizio(JR.PRODUCTS.filter(p => !p.combo && p.style !== "acessorio")
    .flatMap(p => p.variants.flatMap((v, i) => v.lenses.filter(l => (JR.lenteDe(l) || {}).slug === slug).map(l => [p.slug, i, l]))));

  /* ---------- Encontre seu Just Runner (15/10): modelos escolhidos pelo usuário por esporte ----------
     Entra toda cor × lente dos modelos (volume), a mais vendida de cada modelo primeiro e o resto espalhado sem vizinho igual. */
  /* 15/10 (2ª lista do usuário, "Óculos Modalidades"). Item = "modelo", "modelo:Cor da armação" ou "modelo::cor da lente" (JR.LENTES). */
  JR.ESTILOS = {
    bike:      ["sutro", "sphaera", "encoder", "radar-ev"],
    trail:     ["eye-jacket-redux", "eye-jacket::roxa", "radar-ev", "flak"],
    corrida:   ["radar-ev", "eye-jacket", "minute", "hstn"],
    beach:     ["flak:Branca", "half-jacket", "m-frame", "radar-ev", "sutro"],
    lifestyle: ["plantaris", "straight-jacket", "dartboard", "soto", "monster-dog", "holbrook"]
  };

  /* Dentro do modelo, rodízio de cores (cor mais vendida primeiro): Radar com 47 variações não gruda 5 lentes da mesma cor. */
  JR.estiloLista = cat => {
    const modelos = [...new Set(JR.ESTILOS[cat] || [])].map(item => {
      const [slug, cor, lente] = item.split(":"), p = JR.bySlug(slug);
      if (!p) return null;
      const cores = p.variants.map((v, i) => cor && v.name !== cor ? [] : v.lenses.filter(l => !lente || (JR.lenteDe(l) || {}).slug === lente).map(l => [p.slug, i, l]))
        .filter(c => c.length).sort((a, b) => rankDe(a[0]) - rankDe(b[0]));
      return cores.length ? cores : null;
    }).filter(Boolean).map(cores => {
      const fila = []; for (let n = 0; cores.some(c => c[n]); n++) cores.forEach(c => c[n] && fila.push(c[n]));
      return fila;
    }).sort((a, b) => rankDe(a[0]) - rankDe(b[0]));
    const topo = modelos.map(f => f[0]);
    const resto = modelos.flatMap((f, gi) => f.slice(1).map((x, j) => ({ x, k: (j + .5) / (f.length - 1) + gi * 1e-4 }))).sort((a, b) => a.k - b.k).map(o => o.x);
    return semVizinho([...topo, ...resto], topo.length);
  };

  JR.SHOWCASE = {
    offer: destaque,
    /* 13/10: depois dos destaques, os modelos espalhados (antes vinham todas as cores do Radar juntas, depois as do Minute…) */
    leve2: semVizinho([...destaque, ...espalhar(naoCombo.flatMap(p => p.variants.map((v, i) => [p.slug, i, v.lenses[0]]))
      .filter(([s, i]) => !destaque.some(d => d[0] === s && d[1] === i)))], destaque.length),
    /* Topo da home: os 12 primeiros (15/10; eram 8) do Leve 2 sem as cores que saíram do destaque (a Minute Preta não volta no 8º lugar). */
    homeLeve2: (l => l.filter(([s, i]) => !TROCA_DESTAQUE[s + "|" + JR.bySlug(s).variants[i].name] || destaque.some(d => d[0] === s && d[1] === i)).slice(0, 12)),
    /* 15/10: Ellipse Preta sai, Monster Dog All Black entra no lugar (a Marrom já está na lista) */
    lancamentos: (REAL.vitrines.lancamentos || []).map(d => d[0] === "ellipse" && d[1] === "Preta" ? ["monster-dog", "All Black", "Único"] : d).map(idx).filter(Boolean),
    combos: (JR.bySlug("combo") || { variants: [] }).variants.map((v, i) => ["combo", i, v.lenses[0]]),
    /* Oferta Progressiva: cada cor que tem versão JROP, na 1ª lente com JROP */
    oferta: naoCombo.flatMap(p => p.variants.map((v, i) => { const l = v.lenses.find(x => (JR.REAL_LENS[p.slug][v.name].lenses[x] || {}).op); return l ? [p.slug, i, l] : null; })).filter(Boolean),
    /* Oferta Exclusiva (26/10): toda cor × lente com versão JROE, uma lente de cada armação por vez (não fica a mesma armação em sequência) */
    exclusiva: (() => {
      const filas = naoCombo.flatMap(p => p.variants.map((v, i) => v.lenses.filter(x => (JR.REAL_LENS[p.slug][v.name].lenses[x] || {}).oe).map(x => [p.slug, i, x]))).filter(f => f.length);
      const out = []; for (let k = 0; out.length < filas.reduce((a, f) => a + f.length, 0); k++) filas.forEach(f => f[k] && out.push(f[k]));
      return out;
    })(),
    all: naoCombo.map(p => [p.slug, 0, p.variants[0].lenses[0]]),
    /* Mais vendidos (13/10): os 4 do banner escolhidos pelo usuário + os 8 seguintes do ranking de vendas
       da Yampi (src/lib/best-sellers.ts), cada um como armação/produto do site antigo. */
    maisVendidos: [
      ["flak", "Preta", "Preta"], ["eye-jacket-redux", "Branca", "Preta"], ["radar-ev", "Preta", "Sapphire"], ["minute", "Cooper", "VR28"],   // 15/10: Minute Preta → Cooper VR28
      ...["radar-ev-piet", "eye-jacket", "hstn-preta", "half-jacket", "plantaris-preta", "radar-ev-cooper", "encoder"]
        .map(ps => { for (const p of naoCombo) { const i = p.variants.findIndex(v => JR.REAL_LENS[p.slug][v.name].productSlug === ps); if (i >= 0) return [p.slug, p.variants[i].name, p.variants[i].lenses[0]]; } return null; })
        .filter(Boolean)
    ].map(([sl, cor, l]) => { const p = JR.bySlug(sl); const i = p ? p.variants.findIndex(v => v.name === cor) : -1; return i < 0 ? null : [sl, i, p.variants[i].lenses.includes(l) ? l : p.variants[i].lenses[0]]; }).filter(Boolean)
  };

  /* Categoria Mais vendidos (15/10): os 12 da vitrine primeiro e depois todas as lentes das armações do ranking de vendas
     (src/lib/best-sellers.ts), na ordem de venda, espalhadas pra não ficar a mesma armação em sequência. A home segue com os 8 primeiros. */
  JR.SHOWCASE.maisVendidosTodos = (() => {
    const topo = JR.SHOWCASE.maisVendidos || [], ja = new Set(topo.map(([s, i, l]) => s + "|" + i + "|" + l));
    const grupos = [];
    RANK.forEach(ps => naoCombo.forEach(p => p.variants.forEach((v, i) => {
      if (JR.REAL_LENS[p.slug][v.name].productSlug !== ps) return;
      const g = v.lenses.map(l => [p.slug, i, l]).filter(x => !ja.has(x.join("|")));
      if (g.length) grupos.push(g);
    })));
    const resto = grupos.flatMap((g, gi) => g.map((x, j) => ({ x, k: (j + .5) / g.length + gi * 1e-3 }))).sort((a, b) => a.k - b.k).map(o => o.x);
    /* 15/10: Minute Preta (4ª mais vendida) sobe pro 5º lugar, logo depois dos 4 do banner, com a lente Preta */
    const mi = JR.bySlug("minute"), mv = mi ? mi.variants.findIndex(v => v.name === "Preta") : -1;
    const mp = mv >= 0 ? ["minute", mv, mi.variants[mv].lenses.includes("Preta") ? "Preta" : mi.variants[mv].lenses[0]] : null;
    const lista = [...topo, ...resto].filter(x => !mp || x.join("|") !== mp.join("|"));
    if (mp) lista.splice(4, 0, mp);
    return semVizinho(lista, 5);
  })();

  /* ---------- Checkout real da Yampi ---------- */
  const STORE_TOKEN = "BDMGAOde7Xbg3YDZxV5e7IJb5rkqTGKHZJ2SaUtU";   // token público, o mesmo do site
  /* UTMs do pedido: igual ao site no ar (src/lib/yampi.ts → attributionParams): URL atual ou o que ficou guardado
     em localStorage jr_attribution (gravado por pixel.js na chegada, 30 dias). */
  const atribuicao = () => {
    try {
      const url = new URLSearchParams(location.search); let st = {};
      const raw = localStorage.getItem("jr_attribution");
      if (raw) { const a = JSON.parse(raw); if (!a.expires_at || new Date(a.expires_at) >= new Date()) st = a; }
      return ["utm_source", "utm_medium", "utm_campaign"].map(k => { const v = url.get(k) || st[k]; return v ? `&${k}=${encodeURIComponent(v)}` : ""; }).join("");
    } catch (e) { return ""; }
  };
  /* Bônus do quiz (27/10): o /quiz guarda o cupom único em localStorage "jr_quiz_cupom" (src/lib/quiz/client.ts).
     Ele aponta pra um brinde da Yampi e só vale em pedido de R$ 297 pra cima (QUIZ_MIN_SUBTOTAL em src/lib/quiz/bonus.ts);
     abaixo disso a Yampi mostra "Cupom inválido", então só vai pro checkout quando o carrinho já libera. */
  JR.QUIZ_MIN = 297;
  JR.quizCupom = () => {
    try { const v = JSON.parse(localStorage.getItem("jr_quiz_cupom") || "null"); return v && /^QUIZ[A-Z0-9]{6}$/.test(v.code) ? v : null; }
    catch (e) { return null; }
  };
  JR.quizLiberado = items => !!JR.quizCupom() && JR.cartTotals(items).subtotal >= JR.QUIZ_MIN;
  /* 27/10: a promoção "Oferta Progressiva - Leve 2 R$297" da Yampi (os R$ 53 com 2+ JROP) recusa QUALQUER cupom, e ela só
     existe no painel (não na API). Testado no checkout real: 2 JROP + RUN10 = "Cupom inválido"; 2 JR (R$ 297, "2X1") + RUN10 =
     R$ 287; 2 JR + 1 JROP + RUN10 = R$ 462. Então um par de JROP vai pro checkout como o par JR (mesmo R$ 297 pro cliente) e o
     resto segue JROP. Com 4+ JROP sobram 2 JROP e a promoção volta a valer (cupom recusado de novo) — liberar cupom na promoção
     do painel resolve de vez. */
  const parJr = items => {
    let falta = items.filter(i => i.op && !i.oe && !JR.isCombo(i.slug) && JR.opOf(i.slug, i.v, i.lens)).reduce((a, i) => a + i.qty, 0) >= 2 ? 2 : 0;
    return items.flatMap(i => {
      if (!falta || !i.op || i.oe || !JR.opOf(i.slug, i.v, i.lens)) return [i];
      const n = Math.min(falta, i.qty); falta -= n;
      return [{ ...i, op: false, qty: n }, ...(i.qty > n ? [{ ...i, qty: i.qty - n }] : [])];
    });
  };
  JR.checkoutUrl = items => {
    const lines = parJr(items).map(i => { const l = JR.realLens(i.slug, i.v, i.lens); return { l: l && versao(l, i.op, i.oe), q: i.qty }; }).filter(x => x.l);
    if (!lines.length) return null;
    const quiz = JR.quizLiberado(items) ? `&promocode=${encodeURIComponent(JR.quizCupom().code)}` : "";
    return `https://${REAL.checkoutDomain}/cart/items?` +
      lines.map(x => `product_option_id%5B%5D=${x.l.id}&quantity%5B%5D=${x.q}`).join("&") +
      `&redirectTo=checkout&skipToCheckout=1&store_token=${STORE_TOKEN}&clearCart=1` + quiz + atribuicao();
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

  /* ---------- Endereços bonitos (16/10) ----------
     No site no ar: /produto/minute-preta?l=Azul, /colecao/radar, /colecao/lente-preta, /faq... (os mesmos endereços do site antigo,
     que anúncios, Google e catálogo da Meta já usam). O Next (next.config.ts) entrega o .html do tema nesses endereços e aqui
     o tema lê o produto/categoria pelo caminho. No localhost (servidor simples) seguem os .html com ?p=…&c=…. */
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const CAT_ALIAS = {"1311": "1311", "radar": "radar", "minute": "minute", "eye-jacket": "eye-jacket", "flak": "flak", "plantaris": "plantaris", "hstn": "hstn", "half-jacket": "half-jacket", "encoder": "encoder", "straight-jacket": "straight-jacket", "casual": "casual", "oferta": "oferta-progressiva", "exclusiva": "oferta-exclusiva", "leve3": "combos", "ellipse": "ellipse", "holbrook": "holbrook", "m-frame": "m-frame", "monster-dog": "monster-dog", "soto": "soto", "sphaera": "sphaera", "sutro": "sutro", "leve2": "compre-1-leve-2", "lancamentos": "lancamentos", "mais-vendidos": "mais-vendidos"};   // cat do tema → slug de coleção do site antigo
  const ALIAS_CAT = Object.fromEntries(Object.entries(CAT_ALIAS).map(([c, s]) => [s, c]));
  const PAGINAS = { "faq.html": "/faq", "sobre.html": "/sobre", "contato.html": "/contato", "trocas-e-devolucoes.html": "/trocas-e-devolucoes",
    "politica-de-privacidade.html": "/politica-de-privacidade", "frete-e-entrega.html": "/frete-e-entrega", "colecao.html": "/colecao" };
  const psDe = (slug, i) => { const p = JR.bySlug(slug), v = p && p.variants[i]; return v && JR.REAL_LENS[slug][v.name] && JR.REAL_LENS[slug][v.name].productSlug; };
  /* Parâmetros da página: os da URL (?p=…) + os que vêm do caminho (/produto/minute-preta-op → p=minute, c=<cor>, op=1). */
  JR.Q = (() => {
    const q = new URLSearchParams(location.search);
    const m = location.pathname.match(/^\/(produto|colecao)\/([^/?#]+)/);
    if (m && m[1] === "produto") {
      let ps = decodeURIComponent(m[2]); const op = /-op$/.test(ps), oe = /-oe$/.test(ps); if (op || oe) ps = ps.slice(0, -3);
      for (const p of JR.PRODUCTS) { const i = p.variants.findIndex((v, k) => psDe(p.slug, k) === ps); if (i >= 0) { q.set("p", p.slug); q.set("c", i); if (op) q.set("op", "1"); if (oe) q.set("oe", "1"); q.set("_ok", "1"); break; } }
      if (!q.get("_ok") && !LOCAL) location.replace("/colecao/compre-1-leve-2");   // produto que saiu do catálogo
    }
    if (m && m[1] === "colecao") {
      const s = decodeURIComponent(m[2]);
      if (/^lente-/.test(s)) q.set("lente", s.slice(6)); else q.set("cat", ALIAS_CAT[s] || s);
    }
    return q;
  })();
  /* href do tema (produto.html?p=…, colecao.html?cat=…) → endereço bonito. Endereço que não reconhece volta igual. */
  JR.bonita = href => {
    if (!href || LOCAL || /^(https?:|mailto:|tel:|#|\/)/.test(href)) return href;
    const [semHash, hash = ""] = href.split("#"), [arq, busca = ""] = semHash.split("?"), q = new URLSearchParams(busca), h = hash ? "#" + hash : "";
    if (arq === "produto.html") {
      const ps = psDe(q.get("p"), +q.get("c") || 0); if (!ps) return href;
      const extra = new URLSearchParams(), pr = JR.bySlug(q.get("p")), c = +q.get("c") || 0;
      /* Eye Jacket e Eye Jacket Redux: várias cores no mesmo produto do site antigo → a cor vai no endereço */
      if (pr.variants.filter((v, k) => psDe(pr.slug, k) === ps).length > 1) extra.set("cor", pr.variants[c].name);
      if (q.get("l")) extra.set("l", q.get("l"));
      return `/produto/${ps}${q.get("oe") === "1" ? "-oe" : q.get("op") === "1" ? "-op" : ""}${extra.toString() ? "?" + extra : ""}${h}`;
    }
    if (arq === "colecao.html") {
      if (q.get("lente")) return `/colecao/lente-${q.get("lente")}${h}`;
      if (q.get("cat")) return `/colecao/${CAT_ALIAS[q.get("cat")] || q.get("cat")}${h}`;
      return "/colecao" + h;
    }
    if (arq === "index.html") return "/" + h;
    return PAGINAS[arq] ? PAGINAS[arq] + (busca ? "?" + busca : "") + h : href;
  };
  if (!LOCAL) {
    const arruma = a => { const h = a.getAttribute("href"), b = JR.bonita(h); if (b !== h) a.setAttribute("href", b); };
    const varre = root => { if (root.matches && root.matches("a[href]")) arruma(root); root.querySelectorAll && root.querySelectorAll("a[href]").forEach(arruma); };
    new MutationObserver(ms => ms.forEach(m => m.type === "attributes" ? arruma(m.target) : m.addedNodes.forEach(varre)))
      .observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["href"] });
    document.addEventListener("DOMContentLoaded", () => varre(document));
    /* Link antigo /tema/produto.html?p=… aberto direto: a barra de endereço passa a mostrar o endereço bonito */
    if (/^\/tema\//.test(location.pathname)) { const arq = location.pathname.slice(6) || "index.html", b = JR.bonita(arq + location.search + location.hash);
      if (b !== arq + location.search + location.hash) history.replaceState(history.state, "", b); }
  }
})();
