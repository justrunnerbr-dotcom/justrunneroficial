/* 19/10: botão fixo de WhatsApp com popup de conversa. Na PDP a mensagem já leva o modelo/cor/lente.
   Número em JR.CONTACT.whatsapp (data.js). Clique em "Conversar" manda o evento Contact pro pixel. */
(function () {
  if (!window.JR || !JR.CONTACT || !JR.waLink) return;
  const C = JR.CONTACT;
  const ico = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35m-5.42 7.4A9.87 9.87 0 0 1 7.02 20.4l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88M20.46 3.49A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/></svg>';
  const produto = () => {
    const nome = document.getElementById("p-name")?.textContent.trim();
    const lente = document.getElementById("lens-name")?.textContent.trim();
    return nome ? `${nome}${lente ? ` (lente ${lente})` : ""}` : "";
  };
  const mensagem = () => { const p = produto(); return p ? `Olá! Tenho uma dúvida sobre o ${p} da Just Runner.` : "Olá! Tenho uma dúvida sobre os óculos da Just Runner."; };

  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "wa-btn"; btn.innerHTML = ico;
  btn.setAttribute("aria-label", "Falar com a Just Runner no WhatsApp"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "wa-pop");
  const pop = document.createElement("div");
  pop.className = "wa-pop"; pop.id = "wa-pop"; pop.hidden = true; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Conversa no WhatsApp");
  pop.innerHTML = `<div class="wa-topo"><span class="wa-av"><img src="fotos/logo.png" alt=""></span>
      <div><strong>Just Runner</strong><span>Atendimento ${C.hours || ""}</span></div>
      <button type="button" class="wa-x" aria-label="Fechar">✕</button></div>
    <div class="wa-corpo"><div class="wa-bolha">Oi! 👋 Ficou com dúvida sobre modelo, lente, tamanho ou entrega? Chama a gente aqui que a gente te ajuda a escolher.</div>
      <a class="wa-ir" target="_blank" rel="noopener">${ico}Conversar no WhatsApp</a></div>`;
  document.body.append(pop, btn);
  const ir = pop.querySelector(".wa-ir");
  const abrir = sim => { pop.hidden = !sim; btn.setAttribute("aria-expanded", String(sim)); if (sim) { ir.href = JR.waLink(mensagem()); ir.focus(); } };
  btn.addEventListener("click", () => abrir(pop.hidden));
  pop.querySelector(".wa-x").addEventListener("click", () => { abrir(false); btn.focus(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden) { abrir(false); btn.focus(); } });
  document.addEventListener("click", e => { if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) abrir(false); });
  ir.addEventListener("click", () => { ir.href = JR.waLink(mensagem()); JR.meta && JR.meta("Contact", { content_name: produto() || "geral" }); });
})();
