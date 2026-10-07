'use client'

import { useEffect, useMemo, useRef } from 'react'
import { QUIZ_MARKUP } from './quiz-markup'
import { initQuiz, type EngineBonus } from './quiz-engine'

export type QuizBonusView = EngineBonus

// A marcação é a do sócio, inserida uma vez; o React não re-renderiza esse
// trecho (as props não mudam), e o engine age sobre ele pelos ids.
export function QuizClient({ bonus, validade }: { bonus: QuizBonusView[]; validade: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const html = useMemo(() => QUIZ_MARKUP.replace('__VALIDADE__', validade), [validade])

  useEffect(() => {
    if (!ref.current) return
    return initQuiz(ref.current, bonus)
  }, [bonus])

  return <div ref={ref} className="jr-quiz" dangerouslySetInnerHTML={{ __html: html }} />
}
