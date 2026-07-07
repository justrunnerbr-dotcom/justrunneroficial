export default function SobrePage() {
  return (
    <div style={{ padding: '64px 0' }}>
      <div className="page-width" style={{ maxWidth: '720px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 40px)',
            color: 'var(--color-heading)',
            marginBottom: '32px',
          }}
        >
          Sobre a Just Have Fun
        </h1>

        <div
          style={{
            fontSize: '15px',
            lineHeight: 1.8,
            color: 'var(--color-muted)',
            fontFamily: 'var(--font-montserrat), sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <p>
            A Just Have Fun nasceu da paixão por óculos de alta performance. Somos especialistas
            em Oakley, trazendo os modelos mais desejados do mundo diretamente para você.
          </p>
          <p>
            Nossa missão é simples: oferecer os melhores óculos do mercado com a melhor
            experiência de compra — entrega rápida, produtos originais e atendimento de
            verdade.
          </p>
          <p>
            Cada modelo em nosso catálogo é selecionado com cuidado. De clássicos como
            o Juliet ao Flak 2.0 XL de última geração, você encontra aqui o que há de
            melhor em proteção e estilo.
          </p>
          <p>
            Compre com confiança. Entrega para todo o Brasil.
          </p>
        </div>
      </div>
    </div>
  )
}
