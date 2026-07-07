'use client'
import { useState, useEffect, useRef, useContext, type ReactNode } from 'react'
import { EditModeContext } from './dashboard-editable-layout'

interface RowItem {
  id: string
  node: ReactNode
}

// Mesma lógica de arrastar do DashboardEditableLayout, só que pra reordenar os
// CARTÕES dentro de um bloco (não o bloco inteiro) — lê o mesmo "modo de
// organizar" via contexto, então um único botão controla os dois níveis.
export function ReorderableRow({
  storageKey,
  items,
  gridTemplateColumns,
}: {
  storageKey: string
  items: RowItem[]
  gridTemplateColumns: string
}) {
  const editMode = useContext(EditModeContext)
  const defaultOrder = items.map((i) => i.id)
  const [order, setOrder] = useState<string[]>(defaultOrder)
  const dragId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const fullKey = `jhf-admin-row-${storageKey}`

  useEffect(() => {
    try {
      const saved = localStorage.getItem(fullKey)
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
    try { localStorage.setItem(fullKey, JSON.stringify(newOrder)) } catch {}
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

  const ordered = order
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is RowItem => !!i)

  return (
    <div style={{ display: 'grid', gridTemplateColumns, gap: '20px' }}>
      {ordered.map((item) => (
        <div
          key={item.id}
          draggable={editMode}
          onDragStart={(e) => { e.stopPropagation(); dragId.current = item.id }}
          onDragOver={(e) => { if (editMode) { e.preventDefault(); e.stopPropagation(); if (dragOverId !== item.id) setDragOverId(item.id) } }}
          onDragLeave={() => { if (dragOverId === item.id) setDragOverId(null) }}
          onDrop={(e) => { if (editMode) { e.preventDefault(); e.stopPropagation(); handleDrop(item.id) } }}
          style={{
            border: editMode ? `2px dashed ${dragOverId === item.id ? 'var(--admin-accent)' : 'var(--admin-border)'}` : '2px solid transparent',
            borderRadius: '14px',
            padding: editMode ? '6px' : '0',
            background: editMode && dragOverId === item.id ? 'rgba(var(--admin-accent-rgb), 0.05)' : 'transparent',
            cursor: editMode ? 'grab' : 'default',
            minWidth: 0,
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          {item.node}
        </div>
      ))}
    </div>
  )
}
