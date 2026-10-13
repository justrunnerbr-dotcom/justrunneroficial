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
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { window.JR = window.JR || {}; JR.meta = () => {}; return; }
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
  s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1075718164724459');   // mesmos IDs do site no ar (HTML de justrunner.com.br)
  fbq('init', '2074135393508610');
  const eid = () => 'jr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const capi = (name, id, data) => { try { fetch('/api/meta/capi-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
    body: JSON.stringify({ event_name: name, event_id: id, event_source_url: location.href, custom_data: data }) }).catch(() => {}); } catch (e) {} };
  window.JR = window.JR || {};
  JR.meta = (name, data) => { const id = eid(); fbq('track', name, data || {}, { eventID: id }); capi(name, id, data); };
  JR.meta('PageView');
})();
