/* 19/10: aba "Avaliações" fixa na lateral + janela com fotos e vídeos reais de clientes (JR.DEPOIMENTOS, em depoimentos-lista.js).
   Cada item: { tipo: "video"|"foto", src, capa?, parceiro?, nome?, data? (AAAA-MM-DD), nota? (1–5), texto?, produto? }.
   parceiro: true = divulgação paga/permuta (cupom, #publi): o card leva o selo "Parceiro · publi" (CONAR/CDC).
   Nome/data/nota/texto/produto só aparecem quando preenchidos com o que o cliente disse de verdade: nada é inventado aqui. */
(function () {
  const lista = window.JR && JR.DEPOIMENTOS;
  if (!lista || !lista.length) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ico = {
    estrela: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    mudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/></svg>',
    som: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  };
  const data = d => { const x = new Date(d + "T12:00:00"); return isNaN(x) ? "" : x.toLocaleDateString("pt-BR"); };

  const card = (d, i) => {
    const midia = d.tipo === "video"
      ? `<video src="${esc(d.src)}"${d.capa ? ` poster="${esc(d.capa)}"` : ""} muted loop playsinline preload="none" aria-label="Vídeo de cliente ${i + 1}"></video>
         <button type="button" class="dep-som" aria-label="Ligar o som">${ico.mudo}</button>`
      : `<img src="${esc(d.src)}" alt="Foto de cliente usando Just Runner" loading="lazy" decoding="async">`;
    const info = (d.nome || d.texto || d.produto) ? `<div class="dep-info">
        ${d.nome ? `<div class="dep-nome">${esc(d.nome)}</div>` : ""}
        ${d.data ? `<div class="dep-data">${data(d.data)}</div>` : ""}
        ${d.nota ? `<div class="dep-nota" role="img" aria-label="Nota ${d.nota} de 5">${"★".repeat(d.nota)}${"☆".repeat(5 - d.nota)}</div>` : ""}
        ${d.texto ? `<p class="dep-texto">${esc(d.texto)}</p>` : ""}
        ${d.produto ? `<span class="dep-produto">${esc(d.produto)}</span>` : ""}
      </div>` : "";
    const selo = d.parceiro ? `<span class="dep-selo">Parceiro · publi</span>` : "";
    return `<figure class="dep-card"><div class="dep-midia">${midia}${selo}</div>${info}</figure>`;
  };

  const tab = document.createElement("button");
  tab.type = "button"; tab.className = "dep-tab"; tab.setAttribute("aria-haspopup", "dialog");
  tab.innerHTML = `${ico.estrela}<span>Avaliações</span>`;
  document.body.appendChild(tab);

  let janela, fundo, obs, ultimoFoco;
  function montar() {
    fundo = document.createElement("div"); fundo.className = "dep-fundo";
    janela = document.createElement("div"); janela.className = "dep-janela";
    janela.setAttribute("role", "dialog"); janela.setAttribute("aria-modal", "true"); janela.setAttribute("aria-labelledby", "dep-titulo");
    janela.innerHTML = `<div class="dep-topo"><button type="button" class="dep-fechar" aria-label="Fechar">${ico.fechar}</button>
        <h2 id="dep-titulo">A opinião de quem já usa:</h2><span></span></div>
      <div class="dep-corpo"><p class="dep-sub">Fotos e vídeos de clientes e de criadores parceiros. Conteúdo de parceria aparece marcado.</p>
        <div class="dep-grade">${lista.map(card).join("")}</div></div>`;
    document.body.append(fundo, janela);
    fundo.addEventListener("click", fechar);
    janela.querySelector(".dep-fechar").addEventListener("click", fechar);
    janela.addEventListener("click", e => {
      const b = e.target.closest(".dep-som"); if (!b) return;
      const v = b.parentElement.querySelector("video");
      const ligar = v.muted;
      janela.querySelectorAll("video").forEach(o => { if (o !== v) { o.muted = true; const ob = o.parentElement.querySelector(".dep-som"); ob.innerHTML = ico.mudo; ob.setAttribute("aria-label", "Ligar o som"); } });
      v.muted = !ligar; if (ligar) v.play().catch(() => {});
      b.innerHTML = ligar ? ico.som : ico.mudo; b.setAttribute("aria-label", ligar ? "Desligar o som" : "Ligar o som");
    });
    /* vídeo só carrega e toca (sem som) quando aparece na janela; pausa ao sair */
    obs = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) { if (v.preload === "none") v.preload = "auto"; v.play().catch(() => {}); }
      else v.pause();
    }), { root: janela.querySelector(".dep-corpo"), threshold: 0.35 });
    janela.querySelectorAll("video").forEach(v => obs.observe(v));
  }
  function abrir() {
    ultimoFoco = document.activeElement;
    if (!janela) montar();
    janela.hidden = fundo.hidden = false;
    requestAnimationFrame(() => document.body.classList.add("dep-aberto"));
    janela.querySelector(".dep-fechar").focus();
    document.addEventListener("keydown", tecla);
  }
  function fechar() {
    document.body.classList.remove("dep-aberto");
    janela.querySelectorAll("video").forEach(v => { v.pause(); v.muted = true; });
    janela.querySelectorAll(".dep-som").forEach(b => { b.innerHTML = ico.mudo; b.setAttribute("aria-label", "Ligar o som"); });
    document.removeEventListener("keydown", tecla);
    setTimeout(() => { if (!document.body.classList.contains("dep-aberto")) janela.hidden = fundo.hidden = true; }, 220);
    if (ultimoFoco) ultimoFoco.focus();
  }
  function tecla(e) {
    if (e.key === "Escape") return fechar();
    if (e.key !== "Tab") return;
    const f = [...janela.querySelectorAll("button")]; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  tab.addEventListener("click", abrir);
})();
