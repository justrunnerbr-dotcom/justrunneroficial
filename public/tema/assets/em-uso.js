/* Quem corre de Just Runner (19/10): fotos reais de clientes (Drive do dono) em fotos/em-uso/01..38.jpg.
   A lista vai duas vezes no trilho pra faixa rolar sem emenda; a cópia fica escondida pro leitor de tela. */
(function () {
  const faixa = document.getElementById("emuso-faixa");
  if (!faixa) return;
  const TOTAL = 38;
  const fotos = Array.from({ length: TOTAL }, (_, i) => `fotos/em-uso/${String(i + 1).padStart(2, "0")}.jpg`);
  const img = (src, copia) => `<img src="${src}" alt="${copia ? "" : "Cliente usando Just Runner"}" loading="lazy" decoding="async" width="540" height="720"${copia ? ' class="emuso-copia" aria-hidden="true"' : ""}>`;
  faixa.innerHTML = `<div class="emuso-trilho">${fotos.map(s => img(s, false)).join("")}${fotos.map(s => img(s, true)).join("")}</div>`;
})();
