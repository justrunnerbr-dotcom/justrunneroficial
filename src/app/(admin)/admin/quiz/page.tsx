import { getAdminSupabase } from '@/lib/admin-client'
import { checkAuth } from '@/lib/admin/auth'
import { fetchAllRows } from '@/lib/admin/supabase-pagination'
import type { QuizRow } from '@/lib/quiz/analise'
import { QuizAdminClient } from './_components/quiz-admin-client'

export const metadata = { title: 'Quiz · Just Runner Admin' }
export const dynamic = 'force-dynamic'

// Respostas do quiz do cliente (/quiz). A tabela tem contato de cliente e RLS
// sem política: só o servidor (service_role) lê, e só depois do checkAuth.
export default async function QuizAdminPage() {
  if (!(await checkAuth())) return null
  const db = getAdminSupabase()
  let rows: QuizRow[] = []
  let erro: string | null = null
  try {
    rows = await fetchAllRows<QuizRow>((from, to) => db.from('quiz_respostas')
      .select('id, created_at, completo, respostas, nome, whatsapp, email, cidade, estado, faixa_idade, modelo_brinde, cupom, utm_source, utm_campaign')
      .order('created_at', { ascending: false })
      .range(from, to))
  } catch (e) {
    console.error('[admin/quiz] leitura falhou:', e)
    erro = 'Não foi possível ler as respostas agora.'
  }
  return <QuizAdminClient rows={rows} erro={erro} />
}
