'use client'

import { useRouter } from 'next/navigation'

export function ClickableRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <tr
      onClick={() => router.push(href)}
      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--admin-bg)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
      style={{ borderBottom: '1px solid var(--admin-border)', cursor: 'pointer', transition: 'background 0.1s' }}
    >
      {children}
    </tr>
  )
}
