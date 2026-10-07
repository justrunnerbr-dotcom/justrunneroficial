 'use client'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" style={{ margin: '28px', padding: '24px', border: '1px solid var(--admin-border)', borderRadius: '16px', background: 'var(--admin-card)' }}>
      <h2 style={{ margin: '0 0 8px' }}>Não foi possível carregar a análise</h2>
      <p style={{ color: 'var(--admin-text-sec)' }}>Tente novamente para recuperar a leitura. Nenhuma ação de campanha foi executada.</p>
      <button onClick={reset} style={{ padding: '12px 18px', borderRadius: '10px', background: 'var(--admin-accent)', color: 'var(--admin-bg)', border: 0, cursor: 'pointer', fontWeight: 600 }}>Tentar novamente</button>
    </div>
  )
}
