'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? '#dcfce7' : '#f1f5f9',
        color: copied ? '#16a34a' : '#374151',
        border: '1px solid var(--admin-border)', borderRadius: '8px',
        padding: '8px 12px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px',
      }}
    >
      {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
    </button>
  )
}
