'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CollectionStatusToggle({ id, status }: { id: string; status: string }) {
  const [current, setCurrent] = useState(status)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    const next = current === 'active' ? 'draft' : 'active'
    const res = await fetch(`/api/admin/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) {
      setCurrent(next)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px',
        cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
        background: current === 'active' ? '#dcfce7' : '#fef3c7',
        color: current === 'active' ? '#16a34a' : '#d97706',
      }}
    >
      {loading ? '...' : current === 'active' ? 'Ativo' : 'Rascunho'}
    </button>
  )
}
