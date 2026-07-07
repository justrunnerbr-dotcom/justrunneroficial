'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteCreativeButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!window.confirm(`Deletar "${name}"? Esta ação não pode ser desfeita.`)) return
    setLoading(true)
    const res = await fetch(`/api/admin/creatives/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin/criativos')
    else setLoading(false)
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        background: 'transparent', color: '#dc2626',
        border: '1px solid #fecaca', padding: '7px 14px',
        borderRadius: '7px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
      }}
    >
      <Trash2 size={12} /> {loading ? 'Deletando...' : 'Deletar'}
    </button>
  )
}
