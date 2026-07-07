import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export default function AdminLoginPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f172a',
    }}>
      <Suspense fallback={<div style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
