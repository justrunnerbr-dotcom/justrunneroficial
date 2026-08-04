import { CampaignWizard } from '../_components/campaign-wizard'
import { checkAuth } from '@/lib/admin/auth'

export default async function NovaCampanha() {
  if (!(await checkAuth())) return null

  const accounts = [
    process.env.META_AD_ACCOUNT_ID_1 ? { id: process.env.META_AD_ACCOUNT_ID_1, label: 'Conta 1' } : null,
    process.env.META_AD_ACCOUNT_ID_2 ? { id: process.env.META_AD_ACCOUNT_ID_2, label: 'Conta 2' } : null,
    process.env.META_AD_ACCOUNT_ID_3 ? { id: process.env.META_AD_ACCOUNT_ID_3, label: 'Conta 3' } : null,
  ].filter(Boolean) as { id: string; label: string }[]

  const pages = [
    process.env.META_PAGE_ID_1 ? { id: process.env.META_PAGE_ID_1, label: 'Página 1' } : null,
    process.env.META_PAGE_ID_2 ? { id: process.env.META_PAGE_ID_2, label: 'Página 2' } : null,
  ].filter(Boolean) as { id: string; label: string }[]

  return <CampaignWizard accounts={accounts} pages={pages} />
}
