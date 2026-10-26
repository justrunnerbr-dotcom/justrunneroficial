import { saveMenuAction } from '../actions'
import type { MenuConfig } from '@/lib/ig/menu'
import type { SearchResult } from '@/lib/ig/catalog-search'

const inputStyle: React.CSSProperties = {
  width: '100%', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)',
  padding: '8px 12px', fontSize: '13px', color: 'var(--admin-text-main)',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', marginBottom: '5px' }
const card: React.CSSProperties = { borderRadius: '14px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)', padding: '18px 20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }

// Rótulo legível de cada ação do assistente (payload._bot.action na ig_queue).
const ACOES: Record<string, string> = {
  menu: 'Menu (DM nova)', 'menu:curto': 'Menu curto (voltou antes de 12h)', videos: 'Mandou vídeos', 'videos:fotos': 'Mandou fotos (modelo sem vídeo)', 'videos:qual': 'Perguntou de qual modelo é o vídeo', 'menu:story': 'Menu (resposta de story)', 'menu:foto': 'Menu (chegou com foto)',
  buscar: 'Pediu para achar óculos', 'busca:modelo': 'Mostrou modelo buscado', 'busca:cor': 'Mostrou modelos por cor',
  'busca:vazia': 'Busca sem resultado', mais_vendidos: 'Mostrou mais vendidos', catalogo: 'Mandou o catálogo', outras_cores: 'Mostrou outras cores',
  promo: 'Explicou a promoção', um: 'Quer só 1 (upsell)', estilo: 'Escolha por cor', duvidas: 'Menu de dúvidas',
  'faq:prazo': 'Prazo e frete', 'faq:pagamento': 'Pagamento', 'faq:original': 'Lentes e qualidade', 'faq:tamanho': 'Tamanho', 'faq:site': 'Problema no site',
  pedido: 'Consulta de pedido', 'pedido:ok': 'Pedido encontrado', 'pedido:equipe': 'Pedido atrasado → equipe',
  'pedido:nao_achou': 'Pedido não encontrado', 'pedido:sem_dado': 'Pedido sem e-mail/número', troca: 'Troca ou defeito',
  data: 'Precisa pra uma data → equipe', parceria: 'Parceria → equipe', humano: 'Pediu a equipe', 'humano:urgente': 'Reclamação → equipe',
  equipe_respondeu: 'Equipe assumiu a conversa', lembrete: 'Lembrete 2h depois', 'checkin:checkout': 'Check-in: parou no checkout', 'checkin:carrinho': 'Check-in: parou no carrinho', 'checkin:comprou': 'Respondeu que comprou', 'checkin:travou': 'Travou no pagamento → equipe',
}

export function MenuForm({ cfg, acoes, q, busca }: {
  cfg: MenuConfig
  acoes: { action: string; n: number }[]
  q: string
  busca: SearchResult | null
}) {
  const total = acoes.reduce((s, a) => s + a.n, 0)
  return (
    <>
      <form action={saveMenuAction} style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)' }}>Assistente da DM</h2>
            <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
              Responde DM nova com menu, acha o óculos pelo nome ou pela cor, tira dúvidas de preço, prazo e pedido e chama a equipe quando precisa.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--admin-text-main)', whiteSpace: 'nowrap' }}>
            <input type="checkbox" name="active" defaultChecked={cfg.active} />
            Ativo
          </label>
        </div>
        <input type="hidden" name="message" value={cfg.message} />
        <input type="hidden" name="cooldown_days" value={cfg.cooldownDays} />
        <div style={{ maxWidth: '360px' }}>
          <label style={labelStyle}>Conta como conversa nova depois de (horas sem a pessoa falar)</label>
          <input name="silence_hours" type="number" min={1} defaultValue={cfg.silenceHours} style={inputStyle} />
        </div>
        <p style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)' }}>
          Quando alguém da equipe responde pelo app, o assistente sai daquela conversa por 6h. Quando o cliente pede a equipe, troca, parceria ou tem data apertada, sai por 12h. Preços e prazos ficam em src/lib/ig/bot-content.ts.
        </p>
        <div>
          <button type="submit" style={{ borderRadius: '8px', background: 'var(--admin-accent)', color: '#fff', fontSize: '13px', fontWeight: 700, padding: '9px 16px', border: 0, cursor: 'pointer' }}>
            Salvar
          </button>
        </div>
      </form>

      <div style={card}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-main)' }}>Últimos 7 dias · {total} respostas</h2>
        {acoes.length === 0 ? (
          <p style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>Nenhuma resposta do assistente ainda.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px 18px' }}>
            {acoes.map(a => (
              <div key={a.action} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--admin-text-sec)', borderBottom: '1px solid var(--admin-border)', padding: '4px 0' }}>
                <span>{ACOES[a.action] ?? a.action}</span><b style={{ color: 'var(--admin-text-main)' }}>{a.n}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      <form method="get" style={card}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-main)' }}>Testar a busca</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input name="q" defaultValue={q} placeholder='Ex: "juliete espelhada", "minute marrom", "óculos azul"' style={inputStyle} />
          <button type="submit" style={{ borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card-hover)', color: 'var(--admin-text-main)', fontSize: '13px', fontWeight: 600, padding: '8px 14px', cursor: 'pointer' }}>Buscar</button>
        </div>
        {busca && (
          busca.hits.length === 0 ? <p style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>Nada encontrado: o assistente responde que não achou e oferece mais vendidos, escolha por cor e a equipe.</p> : (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>{busca.model ? `Modelo reconhecido: ${busca.model}` : 'Nenhum modelo no texto: busca pela cor'}</p>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {busca.hits.map(h => (
                  <a key={h.variantId} href={h.url} target="_blank" rel="noreferrer" style={{ flex: '0 0 150px', textDecoration: 'none', color: 'var(--admin-text-main)', fontSize: '11.5px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {h.imageUrl && <img src={h.imageUrl} alt="" style={{ width: '150px', height: '110px', objectFit: 'contain', background: '#fff', borderRadius: '8px' }} />}
                    <div style={{ marginTop: '4px' }}>{h.productName} · {h.variantName}</div>
                  </a>
                ))}
              </div>
            </div>
          )
        )}
      </form>
    </>
  )
}
