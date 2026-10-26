import { AutomationForm } from '../../_components/automation-form'
import { createAutomationAction } from '../../actions'

export const metadata = { title: 'Nova automação · Instagram · Just Runner' }

export default function NovaAutomacaoPage() {
  return (
    <div className="px-4 py-6 md:p-8" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '20px' }}>Nova automação</h1>
      <AutomationForm action={createAutomationAction} />
    </div>
  )
}
