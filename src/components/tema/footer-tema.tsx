// Rodapé do tema novo (protótipo do sócio, prototipo-tema/assets/app.js → renderFooter), com os dados e rotas
// reais da loja. Estilo em src/styles/tema-novo.css.
import Link from 'next/link'

const WHATS = 'https://wa.me/5511989072335'

export function FooterTema({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <footer className="footer" id="ajuda">
      <div className="wrap">
        <div className="cols">
          <div>
            <Link href="/" className="logo" aria-label="Just Runner — início">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl || '/LOGO/JUST_25_2%20(1).png'} alt="Just Runner" width={96} height={38} />
            </Link>
            <div className="sig">Sua corrida como você nunca viu.</div>
            <p style={{ margin: 0, maxWidth: '32ch' }}>Óculos de performance para quem está em movimento. Proteção, conforto e estilo no mesmo produto.</p>
            <p style={{ margin: '14px 0 0' }}>
              <a href="https://www.instagram.com/justrunner.br1" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>@justrunner.br1
              </a>
            </p>
          </div>
          <div>
            <h4>Loja</h4>
            <ul>
              <li><Link href="/colecao/compre-1-leve-2">Compre 1 Leve 2</Link></li>
              <li><Link href="/colecao/combos">Compre 1 Leve 3</Link></li>
              <li><Link href="/colecao/lancamentos">Lançamentos</Link></li>
              <li><Link href="/colecao">Todos os modelos</Link></li>
              <li><Link href="/sobre">Sobre a Just Runner</Link></li>
            </ul>
          </div>
          <div>
            <h4>Ajuda</h4>
            <ul>
              <li><Link href="/faq">Perguntas frequentes</Link></li>
              <li><Link href="/trocas-e-devolucoes">Trocas e devoluções</Link></li>
              <li><Link href="/contato">Contato</Link></li>
              <li><Link href="/politica-de-privacidade">Política de privacidade</Link></li>
            </ul>
          </div>
          <div>
            <h4>Atendimento</h4>
            <ul>
              <li><a href={WHATS} target="_blank" rel="noopener noreferrer">WhatsApp (11) 98907-2335</a></li>
              <li>Seg–Sáb, 9h às 18h</li>
              <li><a href="mailto:suportejustrunner@gmail.com">suportejustrunner@gmail.com</a></li>
            </ul>
            <div className="pay">{['Cartão de crédito', 'Pix', 'Boleto'].map(p => <span key={p}>{p}</span>)}</div>
            <p style={{ margin: '10px 0 0', fontSize: 12 }}>Checkout seguro Yampi · 6x sem juros</p>
          </div>
        </div>
        <div className="legal"><span>© 2026 Just Runner · CNPJ 62.880.024/0001-30 · justrunner.com.br</span></div>
      </div>
    </footer>
  )
}
