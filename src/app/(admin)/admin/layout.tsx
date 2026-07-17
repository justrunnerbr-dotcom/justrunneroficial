import { Suspense } from 'react'
import { Sidebar } from './_components/sidebar'
import { DateRangeFilter } from './_components/date-range-filter'
import './admin.css'

export const metadata = { title: 'Just Runner Admin' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="admin-root" data-theme="dark" style={{ display: 'flex', minHeight: '100vh', background: 'var(--admin-bg)', color: 'var(--admin-text-main)' }}>
      <Sidebar />
      <div className="admin-content" style={{ marginLeft: 'calc(var(--admin-sidebar-width, 250px) + 6px)', flex: 1, minWidth: 0, transition: 'margin-left 0.2s ease' }}>
        <Suspense fallback={null}>
          <DateRangeFilter />
        </Suspense>
        {children}
      </div>
    </div>
  )
}
