'use client'
import { useState, useRef } from 'react'
import { GripVertical, Eye, EyeOff, Save, CheckCircle } from 'lucide-react'

interface Block { id: string; type: string; label: string; active: boolean; order: number }

export function HomeBlocksEditor({ initialBlocks }: { initialBlocks: Block[] }) {
  const [blocks, setBlocks] = useState<Block[]>([...initialBlocks].sort((a, b) => a.order - b.order))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const dragIdx  = useRef<number | null>(null)
  const overIdx  = useRef<number | null>(null)

  function toggle(id: string) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b))
  }

  function onDragStart(idx: number) {
    dragIdx.current = idx
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    overIdx.current = idx
  }

  function onDrop() {
    const from = dragIdx.current
    const to   = overIdx.current
    if (from === null || to === null || from === to) return
    setBlocks(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((b, i) => ({ ...b, order: i }))
    })
    dragIdx.current = null
    overIdx.current = null
  }

  async function save() {
    setSaving(true)
    const payload = blocks.map((b, i) => ({ ...b, order: i }))
    const res = await fetch('/api/admin/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key: 'home_blocks', value: JSON.stringify(payload) }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  return (
    <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Blocos da Homepage</h3>
          <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>Arraste para reordenar · clique no olho para ativar/desativar</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#16a34a' }}>
              <CheckCircle size={14} /> Salvo!
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--admin-accent)', color: '#ffffff', border: 'none',
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={13} /> {saving ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </div>
      </div>

      {blocks.map((block, idx) => (
        <div
          key={block.id}
          draggable
          onDragStart={() => onDragStart(idx)}
          onDragOver={e => onDragOver(e, idx)}
          onDrop={onDrop}
          style={{
            padding: '14px 20px',
            borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', gap: '14px',
            background: block.active ? '#ffffff' : '#fafafa',
            opacity: block.active ? 1 : 0.55,
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          <GripVertical size={16} color="#cbd5e1" style={{ flexShrink: 0 }} />

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: block.active ? '#0f172a' : '#94a3b8' }}>
              {block.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{block.type}</div>
          </div>

          <div style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px',
            background: block.active ? '#dcfce7' : '#f1f5f9',
            color: block.active ? '#16a34a' : '#94a3b8',
          }}>
            {block.active ? 'Visível' : 'Oculto'}
          </div>

          <button
            onClick={() => toggle(block.id)}
            onMouseDown={e => e.stopPropagation()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: block.active ? '#4f46e5' : '#94a3b8' }}
            title={block.active ? 'Ocultar' : 'Mostrar'}
          >
            {block.active ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      ))}
    </div>
  )
}
