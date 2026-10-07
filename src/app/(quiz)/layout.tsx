import { Inter_Tight } from 'next/font/google'
import { TrackingProvider } from '@/components/TrackingProvider'

// Layout próprio do quiz: tela cheia, sem cabeçalho/rodapé da loja, mas com o
// rastreamento do site (origem/UTM e page_view). O pixel da Meta já vem do
// layout raiz.
const quizFont = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-quiz', display: 'swap' })

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={quizFont.variable}>
      <TrackingProvider>{children}</TrackingProvider>
    </div>
  )
}
