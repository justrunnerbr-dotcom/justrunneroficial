import { Unbounded, Manrope, JetBrains_Mono, Geist, Geist_Mono, DM_Sans, DM_Mono } from 'next/font/google'

// Fontes dos três temas do admin. Só as do Prizm (tema padrão) são pré-
// carregadas; as outras baixam quando alguém troca de tema.
//
// 'variable' = um arquivo só com todos os pesos. Com a lista de pesos, o build
// da Vercel falhou em 02/10/2026 (Turbopack: "next/font/google queries have
// exactly one entry" ao resolver os arquivos da JetBrains Mono). DM Mono não
// tem versão variável e segue com os pesos listados.
const unbounded = Unbounded({ subsets: ['latin'], weight: 'variable', variable: '--font-unbounded', display: 'swap' })
const manrope   = Manrope({ subsets: ['latin'], weight: 'variable', variable: '--font-manrope', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: 'variable', variable: '--font-jetbrains', display: 'swap' })
const geist     = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap', preload: false })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap', preload: false })
const dmSans    = DM_Sans({ subsets: ['latin'], weight: 'variable', variable: '--font-dm-sans', display: 'swap', preload: false })
const dmMono    = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono', display: 'swap', preload: false })

export const adminFontVars = [unbounded, manrope, jetbrains, geist, geistMono, dmSans, dmMono].map(f => f.variable).join(' ')
