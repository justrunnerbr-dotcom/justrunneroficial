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
          JUST RUNNER.
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 600,
            fontSize: '18px',
            color: 'var(--color-heading)',
            marginTop: '-20px',
            marginBottom: '32px',
          }}
        >
          Performance para quem vive o esporte.
        </p>

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
            Cada treino pede foco, conforto e confiança em cada movimento. A Just Runner reúne
            óculos que combinam funcionalidade e estilo para acompanhar diferentes modalidades
            esportivas — e também a rotina de quem está sempre em movimento.
          </p>
          <p>
            Acreditamos que equipamento esportivo precisa acompanhar a sua performance sem
            deixar o estilo de lado nem se tornar inacessível. Por isso, buscamos oferecer
            modelos versáteis para usar no treino, na prática esportiva e além dela.
          </p>
          <p style={{ fontWeight: 700, color: 'var(--color-heading)' }}>
            No seu ritmo, em movimento.
          </p>
        </div>
      </div>
    </div>
  )
}
