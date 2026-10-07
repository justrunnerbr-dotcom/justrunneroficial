import { Suspense } from 'react'
import { Sidebar } from './_components/sidebar'
import { DateRangeFilter } from './_components/date-range-filter'
import { AdminAutoRefresh } from './_components/auto-refresh'
import { adminFontVars } from './_components/admin-fonts'
import { getAdminSession } from '@/lib/admin/auth'
import { DEFAULT_AREA } from '@/lib/admin/roles'
import './admin.css'
import './admin-themes.css'

export const metadata = { title: 'Just Runner Admin' }

// Aplica o tema salvo antes da primeira pintura — sem isto, quem escolheu outro
// tema vê o Prizm piscar a cada página. Os valores são checados contra a lista.
const THEME_BOOT = `(function(){try{var r=document.currentScript.parentElement;var s=localStorage.getItem('admin-style');var m=localStorage.getItem('admin-theme');if(s==='prizm'||s==='max'||s==='carbon')r.setAttribute('data-style',s);if(m==='light'||m==='dark')r.setAttribute('data-theme',m);}catch(e){}})()`

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Só o menu depende disto. A guarda de verdade é o `checkAuth` de cada rota.
  const session = await getAdminSession()

  return (
    <div
      id="admin-root"
      data-style="prizm"
      data-theme="dark"
      className={adminFontVars}
      suppressHydrationWarning
      style={{ display: 'flex', minHeight: '100vh', background: 'var(--admin-bg)', color: 'var(--admin-text-main)' }}
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      <div className="adm-fx" aria-hidden="true"><i /><i /><i /></div>
      <AdminAutoRefresh />
      <Sidebar area={session?.area ?? DEFAULT_AREA} />
      <div className="admin-content" style={{ marginLeft: 'calc(var(--admin-sidebar-width, 250px) + 6px)', flex: 1, minWidth: 0, transition: 'margin-left 0.2s ease' }}>
        <Suspense fallback={null}>
          <DateRangeFilter />
        </Suspense>
        {children}
      </div>
    </div>
  )
}
