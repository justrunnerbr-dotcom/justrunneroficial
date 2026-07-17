const PAGE_SIZE = 1000

// O PostgREST deste projeto tem um teto de 1000 linhas por request que ignora
// silenciosamente qualquer .limit() maior pedido no código — qualquer leitura de
// linhas (não count:'exact'/head:true) num dia/período com mais de 1000 linhas
// fica truncada, e sem .order() explícito a amostra de 1000 nem é confiável
// (pode enviesar pros registros mais antigos do período). Pagina com .range()
// até esgotar as páginas.
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error('[fetchAllRows] página falhou, parando paginação:', error)
      break
    }
    const page = data ?? []
    all.push(...page)
    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}
