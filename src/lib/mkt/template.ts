/** Substitui {{variavel}} pelo valor real. Variável sem valor vira string vazia
 *  (nunca deixa "{{var}}" cru aparecer para o cliente). */
export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>): string {
  return body.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key]
    return v == null ? '' : String(v)
  })
}

export function detectVariables(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g)].map(m => m[1]))]
}

/** Valores de exemplo para prévia e envio de teste (sem contato real). */
export function varsExemplo(email: string, linkSite: string): Record<string, string | number> {
  return { email, nome: 'João Silva', primeiro_nome: 'João', dias_sumido: 47, ultima_compra_data: '26/09/2026', link_site: linkSite }
}
