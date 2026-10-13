/* Dados do protótipo — fonte: 02-produtos/catalogo.md (verificado em 06/out/2026).
   Preço do tema do sócio (D1): 1 óculos R$ 175 · 2 óculos R$ 297. Desde 12/10 o protótipo usa o preço do site no ar,
   definido em catalogo-real.js (R$ 297, Leve 2 pelo preço de 1; combos 3 por R$ 327). */
window.JR = window.JR || {};

JR.PRICE = { one: 175, pair: 297, freeShipping: 200, installments: 6 };

/* Política oficial: fonte .agents/rules/product-catalog-rules.md (prazo do FAQ). Todo texto de prazo/troca lê daqui. */
JR.POLICY = {
  delivery: "Capitais em 3–5 dias úteis · interior em até 10 dias úteis",
  deliveryLong: "O prazo de entrega varia de acordo com a sua localização: capitais recebem em 3 a 5 dias úteis e interior em até 10 dias úteis após a confirmação do pagamento.",
  exchangeDays: 7
};

/* Contato oficial (fonte: site atual — páginas /contato e /trocas-e-devolucoes, commit d69dbce). */
JR.CONTACT = {
  whatsapp: "5511989072335", phone: "(11) 98907-2335", hours: "Seg–Sáb, 9h às 18h",
  email: "suportejustrunner@gmail.com", cnpj: "62.880.024/0001-30", instagram: "justrunner.br1",
  payments: ["Cartão de crédito", "Pix", "Boleto"],   // checkout Yampi (FAQ do site)
  open: { days: [1, 2, 3, 4, 5, 6], from: 9, to: 18, tz: "America/Sao_Paulo" }   // mesmo horário de "hours"
};
JR.waLink = (msg = "") => `https://wa.me/${JR.CONTACT.whatsapp}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

/* Ficha técnica por modelo. Vazio = campo não exibido. Preencher com dados do fornecedor.
   Campos: peso (g), largura total (mm), altura da lente (mm), haste (mm), material da armação. */
JR.SPECS = {
  // "radar-ev": { peso: null, largura: null, alturaLente: null, haste: null, armacao: null }
};

/* ============ FOTOS (tema) ============
   Enquanto um campo estiver vazio, o site mostra a ilustração. Ao cadastrar a foto, ela entra no lugar
   sem mudar layout. No site real: tabela `images` (produto) e um bucket/config para as fotos de página.

   JR.PHOTOS: fotos do produto por cor de armação (nome igual ao da variação). "*" = vale para todas as cores.
   A 1ª foto é a capa do card e da PDP. Recomendado: quadrada 1:1, fundo claro, ≥ 1200 px, .webp/.jpg.
     "radar-ev": { "Preta": [{ src: "fotos/radar-ev-preta-1.webp", alt: "Radar EV Preta de frente" }, ...], "*": [...] } */
JR.PHOTOS = {};
JR.photos = (slug, color) => { const p = JR.PHOTOS[slug] || {}; return [...(p[color] || []), ...(p["*"] || [])].map(x => typeof x === "string" ? { src: x, alt: "" } : x); };

/* JR.SITE_IMAGES: fotos de campanha/lifestyle por espaço da página (lista completa em TEMA-INSTALACAO.md).
     "home-hero": { src: "fotos/home-hero.webp", alt: "Corredora ao pôr do sol com Radar EV" } */
JR.SITE_IMAGES = {};

/* ============ AVALIAÇÕES (inseridas pela Just Runner) ============
   Só depoimentos reais, com autorização do cliente. Nunca preencher com exemplo.
   Média, contagem, distribuição e notas por atributo são CALCULADAS a partir da lista.
   Formato:
   { id: "r001", slug: "radar-ev",                 // modelo avaliado (mesmo slug do produto)
     nome: "Ana P.", cidade: "Campinas, SP",       // mostrar só inicial do sobrenome
     data: "2026-09-12", nota: 5,                  // 1 a 5
     titulo: "Não escorrega", texto: "...",
     variacao: "Preta · Lente Prizm",              // opcional: o que a pessoa comprou
     fotos: ["fotos/avaliacoes/r001-1.webp"],      // opcional (verticais ou quadradas)
     verificada: true,                             // true só se a compra foi confirmada no admin
     atributos: { conforto: 5, encaixe: 5, lente: 4, custo: 5 },   // opcional, 1 a 5
     util: 0 }                                     // opcional: contador inicial de "útil" */
JR.REVIEWS = [];

/* Paleta das lentes (aproximação visual dos nomes usados no site). */
JR.LENS = {
  "Preta":      ["#3a4049", "#15181d", "#050608"],
  "Espelhada":  ["#f4f7fb", "#9aa6b6", "#2f3744"],
  "Azul":       ["#7fd6ff", "#1f5fe0", "#0a1a55"],
  "Sapphire":   ["#8ee8ff", "#2a6cf0", "#12176b"],
  "Tanzanite":  ["#cdbbff", "#6a52e0", "#21175a"],
  "Roxa":       ["#e8a6ff", "#8a35d6", "#2a0b4d"],
  "Ruby":       ["#ffe06a", "#ff5b26", "#9e0f2e"],
  "Dark Ruby":  ["#ff9a52", "#b51f2f", "#350812"],
  "Prizm":      ["#fff07a", "#ff6a3a", "#c0186a"],
  "Torch":      ["#ffe9a0", "#ff8a1a", "#a8380a"],
  "Gold":       ["#fff4b0", "#f0b52e", "#7a4e0e"],
  "Gold Café":  ["#f9dc98", "#b47c36", "#4a2a10"],
  "Dourada":    ["#ffeeb0", "#dba52c", "#5e3f0c"],
  "Low Light":  ["#fff7d2", "#ffd078", "#f08e7e"],
  "Marrom":     ["#9a6a46", "#55321c", "#1e120a"],
  "Rosa":       ["#ffe0ec", "#ff86b0", "#a12f5c"],
  "VR28":       ["#d8b48a", "#83563a", "#33201a"],
  "VR29":       ["#e4ab68", "#93501f", "#3a1d0b"],
  "Degrade":    ["#9aa3ad", "#3a4049", "#0b0d10"],
  "Único":      ["#3a4049", "#15181d", "#050608"],
  "Cooper":     ["#ffd9a0", "#c77a3a", "#4a2410"],
  "Full Black": ["#2a2e35", "#0d0f12", "#000"],
  "Silver":     ["#f4f7fb", "#9aa6b6", "#2f3744"]
};

/* Cores de armação. */
JR.FRAME = {
  "Preta": "#16181c", "Bronze": "#6e4b2c", "Cooper": "#b06c3c", "Laranja": "#ff6a1a",
  "Piet": "#eceff2", "Verde": "#2f7a3e", "Azul": "#1f4ea6", "Branca": "#f1f3f5",
  "Cinza": "#6c727b", "Cristal": "#c8d3dd", "Azul Escuro": "#18264f", "Matte Bone": "#d8cfbd",
  "Podpah": "#111214", "Preta Haste Transparente": "#16181c", "Stonewash": "#7c8a9a",
  "Brain Dead": "#1a1b1e", "Flame": "#2a1a14", "Bege": "#cdb995", "Padrão": "#16181c",
  "Full Black": "#0e0f11", "Silver": "#b9c0c8"
};

/* Formato da armação para a ilustração SVG: shield (lente única) · dual (duas lentes esportivas) · wrap (lifestyle). */
const P = (slug, name, line, shape, style, variants, extra = {}) =>
  ({ slug, name, line, shape, style, variants, ...extra });
const V = (name, lenses, frame) => ({ name, lenses, frame: frame || JR.FRAME[name] || "#16181c" });

JR.PRODUCTS = [
  P("radar-ev", "Radar EV", "Radar", "shield", "performance", [
    V("Preta", ["Azul", "Dark Ruby", "Espelhada", "Preta", "Roxa", "Ruby", "Sapphire", "Tanzanite"]),
    V("Bronze", ["VR28", "VR29"]),
    V("Cooper", ["Gold", "Preta", "VR28"]),
    V("Laranja", ["Espelhada", "Preta", "Ruby"]),
    V("Piet", ["Espelhada", "Gold Café", "Preta", "Torch"])
  ], { interchangeable: true }),
  P("flak", "Flak", "Flak", "dual", "performance", [
    V("Preta", ["Espelhada", "Preta", "Prizm", "Ruby", "Tanzanite"]),
    V("Branca", ["Espelhada", "Prizm", "Tanzanite"])
  ]),
  P("plantaris", "Plantaris", "Plantaris", "wrap", "sportstyle", [
    V("Cinza", ["Azul", "Gold", "Preta", "Ruby", "VR28"]),
    V("Preta", ["Único"]),
    V("Matte Bone", ["Dourada"]),
    V("Stonewash", ["Único"]),
    V("Azul Escuro", ["Único"]),
    V("Verde", ["Único"]),
    V("Podpah", ["Único"]),
    V("Preta Haste Transparente", ["Único"])
  ]),
  P("minute", "Minute", "Minute", "shield", "everyday", [
    V("Preta", ["Azul", "Dark Ruby", "Espelhada", "Gold", "Ruby", "Tanzanite", "VR28", "Preta"]),
    V("Branca", ["Dark Ruby", "Low Light", "Preta", "Ruby"]),
    V("Azul", ["Espelhada", "Preta", "Torch"]),
    V("Cinza", ["Dark Ruby", "Espelhada", "Preta"]),
    V("Cooper", ["Gold", "Ruby", "VR28"]),
    V("Cristal", ["Único"])
  ]),
  P("hstn", "HSTN", "HSTN", "dual", "everyday", [
    V("Preta", ["Azul", "Dark Ruby", "Espelhada", "Gold", "Preta", "Roxa", "Ruby", "Tanzanite"]),
    V("Cinza", ["Espelhada", "Gold Café", "Gold", "Roxa", "Ruby"]),
    V("Cooper", ["Gold"])
  ]),
  P("eye-jacket", "Eye Jacket", "Eye Jacket", "wrap", "sportstyle", [
    V("Cinza", ["Azul", "Dark Ruby", "Espelhada", "Gold", "Preta", "Ruby", "VR28"]),
    V("Laranja", ["Espelhada", "Ruby"]),
    V("Preta", ["Tanzanite"])
  ]),
  P("dartboard", "Dartboard", "Casual", "wrap", "everyday", [
    V("Padrão", ["Degrade", "Preta", "Rosa", "VR28"])
  ]),
  P("encoder", "Encoder", "Encoder", "shield", "performance", [
    V("Padrão", ["Preta", "Cooper"])
  ]),
  P("straight-jacket", "Straight Jacket", "Straight Jacket", "dual", "performance", [
    V("Cinza", ["Azul", "Preta", "Ruby", "Tanzanite", "VR28"]),
    V("Cooper", ["Preta", "Tanzanite", "VR28"])
  ]),
  P("half-jacket", "Half Jacket", "Half Jacket", "dual", "performance", [
    V("Padrão", ["Cooper", "Full Black", "Silver"])
  ]),
  P("eye-jacket-redux", "Eye Jacket Redux", "Eye Jacket", "wrap", "sportstyle", [
    V("Preta", ["Azul", "Gold", "Rosa", "Tanzanite", "VR28", "Preta"]),
    V("Cinza", ["Azul", "Espelhada", "Gold", "Marrom", "Preta", "Tanzanite"]),
    V("Branca", ["Preta", "Tanzanite"]),
    V("Bege", ["Gold", "Ruby"]),
    V("Verde", ["Único"])
  ])
];

JR.bySlug = slug => JR.PRODUCTS.find(p => p.slug === slug);

/* Lentes oficiais (nomes do site). Opções fora desta lista são variações do produto, não lentes. */
JR.OFFICIAL_LENSES = ["Azul", "Dark Ruby", "Dourada", "Espelhada", "Gold", "Gold Café", "Low Light", "Marrom", "Preta",
  "Prizm", "Rosa", "Roxa", "Ruby", "Sapphire", "Tanzanite", "Torch", "VR28", "VR29"];
JR.isLens = l => JR.OFFICIAL_LENSES.includes(l);
/* Rótulo para o cliente: "Lente Azul", "Variação Cooper" ou nada para modelo único. */
JR.optLabel = l => l === "Único" ? "" : (JR.isLens(l) ? `Lente ${l}` : `Variação ${l}`);

/* Vitrines da home (cor e lente de destaque em cada card). */
JR.SHOWCASE = {
  offer:    [["radar-ev", 0, "Preta"], ["plantaris", 0, "Preta"], ["flak", 0, "Preta"], ["minute", 0, "Preta"]],
  /* Grade "Escolha seu modelo": todos os modelos, com a lente de destaque. Ordem = curadoria (sem dado de vendas). */
  all: [["radar-ev", 0, "Espelhada"], ["flak", 0, "Prizm"], ["minute", 1, "Low Light"], ["plantaris", 0, "Ruby"],
        ["hstn", 0, "Tanzanite"], ["eye-jacket", 0, "Gold"], ["straight-jacket", 0, "Azul"], ["encoder", 0, "Preta"],
        ["half-jacket", 0, "Silver"], ["dartboard", 0, "VR28"], ["eye-jacket-redux", 0, "Rosa"]]
};

/* Guia de lentes (proposta de copy; validar a classificação das lentes antes de publicar). */
JR.LENS_GUIDE = [
  { key: "sol", title: "Sol forte", text: "Lentes escuras ou espelhadas", lenses: ["Preta", "Espelhada", "Sapphire", "Tanzanite"],
    detail: "Treino de 10h no asfalto: lente escura ou espelhada corta o reflexo e você não força os olhos." },
  { key: "nublado", title: "Dias nublados", text: "Lentes mais claras", lenses: ["Low Light", "Rosa", "Gold"],
    detail: "Céu fechado pede lente clara: mais contraste no chão sem escurecer a pista." },
  { key: "amanhecer", title: "Amanhecer / entardecer", text: "Maior entrada de luz", lenses: ["Low Light", "VR28", "Torch"],
    detail: "Largada às 5h40 ou longão no fim da tarde: lente que deixa entrar mais luz e mantém o contorno do terreno." },
  { key: "versatil", title: "Versátil", text: "Do treino ao dia a dia", lenses: ["Prizm", "Ruby", "Dark Ruby", "VR29"],
    detail: "Uma lente para o treino da manhã e o resto do dia. Todas as lentes são polarizadas com proteção UV400." }
];
