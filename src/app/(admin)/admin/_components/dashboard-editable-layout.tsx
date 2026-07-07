'use client'
import { useState, useEffect, useRef, createContext, type ReactNode } from 'react'
import { GripVertical, LayoutGrid, RotateCcw, Check } from 'lucide-react'

export interface DashboardWidget {
  id: string
  label: string
  node: ReactNode
}

const STORAGE_KEY = 'jhf-admin-dashboard-order'

// Compartilha o estado de "modo de organizar" com os blocos internos
// (ReorderableRow), pra um único botão controlar os dois níveis de arrastar.
export const EditModeContext = createContext(false)

// Deixa o usuário reorganizar os blocos do dashboard (arrastar pra cima/baixo),
// lembrando a ordem escolhida no navegador dele (localStorage — não sincroniza
// entre computadores diferentes de propósito, pra manter simples).
export function DashboardEditableLayout({ widgets }: { widgets: DashboardWidget[] }) {
  const defaultOrder = widgets.map((w) => w.id)
  const [order, setOrder] = useState<string[]>(defaultOrder)
  const [editMode, setEditMode] = useState(false)
  const dragId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed: string[] = JSON.parse(saved)
      const validSaved = parsed.filter((id) => defaultOrder.includes(id))
      const missing = defaultOrder.filter((id) => !validSaved.includes(id))
      if (validSaved.length > 0) setOrder([...validSaved, ...missing])
    } catch {
      // localStorage indisponível ou dado corrompido — mantém ordem padrão
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function persist(newOrder: string[]) {
    setOrder(newOrder)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder)) } catch {}
  }

  function handleDrop(targetId: string) {
    const draggedId = dragId.current
    dragId.current = null
    setDragOverId(null)
    if (!draggedId || draggedId === targetId) return
    const newOrder = [...order]
    const fromIdx = newOrder.indexOf(draggedId)
    const toIdx = newOrder.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggedId)
    persist(newOrder)
  }

  const orderedWidgets = order
    .map((id) => widgets.find((w) => w.id === id))
    .filter((w): w is DashboardWidget => !!w)

  return (
    <EditModeContext.Provider value={editMode}>
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px' }}>
        {editMode && order.join(',') !== defaultOrder.join(',') && (
          <button
            onClick={() => persist(defaultOrder)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
              color: 'var(--admin-text-sec)', background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
              borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} /> Restaurar padrão
          </button>
        )}
        <button
          onClick={() => setEditMode((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
            color: editMode ? '#fff' : 'var(--admin-text-sec)',
            background: editMode ? 'var(--admin-accent)' : 'var(--admin-card)',
            border: '1px solid var(--admin-border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
          }}
        >
          {editMode ? <Check size={13} /> : <LayoutGrid size={13} />}
          {editMode ? 'Concluir organização' : 'Organizar layout'}
        </button>
      </div>

      {orderedWidgets.map((w) => (
        <div
          key={w.id}
          draggable={editMode}
          onDragStart={() => { dragId.current = w.id }}
          onDragOver={(e) => { if (editMode) { e.preventDefault(); if (dragOverId !== w.id) setDragOverId(w.id) } }}
          onDragLeave={() => { if (dragOverId === w.id) setDragOverId(null) }}
          onDrop={(e) => { if (editMode) { e.preventDefault(); handleDrop(w.id) } }}
          style={{
            marginBottom: '20px',
            border: editMode ? `2px dashed ${dragOverId === w.id ? 'var(--admin-accent)' : 'var(--admin-border)'}` : '2px solid transparent',
            borderRadius: '16px',
            padding: editMode ? '10px' : '0',
            background: editMode && dragOverId === w.id ? 'rgba(var(--admin-accent-rgb), 0.04)' : 'transparent',
            cursor: editMode ? 'grab' : 'default',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          {editMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px 10px', color: 'var(--admin-accent)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              <GripVertical size={14} /> {w.label}
            </div>
          )}
          {w.node}
        </div>
      ))}
    </div>
    </EditModeContext.Provider>
  )
}
