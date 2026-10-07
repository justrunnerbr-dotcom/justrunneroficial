export default function Loading() {
  return (
    <div role="status" aria-live="polite" style={{ padding: '28px', maxWidth: '1440px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>Análise Suprema</h1>
      <p style={{ color: 'var(--admin-text-sec)', margin: '0 0 24px' }}>Carregando a leitura financeira e os módulos de análise…</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px' }}>
        {[1, 2, 3, 4].map(id => <div key={id} aria-hidden="true" style={{ height: '136px', borderRadius: '16px', background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }} />)}
      </div>
    </div>
  )
}
