const PAGE_SIZE = 1000

/** Teto de ids por `.in()`.
 *
 *  Com um mês inteiro de pedidos (centenas de ids) o `.in()` de uma vez só
 *  monta uma URL de mais de 15 KB. A requisição falha (o erro volta em header
 *  e estoura o parser do fetch) e o cliente devolve `data: null` sem lançar —
 *  na tela isso vira "nenhum item"/"sem custo", que passa por resultado
 *  válido. Quebrar em lotes evita isso conforme o período cresce. */
export const IN_CHUNK_SIZE = 100

export function chunkIds<T>(ids: T[], size: number = IN_CHUNK_SIZE): T[][] {
  const out: T[][] = []
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size))
  return out
}

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
