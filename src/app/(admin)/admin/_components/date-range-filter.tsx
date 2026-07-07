'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { DateRangePicker } from './date-range-picker'

export function DateRangeFilter() {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  const range = getDateRangeFromSearchParams({
    range: searchParams.get('range') ?? undefined,
    from:  searchParams.get('from')  ?? undefined,
    to:    searchParams.get('to')    ?? undefined,
  })

  return (
    <>
      <div style={{
        background: 'var(--admin-card)',
        borderBottom: '1px solid var(--admin-border)',
        padding: '10px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{
          fontSize: '11px', fontWeight: 600,
          color: 'var(--admin-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          Período
        </span>

        <button
          onClick={() => setOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--admin-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: '8px',
            padding: '7px 14px',
            color: 'var(--admin-text-main)',
            fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--admin-accent)', flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{range.label}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }}>
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      {open && <DateRangePicker onClose={() => setOpen(false)} />}
    </>
  )
}
