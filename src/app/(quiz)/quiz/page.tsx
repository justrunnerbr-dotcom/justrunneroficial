import type { Metadata } from 'next'
import { getAdminSupabase } from '@/lib/admin-client'
import { QUIZ_BONUS, QUIZ_VALIDADE_LABEL, QUIZ_PRECO_REFERENCIA } from '@/lib/quiz/bonus'
import { QuizClient, type QuizBonusView } from './quiz-client'
import './quiz.css'

// Página escondida: fora do menu e fora do Google. Só abre quem tem o link.
export const metadata: Metadata = {
  title: 'Quiz Just Runner',
  robots: { index: false, follow: false },
}

export const revalidate = 3600

export default async function QuizPage() {
  const db = getAdminSupabase()
  const { data: imgs } = await db.from('images')
    .select('variant_id, url, position')
    .in('variant_id', QUIZ_BONUS.map(b => b.variantId))
    .order('position')
  const fotoDe = (variantId: string) => imgs?.find(i => i.variant_id === variantId)?.url ?? null

  const bonus: QuizBonusView[] = QUIZ_BONUS.map(b => ({
    id: b.id, nome: b.nome, imagem: fotoDe(b.variantId), precoOriginal: QUIZ_PRECO_REFERENCIA,
  }))
  return <QuizClient bonus={bonus} validade={QUIZ_VALIDADE_LABEL} />
}
