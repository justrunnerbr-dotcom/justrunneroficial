import { Suspense } from 'react'
import { LoginForm } from './LoginForm'
import { isMultiUser } from '@/lib/admin/users'

export default function AdminLoginPage() {
  // Lido no servidor e passado como prop: `ADMIN_USERS` não pode vazar pro
  // client, e o formulário só deve pedir usuário quando existir mais de um.
  const multiUser = isMultiUser()

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f172a',
    }}>
      <Suspense fallback={<div style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>Carregando...</div>}>
        <LoginForm multiUser={multiUser} />
      </Suspense>
    </div>
  )
}
