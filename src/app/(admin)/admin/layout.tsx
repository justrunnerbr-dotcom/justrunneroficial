import { Suspense } from 'react'
import { Sidebar } from './_components/sidebar'
import { DateRangeFilter } from './_components/date-range-filter'
import './admin.css'

export const metadata = { title: 'JHF Admin' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="admin-root" data-theme="dark" style={{ display: 'flex', minHeight: '100vh', background: 'var(--admin-bg)', color: 'var(--admin-text-main)' }}>
      <Sidebar />
      <div style={{ marginLeft: '250px', flex: 1, minWidth: 0 }}>
        <Suspense fallback={null}>
          <DateRangeFilter />
        </Suspense>
        {children}
      </div>
    </div>
  )
}
