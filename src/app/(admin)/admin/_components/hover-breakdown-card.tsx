'use client'

import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'

export interface BreakdownRow {
  label: string
  value: ReactNode
  icon?: ReactNode
}

interface HoverBreakdownCardProps {
  icon:        ReactNode
  label:       string
  value:       ReactNode
  rows:        BreakdownRow[]
  footerLabel?: string
  footerValue?: string
  extra?:      ReactNode
}

export function HoverBreakdownCard({ icon, label, value, rows, footerLabel, footerValue, extra }: HoverBreakdownCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{ position: 'relative', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '16px 18px' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon}
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex', padding: 0 }}
        >
          <Info size={13} />
        </button>
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace', lineHeight: 1.1 }}>{value}</div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, width: 'min(240px, calc(100vw - 32px))',
          background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '10px',
          padding: '14px 16px', boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
        }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '5px 0' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-sec)', display: 'flex', alignItems: 'center', gap: '6px' }}>{r.icon}{r.label}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{r.value}</span>
            </div>
          ))}
          {footerLabel && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--admin-border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{footerLabel}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-accent)' }}>{footerValue}</span>
            </div>
          )}
          {extra}
        </div>
      )}
    </div>
  )
}
