/* Pixel da Meta no tema novo — mesmos IDs e eventos do site no ar (src/components/store/meta-pixel.tsx, src/lib/meta.ts).
   Desligado em localhost (igual ao site). Cada evento vai pro navegador (fbq) e pro servidor (/api/meta/capi-event, CAPI)
   com o mesmo event_id, pra Meta não contar duas vezes. */
(function () {
  /* Atribuição: mesma chave e formato do site no ar (src/lib/analytics/client.ts → captureAttribution). */
  try {
    const K = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "meta_campaign_id", "meta_adset_id", "meta_ad_id",
      "meta_campaign_name", "meta_adset_name", "meta_ad_name", "meta_placement", "jr_channel", "jr_funnel"];
    const q = new URLSearchParams(location.search);
    if (K.some(k => q.get(k))) {
      const now = new Date(), a = { landing_page: location.pathname, captured_at: now.toISOString(), expires_at: new Date(now.getTime() + 30 * 864e5).toISOString() };
      K.forEach(k => { const v = q.get(k); if (v) a[k] = v; });
      localStorage.setItem("jr_attribution", JSON.stringify(a));
    }
  } catch (e) { /* sem storage */ }
  /* 19/10: registro próprio do site (tabela events via /api/track), mesmo formato do site antigo (src/lib/analytics/client.ts):
     sessão jc_session, visitante jc_visitor, origem do anúncio em properties.attribution. Cada evento do pixel vira um registro
     (PageView→page_view, ViewContent→view_content, AddToCart→add_to_cart, InitiateCheckout→initiate_checkout, Contact→whatsapp_click).
     Em localhost não grava. ?jr_teste=1 marca o evento como teste (properties.teste). */
  window.JR = window.JR || {};
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const novoId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, "0")).join("");
  const guarda = (k, st) => { try { let v = st.getItem(k); if (!v) { v = novoId(); st.setItem(k, v); } return v; } catch (e) { return novoId(); } };
  const NOMES = { PageView: "page_view", ViewContent: "view_content", AddToCart: "add_to_cart", InitiateCheckout: "initiate_checkout", Contact: "whatsapp_click" };
  JR.track = (tipo, extra = {}) => {
    if (local) return;
    try {
      const q = new URLSearchParams(location.search); let at = {};
      try { const raw = localStorage.getItem("jr_attribution"); if (raw) { const x = JSON.parse(raw); if (!x.expires_at || new Date(x.expires_at) >= new Date()) at = x; } } catch (e) {}
      const pega = k => q.get(k) || at[k] || undefined;
      const attribution = {};
      ["fbclid", "meta_campaign_id", "meta_adset_id", "meta_ad_id", "meta_campaign_name", "meta_adset_name", "meta_ad_name", "meta_placement", "jr_channel", "jr_funnel", "landing_page", "captured_at"]
        .forEach(k => { const v = pega(k); if (v) attribution[k] = v; });
      const ua = navigator.userAgent;
      const corpo = JSON.stringify({ session_id: guarda("jc_session", sessionStorage), visitor_id: guarda("jc_visitor", localStorage), event_type: tipo,
        page: location.pathname, product_slug: extra.product_slug, value: extra.value,
        properties: { ...(extra.properties || {}), ...(Object.keys(attribution).length ? { attribution } : {}), ...(q.get("jr_teste") ? { teste: true } : {}), tema: "novo" },
        device: /Mobi|Android/i.test(ua) ? "mobile" : /Tablet|iPad/i.test(ua) ? "tablet" : "desktop", referrer: document.referrer || undefined,
        utm_source: pega("utm_source"), utm_medium: pega("utm_medium"), utm_campaign: pega("utm_campaign"), utm_content: pega("utm_content"), utm_term: pega("utm_term") });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([corpo], { type: "application/json" }));
      else fetch("/api/track", { method: "POST", body: corpo, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    } catch (e) { /* nunca quebra a página */ }
  };
  const registra = (name, data) => {
    const tipo = NOMES[name]; if (!tipo) return;
    const d = data || {};
    JR.track(tipo, { product_slug: (location.pathname.match(/^\/produto\/([^/?#]+)/) || [])[1] || (JR.currentProduct && JR.currentProduct.slug) || undefined,
      value: typeof d.value === "number" ? d.value : undefined,
      properties: { ...(d.content_ids ? { skus: d.content_ids } : {}), ...(d.num_items ? { itens: d.num_items } : {}), ...(d.content_name ? { nome: d.content_name } : {}) } });
  };
  if (local) { JR.meta = () => {}; return; }
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
  s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1075718164724459');   // mesmos IDs do site no ar (HTML de justrunner.com.br)
  fbq('init', '2074135393508610');
  const eid = () => 'jr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const capi = (name, id, data) => { try { fetch('/api/meta/capi-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
    body: JSON.stringify({ event_name: name, event_id: id, event_source_url: location.href, custom_data: data }) }).catch(() => {}); } catch (e) {} };
  JR.meta = (name, data) => { const id = eid(); fbq('track', name, data || {}, { eventID: id }); capi(name, id, data); registra(name, data); };
  JR.meta('PageView');
})();
