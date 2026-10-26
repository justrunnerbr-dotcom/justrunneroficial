import { notFound } from 'next/navigation'
import { getAutomation } from '@/lib/ig/automations'
import { AutomationForm } from '../../_components/automation-form'
import { updateAutomationAction } from '../../actions'

export const metadata = { title: 'Editar automação · Instagram · Just Runner' }

export default async function EditarAutomacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const automation = await getAutomation(id)
  if (!automation) notFound()

  const action = updateAutomationAction.bind(null, id)

  return (
    <div className="px-4 py-6 md:p-8" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '20px' }}>Editar automação</h1>
      <AutomationForm automation={automation} action={action} />
    </div>
  )
}
