/* Avaliações da PDP — interface estilo marketplace, alimentada só por JR.REVIEWS (inserido pela Just Runner).
   Tudo que é número (média, contagem, distribuição, atributos, % 4–5 estrelas) é calculado da lista.
   Protótipo: ?demo=avaliacoes carrega assets/reviews-demo.js (exemplos fictícios, marcados, nunca publicar). */
(function () {
  const { $, $$, icon } = JR;
  const root = $("#avaliacoes");
  if (!root || !JR.currentProduct) return;
  const product = JR.currentProduct;
  /* 12/10: no protótipo os exemplos aparecem sempre (pedido do usuário pra ver o layout cheio); ?demo=off mostra o
     estado real. Continuam marcados como fictícios e NUNCA vão pro site: lá entram só depoimentos reais (JR.REVIEWS). */
  /* Exemplos só no computador (localhost). Publicado: só avaliações reais (JR.REVIEWS). */
  const demo = JR.LOCAL && new URLSearchParams(location.search).get("demo") !== "off";

  const ATTR = [["conforto", "Conforto", "feather"], ["encaixe", "Encaixe", "grip"], ["lente", "Lente", "lens"], ["custo", "Custo-benefício", "card"]];
  const PAGE = 5;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = n => n.toFixed(1).replace(".", ",");
  const stars = (v, cls = "") => `<span class="stars ${cls}" style="--v:${Math.max(0, Math.min(5, v)) / 5}" role="img" aria-label="Nota ${num(v)} de 5"></span>`;
  const date = d => { const x = new Date(d + "T12:00:00"); return isNaN(x) ? "" : x.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }); };
  const initials = n => esc(n).trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const tone = n => [...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 5;
  let voted = {};
  try { voted = JSON.parse(localStorage.getItem("jr-util") || "{}"); } catch {}

  function start() {
    const all = (demo ? JR.REVIEWS_DEMO : JR.REVIEWS) || [];
    const own = all.filter(r => r.slug === product.slug);
    const fromStore = !own.length && all.length > 0;      // modelo sem avaliação: mostra as da loja, identificadas
    const list = own.length ? own : all;
    if (!list.length) return empty();
    render(list, fromStore);
  }

  /* ---------- Estado vazio (antes de inserir as avaliações) ---------- */
  function empty() {
    root.innerHTML = `
      <div class="rvs-head"><div><span class="kicker">Avaliações</span><h2 class="display h-md" id="rv-title">Opiniões de quem usa</h2></div></div>
      <div class="rvs-empty">
        <div class="rvs-empty-score">${stars(0, "lg")}<strong>Ainda sem avaliações</strong><span>Os depoimentos de clientes aparecem aqui assim que forem publicados.</span></div>
        <div class="rvs-empty-cta">
          <a class="btn btn-dark" href="${JR.waLink(`Olá! Comprei o ${product.name} e quero deixar minha avaliação.`)}" target="_blank" rel="noopener">${icon.chat} Comprou? Conte como foi</a>
          <a class="btn btn-outline-dark" href="https://instagram.com/${JR.CONTACT.instagram}" target="_blank" rel="noopener">${icon.insta} Marque @${JR.CONTACT.instagram}</a>
        </div>
        ${JR.LOCAL ? `<a class="rvs-demo-link proto-only" href="${demoUrl(true)}#avaliacoes">Protótipo: ver o layout com exemplos fictícios →</a>` : ""}
      </div>`;
  }

  function demoUrl(on) { const u = new URL(location.href); on ? u.searchParams.delete("demo") : u.searchParams.set("demo", "off"); u.hash = ""; return u.pathname + u.search; }

  /* ---------- Seção completa ---------- */
  function render(list, fromStore) {
    const n = list.length;
    const avg = list.reduce((a, r) => a + r.nota, 0) / n;
    const dist = [5, 4, 3, 2, 1].map(s => [s, list.filter(r => r.nota === s).length]);
    const good = Math.round(list.filter(r => r.nota >= 4).length / n * 100);
    const attrs = ATTR.map(([k, t, i]) => { const v = list.filter(r => r.atributos && r.atributos[k]); return [k, t, i, v.length ? v.reduce((a, r) => a + r.atributos[k], 0) / v.length : null]; }).filter(a => a[3] !== null);
    const photos = list.flatMap(r => (r.fotos || []).map(src => ({ src, r })));
    const withPhotos = list.filter(r => (r.fotos || []).length).length;
    let filter = "all", sort = "recentes", shown = PAGE;

    /* nota ao lado do título da PDP */
    const pr = $("#p-rating");
    if (pr && !fromStore) { pr.hidden = false; pr.innerHTML = `${stars(avg)}<b>${num(avg)}</b><span>(${n} ${n > 1 ? "avaliações" : "avaliação"})</span>`; }

    root.innerHTML = `
      ${demo ? `<p class="rvs-demo-tag proto-only">Protótipo · avaliações de exemplo, não publicar</p>` : ""}
      <div class="rvs-head"><div><span class="kicker">Avaliações</span><h2 class="display h-md" id="rv-title">Opiniões de quem usa</h2>
        ${fromStore ? `<p class="sub">Ainda sem avaliações do ${esc(product.name)}. Veja o que dizem sobre outros modelos Just Runner.</p>` : ""}</div></div>
      <div class="rvs-grid">
        <aside class="rvs-sum">
          <div class="rvs-score"><strong>${num(avg)}</strong><div>${stars(avg, "lg")}<span>${n} ${n > 1 ? "avaliações" : "avaliação"}</span></div></div>
          <div class="rvs-dist" role="list">${dist.map(([s, c]) => `
            <button class="rvs-bar" role="listitem" data-f="${s}" ${c ? "" : "disabled"} aria-label="Ver avaliações de ${s} estrelas (${c})">
              <span>${s} ${icon.star}</span><i><u style="--w:${c / n}"></u></i><small>${c}</small></button>`).join("")}
          </div>
          <p class="rvs-good">${icon.check}<span><b>${good}%</b> deram 4 ou 5 estrelas</span></p>
          ${attrs.length ? `<div class="rvs-attrs"><h3>Avaliação por característica</h3>${attrs.map(([k, t, i, v]) => `
            <div class="rvs-attr"><span class="rvs-attr-ico">${icon[i]}</span><span class="rvs-attr-t">${t}</span>${stars(v, "sm")}<b>${num(v)}</b></div>`).join("")}</div>` : ""}
          <a class="btn btn-outline-dark btn-block rvs-write" href="${JR.waLink(`Olá! Comprei o ${product.name} e quero deixar minha avaliação.`)}" target="_blank" rel="noopener">${icon.chat} Avaliar este produto</a>
        </aside>
        <div class="rvs-main">
          ${photos.length ? `<div class="rvs-photos"><h3>${icon.insta} Fotos de clientes <small>${photos.length}</small></h3>
            <div class="rvs-photo-row">${photos.slice(0, 6).map((p, i) => `<button class="rvs-ph" data-ph="${i}" aria-label="Abrir foto ${i + 1} de ${photos.length}"><img src="${esc(p.src)}" alt="" loading="lazy" decoding="async">${i === 5 && photos.length > 6 ? `<span>+${photos.length - 6}</span>` : ""}</button>`).join("")}</div></div>` : ""}
          <div class="rvs-tools">
            <div class="chips rvs-chips" id="rv-chips"></div>
            <label class="sort">Ordenar <select id="rv-sort"><option value="recentes">Mais recentes</option><option value="fotos">Com fotos primeiro</option><option value="maior">Maior nota</option><option value="menor">Menor nota</option><option value="uteis">Mais úteis</option></select></label>
          </div>
          <p class="rvs-count" id="rv-count" aria-live="polite"></p>
          <div class="rvs-list" id="rv-list"></div>
          <button class="btn btn-outline-dark rvs-more" id="rv-more" hidden></button>
        </div>
      </div>
      <dialog class="rv-lb" id="rv-lb" aria-label="Foto de cliente"></dialog>`;

    const util = r => (r.util || 0) + (voted[r.id] ? 1 : 0);
    const visible = () => {
      let v = list.filter(r => filter === "all" ? true : filter === "photos" ? (r.fotos || []).length : r.nota === +filter);
      const by = { recentes: (a, b) => (b.data || "").localeCompare(a.data || ""), fotos: (a, b) => (b.fotos || []).length - (a.fotos || []).length || (b.data || "").localeCompare(a.data || ""),
        maior: (a, b) => b.nota - a.nota, menor: (a, b) => a.nota - b.nota, uteis: (a, b) => util(b) - util(a) };
      return [...v].sort(by[sort]);
    };
    const card = r => {
      const long = (r.texto || "").length > 320;
      const other = r.slug !== product.slug ? JR.bySlug(r.slug) : null;
      return `<article class="rv-card">
        <header>
          <span class="rv-av t${tone(r.nome || "")}" aria-hidden="true">${initials(r.nome || "?")}</span>
          <div><b>${esc(r.nome)}</b>${r.cidade ? `<span>${esc(r.cidade)}</span>` : ""}</div>
          ${r.verificada ? `<span class="rv-ver">${icon.shield}Compra verificada</span>` : ""}
        </header>
        <div class="rv-line">${stars(r.nota)}${r.titulo ? `<strong>${esc(r.titulo)}</strong>` : ""}</div>
        <div class="rv-meta">${r.data ? `<time datetime="${esc(r.data)}">${date(r.data)}</time>` : ""}${other ? `<a href="produto.html?p=${other.slug}">${esc(other.name)}</a>` : ""}${r.variacao ? `<span>${esc(r.variacao)}</span>` : ""}</div>
        <p class="rv-text ${long ? "clamp" : ""}">${esc(r.texto)}</p>${long ? `<button class="rv-readmore">Ler mais</button>` : ""}
        ${(r.fotos || []).length ? `<div class="rv-fotos">${r.fotos.map(src => `<button class="rvs-ph" data-src="${esc(src)}" aria-label="Ampliar foto de ${esc(r.nome)}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></button>`).join("")}</div>` : ""}
        <footer><button class="rv-util ${voted[r.id] ? "on" : ""}" data-util="${esc(r.id)}" aria-pressed="${!!voted[r.id]}">${icon.like}Útil${util(r) ? ` <span>(${util(r)})</span>` : ""}</button></footer>
      </article>`;
    };
    const draw = (reset) => {
      const v = visible();
      if (reset) shown = PAGE;
      $("#rv-chips").innerHTML = [["all", `Todas (${n})`], ...(withPhotos ? [["photos", `${icon.insta}Com fotos (${withPhotos})`]] : []), ...dist.filter(([, c]) => c).map(([s, c]) => [String(s), `${s} ${icon.star} (${c})`])]
        .map(([k, t]) => `<button class="${k === filter ? "on" : ""}" aria-pressed="${k === filter}" data-f="${k}">${t}</button>`).join("");
      $$(".rvs-bar", root).forEach(b => b.classList.toggle("on", b.dataset.f === filter));
      $("#rv-count").textContent = filter === "all" ? "" : `${v.length} ${v.length === 1 ? "avaliação" : "avaliações"} neste filtro`;
      const lst = $("#rv-list");
      lst.innerHTML = v.slice(0, shown).map(card).join("");
      lst.classList.remove("swap"); void lst.offsetWidth; lst.classList.add("swap");
      const more = $("#rv-more"), rest = v.length - shown;
      more.hidden = rest <= 0;
      more.textContent = `Ver mais avaliações (${rest})`;
    };
    const setFilter = f => { filter = filter === f && f !== "all" ? "all" : f; draw(true); };
    root.addEventListener("click", e => {
      const f = e.target.closest("[data-f]"); if (f) return setFilter(f.dataset.f);
      const u = e.target.closest("[data-util]");
      if (u) {
        const id = u.dataset.util; voted[id] ? delete voted[id] : voted[id] = 1;
        try { localStorage.setItem("jr-util", JSON.stringify(voted)); } catch {}
        const r = list.find(x => x.id === id);
        u.classList.toggle("on", !!voted[id]); u.setAttribute("aria-pressed", !!voted[id]);
        u.innerHTML = `${icon.like}Útil${util(r) ? ` <span>(${util(r)})</span>` : ""}`;
        return;
      }
      const rm = e.target.closest(".rv-readmore");
      if (rm) { const t = rm.previousElementSibling; t.classList.toggle("clamp"); rm.textContent = t.classList.contains("clamp") ? "Ler mais" : "Ler menos"; return; }
      const ph = e.target.closest(".rvs-ph");
      if (ph) return openLb(ph.dataset.ph != null ? +ph.dataset.ph : photos.findIndex(p => p.src === ph.dataset.src));
      if (e.target.closest("#rv-more")) { shown += PAGE; draw(); }
    });
    $("#rv-sort").addEventListener("change", e => { sort = e.target.value; draw(true); });

    /* ---------- Visualizador de fotos ---------- */
    const lb = $("#rv-lb");
    let cur = 0;
    function lbHtml() {
      const p = photos[cur], r = p.r;
      return `<div class="rv-lb-in">
        <figure><img src="${esc(p.src)}" alt="Foto enviada por ${esc(r.nome)}"></figure>
        <div class="rv-lb-side">
          <header><span class="rv-av t${tone(r.nome || "")}" aria-hidden="true">${initials(r.nome || "?")}</span><div><b>${esc(r.nome)}</b>${r.cidade ? `<span>${esc(r.cidade)}</span>` : ""}</div></header>
          <div class="rv-line">${stars(r.nota)}${r.titulo ? `<strong>${esc(r.titulo)}</strong>` : ""}</div>
          ${r.variacao ? `<div class="rv-meta"><span>${esc(r.variacao)}</span></div>` : ""}
          <p>${esc(r.texto)}</p>
          <small>${cur + 1} / ${photos.length}</small>
        </div>
        <button class="rv-lb-x" data-lb="x" aria-label="Fechar">${icon.close}</button>
        ${photos.length > 1 ? `<button class="rv-lb-nav prev" data-lb="-1" aria-label="Foto anterior">${icon.left}</button><button class="rv-lb-nav next" data-lb="1" aria-label="Próxima foto">${icon.arrow}</button>` : ""}
      </div>`;
    }
    function openLb(i) { if (i < 0) return; cur = i; lb.innerHTML = lbHtml(); lb.showModal(); }
    const step = d => { cur = (cur + d + photos.length) % photos.length; const sw = () => lb.innerHTML = lbHtml(); document.startViewTransition ? document.startViewTransition(sw) : sw(); };
    lb.addEventListener("click", e => {
      const b = e.target.closest("[data-lb]");
      if (b) return b.dataset.lb === "x" ? lb.close() : step(+b.dataset.lb);
      if (e.target === lb) lb.close();
    });
    lb.addEventListener("keydown", e => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); });

    /* barras enchem uma vez ao aparecer */
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { root.classList.add("in"); io.disconnect(); } }), { threshold: .2 });
      io.observe(root);
    } else root.classList.add("in");
    draw(true);
  }

  if (demo) {
    const s = document.createElement("script");
    s.src = "assets/reviews-demo.js?v=" + Date.now();
    s.onload = start; s.onerror = start;
    document.head.append(s);
  } else start();
})();
