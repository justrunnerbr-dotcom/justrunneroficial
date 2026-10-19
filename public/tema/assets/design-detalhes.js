/* 19/10: "Design em detalhes" — 3 vídeos de clientes (Drive do dono) no Supabase Storage, iguais em todas as PDPs.
   Usa a versão 320x568 (-272); a -540 fica no Storage se a seção voltar a ser larga. Tocam sem som quando a seção aparece;
   clicar abre em tela cheia com som; o botão liga o som de um (e desliga dos outros). */
(function () {
  const box = document.getElementById("dd-grade");
  if (!box) return;
  const BASE = "https://jprxiyxxdncfyeblcebb.supabase.co/storage/v1/object/public/products/design-em-detalhes/";
  const tam = "272";   // 19/10: na coluna de compra o card tem ~145px; a versão leve (320x568) basta em qualquer tela
  const ico = {
    play: '<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>',
    mudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/></svg>',
    som: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  };
  box.innerHTML = [1, 2, 3].map(n => `<div class="dd-card"><video src="${BASE}${n}-${tam}.mp4" poster="${BASE}${n}-capa.jpg" muted loop playsinline preload="none" aria-label="Vídeo de cliente ${n}"></video>
    <span class="dd-play">${ico.play}</span><button type="button" class="dd-som" aria-label="Ligar o som">${ico.mudo}</button></div>`).join("");
  const cards = [...box.querySelectorAll(".dd-card")];
  const vids = cards.map(c => c.querySelector("video"));
  vids.forEach(v => { v.onplay = () => v.parentElement.classList.add("tocando"); v.onpause = () => v.parentElement.classList.remove("tocando"); });
  const mudo = (v, sim) => { v.muted = sim; const b = v.parentElement.querySelector(".dd-som"); b.innerHTML = sim ? ico.mudo : ico.som; b.setAttribute("aria-label", sim ? "Ligar o som" : "Desligar o som"); };
  new IntersectionObserver(([e]) => vids.forEach(v => {
    if (e.isIntersecting) { if (v.preload === "none") v.preload = "auto"; v.play().catch(() => {}); } else { v.pause(); mudo(v, true); }
  }), { threshold: 0.25 }).observe(box);
  box.addEventListener("click", e => {
    const card = e.target.closest(".dd-card"); if (!card) return;
    const v = card.querySelector("video");
    if (e.target.closest(".dd-som")) { const ligar = v.muted; vids.forEach(o => mudo(o, true)); if (ligar) { mudo(v, false); v.play().catch(() => {}); } return; }
    abrir(cards.indexOf(card));
  });

  /* 19/10: clicar no vídeo abre em tela cheia, com som, na versão 540x960; setas/teclado passam entre os 3 */
  let lb, lbV, atual = 0, foco;
  function montar() {
    lb = document.createElement("div"); lb.className = "dd-lb"; lb.hidden = true;
    lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Vídeo de cliente");
    lb.innerHTML = `<button type="button" class="dd-lb-x" aria-label="Fechar">✕</button>
      <button type="button" class="dd-lb-seta ant" aria-label="Vídeo anterior">‹</button>
      <video class="dd-lb-v" playsinline controls></video>
      <button type="button" class="dd-lb-seta prox" aria-label="Próximo vídeo">›</button>
      <span class="dd-lb-n" aria-live="polite"></span>`;
    document.body.appendChild(lb);
    lbV = lb.querySelector("video");
    lb.querySelector(".dd-lb-x").onclick = fechar;
    lb.querySelector(".ant").onclick = () => mostrar(atual - 1);
    lb.querySelector(".prox").onclick = () => mostrar(atual + 1);
    lb.addEventListener("click", e => { if (e.target === lb) fechar(); });
    let x0 = null;
    lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) mostrar(atual + (dx < 0 ? 1 : -1)); x0 = null; });
  }
  function mostrar(i) {
    atual = (i + 3) % 3;
    lbV.src = `${BASE}${atual + 1}-540.mp4`; lbV.poster = `${BASE}${atual + 1}-capa.jpg`;
    lbV.muted = false; lbV.play().catch(() => { lbV.muted = true; lbV.play().catch(() => {}); });
    lb.querySelector(".dd-lb-n").textContent = `${atual + 1} / 3`;
  }
  function abrir(i) {
    if (!lb) montar();
    foco = document.activeElement;
    vids.forEach(v => { v.pause(); mudo(v, true); });
    lb.hidden = false; document.body.classList.add("dd-lb-aberto");
    mostrar(i);
    lb.querySelector(".dd-lb-x").focus();
    document.addEventListener("keydown", tecla);
  }
  function fechar() {
    lbV.pause(); lbV.removeAttribute("src"); lbV.load();
    lb.hidden = true; document.body.classList.remove("dd-lb-aberto");
    document.removeEventListener("keydown", tecla);
    vids.forEach(v => v.play().catch(() => {}));
    if (foco) foco.focus();
  }
  function tecla(e) {
    if (e.key === "Escape") fechar();
    else if (e.key === "ArrowRight") mostrar(atual + 1);
    else if (e.key === "ArrowLeft") mostrar(atual - 1);
  }
})();
