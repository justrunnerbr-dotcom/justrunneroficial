/* Guia de rostos (sócio, v10 12/10/2026) na PDP do protótipo. */
(function () {

// ===== Dados: reorganize aqui =====
// faces: os 3 formatos ideais do modelo (mapeamento do usuário, 12/out/2026).
// url: só modelos com link verificado no catálogo entram como sugestão em "Outra opção".
const MODELS = {
  "radar-ev":          { name: "Radar EV",          url: "/produto/radar-ev-preta",        faces: ["oval", "redondo", "triangular"] },
  "flak":              { name: "Flak",              url: "/produto/flak-preta",            faces: ["oval", "redondo", "quadrado"] },
  "half-jacket":       { name: "Half Jacket",       url: "/produto/half-jacket",           faces: ["oval", "quadrado", "diamante"] },
  "encoder":           { name: "Encoder",           url: "/produto/encoder",               faces: ["oval", "redondo", "triangular"] },
  "m-frame":           { name: "M Frame",           url: null,                             faces: ["oval", "redondo", "triangular"] },
  "sphaera":           { name: "Sphaera",           url: null,                             faces: ["oval", "redondo", "triangular"] },
  "sutro":             { name: "Sutro",             url: null,                             faces: ["redondo", "oval", "retangular"] },
  "m1311":             { name: "1311",              url: null,                             faces: ["oval", "redondo", "triangular"] },
  "dartboard":         { name: "Dartboard",         url: "/produto/dartboard",             faces: ["oval", "quadrado", "diamante"] },
  "ellipse":           { name: "Ellipse",           url: null,                             faces: ["oval", "redondo", "triangular"] },
  "minute":            { name: "Minute",            url: "/produto/minute-preta",          faces: ["quadrado", "oval", "diamante"] },
  "eye-jacket":        { name: "Eye Jacket",        url: "/produto/eye-jacket",            faces: ["quadrado", "oval", "diamante"] },
  "eye-jacket-redux":  { name: "Eye Jacket Redux",  url: "/produto/eye-jacket-redux",      faces: ["quadrado", "oval", "diamante"] },
  "plantaris":         { name: "Plantaris",         url: "/produto/plantaris-preta",       faces: ["quadrado", "oval", "diamante"] },
  "plantaris-squared": { name: "Plantaris Squared", url: null,                             faces: ["redondo", "oval", "triangular"] },
  "hstn":              { name: "HSTN",              url: "/produto/hstn-preta",            faces: ["quadrado", "retangular", "diamante"] },
  "straight-jacket":   { name: "Straight Jacket",   url: "/produto/straight-jacket-cinza", faces: ["quadrado", "oval", "diamante"] },
  "holbrook":          { name: "Holbrook",          url: null,                             faces: ["redondo", "oval", "retangular"] },
  "monster-dog":       { name: "Monster Dog",       url: null,                             faces: ["redondo", "oval", "triangular"] },
  "soto":              { name: "Soto",              url: null,                             faces: ["redondo", "oval", "triangular"] },
};

// Ordem de preferência para sugerir outro modelo (os mais vendidos primeiro).
const SUGGEST = ["radar-ev", "flak", "minute", "eye-jacket", "plantaris", "hstn", "half-jacket", "encoder", "eye-jacket-redux", "straight-jacket", "dartboard"];

// why: por que o formato valoriza · foto em rostos/<id>.jpg (se faltar, aparece a forma geométrica)
const FACES = [
  { id: "oval",       name: "Oval",       why: "Formato versátil: quase todo modelo fica bem.",
    geo: '<ellipse cx="100" cy="80" rx="38" ry="54"/>' },
  { id: "redondo",    name: "Redondo",    why: "Linhas marcadas criam contraste com as curvas do rosto.",
    geo: '<circle cx="100" cy="80" r="48"/>' },
  { id: "quadrado",   name: "Quadrado",   why: "Equilibra a mandíbula marcada e os ângulos do rosto.",
    geo: '<rect x="56" y="36" width="88" height="88" rx="8"/>' },
  { id: "retangular", name: "Retangular", why: "Quebra o comprimento e dá proporção ao rosto.",
    geo: '<rect x="64" y="24" width="72" height="112" rx="8"/>' },
  { id: "triangular", name: "Triangular", why: "Dá presença à parte de cima e equilibra a mandíbula larga.",
    geo: '<path d="M84 30 H116 L142 130 H58 Z"/>' },
  { id: "diamante",   name: "Diamante",   why: "Acompanha as maçãs do rosto e suaviza testa e queixo estreitos.",
    geo: '<path d="M100 24 L142 80 L100 136 L58 80 Z"/>' },
];

// Modelo que já existe no protótipo abre a página do protótipo; os outros, a loja.
const STORE = "https://justrunner.com.br";
const BASE = "guia-rostos/";
const idOf = m => Object.keys(MODELS).find(k => MODELS[k] === m);
const linkOf = (id, m) => (window.JR && JR.bySlug && JR.bySlug(id)) ? `produto.html?p=${id}` : STORE + m.url;
const FACE_NAME = Object.fromEntries(FACES.map(f => [f.id, f.name]));
const ICON_FIRE = `<svg class="jr-fire" viewBox="0 0 24 24" aria-hidden="true">
  <defs><linearGradient id="jr-fire-g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d00"/><stop offset=".55" stop-color="#ff8a00"/><stop offset="1" stop-color="#ffd23f"/></linearGradient></defs>
  <path fill="url(#jr-fire-g)" d="M12 2c.6 3.2-1.2 5-2.6 6.6C8 10.2 6.5 12 6.5 14.8 6.5 18.5 9 21.5 12 21.5s5.5-2.9 5.5-6.6c0-2.6-1.3-4.3-2.3-5.4-.2 1.6-1 2.6-2 3 .5-3.6-.3-7.4-1.2-10.5z"/>
  <path fill="#ffe27a" d="M12 21.5c-1.7 0-3-1.5-3-3.4 0-1.9 1.4-3 2.2-4 .2 1.2.9 1.9 1.7 2.2.2-.9.1-1.8-.1-2.6 1.2.9 2.2 2.3 2.2 4.4 0 1.9-1.3 3.4-3 3.4z"/>
</svg>`;

// ===== Veredito de um modelo para um rosto =====
function verdict(modelId, f) {
  if (MODELS[modelId].faces.includes(f.id)) return { kind: "ideal", label: "Ideal", text: f.why };
  const alt = MODELS[SUGGEST.find(id => id !== modelId && MODELS[id].faces.includes(f.id))];
  return { kind: "outra", label: "Outra opção",
    text: `Funciona, mas o <a href="${linkOf(idOf(alt), alt)}">${alt.name}</a> valoriza mais este rosto.` };
}

// ===== Lista recolhida: óculos indicados para o formato =====
function listHTML(f, modelId) {
  const ids = Object.keys(MODELS).filter(id => MODELS[id].faces.includes(f.id));
  const items = ids.map(id => {
    const m = MODELS[id], cur = id === modelId;
    const name = m.url && !cur ? `<a href="${linkOf(id, m)}">${m.name}</a>` : `<b>${m.name}${cur ? " · este" : ""}</b>`;
    const faces = m.faces.map(x => x === f.id ? `<i>${FACE_NAME[x]}</i>` : FACE_NAME[x]).join(" · ");
    const img = m.img ? `<img src="${BASE + m.img}" alt="" loading="lazy">` : `<span class="no-img"></span>`;
    return `<li class="${cur ? "is-current" : ""}">${img}${name}<small>${faces}</small></li>`;
  }).join("");
  return `
    <details class="jr-list">
      <summary>Ver óculos <span>${ids.length} modelos</span></summary>
      <ul>${items}</ul>
    </details>`;
}

// ===== Montagem =====
const section = document.getElementById("guia-de-rostos");
const grid = document.getElementById("jr-grid");
const setH = () => grid.querySelectorAll(".jr-face__media").forEach(m => m.style.setProperty("--h", m.clientHeight + "px"));
addEventListener("resize", setH);
window.setH = setH;

function render(modelId) {
  const m = MODELS[modelId];
  document.getElementById("jr-model-name").textContent = m.name;
  const photo = document.getElementById("jr-product");
  if (m.img) { photo.src = BASE + m.img; photo.alt = m.name; } else photo.removeAttribute("src");
  document.getElementById("jr-ideal").innerHTML = `<span>Ideal para</span>` + m.faces.map(id => `<b>${ICON_FIRE}${FACE_NAME[id]}</b>`).join("");
  grid.innerHTML = FACES.map(f => {
    const v = verdict(modelId, f);
    return `
    <article class="jr-face is-${v.kind}" data-face="${f.id}">
      <div class="jr-face__media">
        <svg class="geo" viewBox="0 0 200 160" aria-hidden="true">${f.geo}</svg>
        <img src="${BASE}rostos/${f.id}.jpg" alt="Pessoas com rosto ${f.name.toLowerCase()}" loading="lazy"
          onload="this.parentNode.classList.add('has-img'); setH()" onerror="this.remove()">
        <span class="jr-tag">${v.kind === "ideal" ? ICON_FIRE : ""}${v.label}</span>
        <span class="jr-scan" aria-hidden="true"></span>
      </div>
      <div class="jr-face__body">
        <h3 class="jr-face__name">${f.name}</h3>
        <p class="jr-face__text">${v.text}</p>
        ${listHTML(f, modelId)}
      </div>
    </article>`;
  }).join("");
  setH();
}

// Abre/fecha o guia pela barra "Para quais rostos… é ideal?".
const reveal = document.getElementById("jr-reveal"), body = document.getElementById("jr-body");
reveal.addEventListener("click", () => {
  const open = reveal.getAttribute("aria-expanded") !== "true";
  reveal.setAttribute("aria-expanded", open);
  if (open) { body.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => { body.classList.add("is-open"); setH(); })); }
  else { body.classList.remove("is-open"); setTimeout(() => { if (reveal.getAttribute("aria-expanded") !== "true") body.hidden = true; }, 550); }
});

// Scan começa quando a seção entra na tela.
new IntersectionObserver((entries, io) => {
  if (entries[0].isIntersecting) { section.classList.add("is-in"); io.disconnect(); }
}, { threshold: .2 }).observe(section);

// Modelo da página (?p=slug). Sem família no guia, a seção some.
const pageModel = new URLSearchParams(location.search).get("p") || "radar-ev";
fetch(BASE + "oculos.json").then(r => r.ok ? r.json() : {}).catch(() => ({})).then(data => {
  for (const [id, d] of Object.entries(data)) if (MODELS[id]) Object.assign(MODELS[id], d);
  if (MODELS[pageModel]) render(pageModel); else section.remove();
});
})();
