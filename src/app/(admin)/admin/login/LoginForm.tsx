'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff } from 'lucide-react'

export function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from') ?? '/admin'

  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push(from)
    } else {
      setError('Senha incorreta.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'var(--admin-card)', borderRadius: '20px', padding: '40px 36px',
      width: '100%', maxWidth: '380px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px', background: '#0f172a',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <Lock size={22} color="#ffffff" />
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Admin Panel</h1>
        <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>Just Have Fun Store</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Senha de acesso
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoFocus
              required
              style={{
                width: '100%', height: '44px', padding: '0 44px 0 14px',
                border: `1px solid ${error ? '#ef4444' : '#e2e8f0'}`, borderRadius: '10px',
                fontSize: '15px', letterSpacing: '2px', color: 'var(--admin-text-main)',
                outline: 'none', background: 'var(--admin-bg)', boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(p => !p)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--admin-text-muted)' }}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: '100%', height: '44px', borderRadius: '10px',
            background: loading ? '#94a3b8' : '#0f172a', color: '#ffffff',
            border: 'none', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
