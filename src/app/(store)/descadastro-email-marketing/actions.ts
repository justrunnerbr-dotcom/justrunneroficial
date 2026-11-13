'use server'

import { recordOptout, emailValido, normalizarEmail } from '@/lib/mkt/optout'

export async function confirmarDescadastroAction(email: string): Promise<{ ok: boolean; erro?: string }> {
  const e = normalizarEmail(email)
  if (!emailValido(e)) return { ok: false, erro: 'E-mail inválido.' }
  try {
    await recordOptout({ email: e, reason: 'descadastro pelo link do e-mail' })
    return { ok: true }
  } catch {
    return { ok: false, erro: 'Não foi possível concluir agora. Tente de novo em instantes.' }
  }
}
