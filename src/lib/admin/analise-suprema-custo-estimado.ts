// Custo estimado para variantes ainda não cadastradas.
//
// Decisão do Matheus em 18/08/2026: não travar a margem esperando o cadastro
// dos últimos 4,5% de itens. Os preços praticados ficam entre R$ 13 e R$ 50.
//
// A estimativa NÃO é gravada em `product_costs`. Se fosse, daqui a um mês
// ninguém distinguiria custo medido de custo chutado, e o cadastro perderia o
// valor de fonte de verdade. Ela vive aqui, é calculada na hora e vem sempre
// acompanhada de `estimated: true` para a UI marcar.
//
// A estimativa é por MODELO, não média global: `flak 2.0` custa mediana de
// R$ 12 e `eye jacket` R$ 50 — usar uma média única erraria os dois por larga
// margem. Só cai na mediana geral quando o modelo não tem nenhum irmão
// cadastrado.

export type CustoResolvido = {
  value: number
  /** true quando veio de estimativa, não de cadastro. A UI é obrigada a marcar. */
  estimated: boolean
  /** Como foi obtido, para explicar na interface. */
  source: 'cadastro' | 'modelo' | 'geral'
}

/** Primeira palavra da chave normalizada — o nome do modelo. */
export function chaveModelo(chaveNormalizada: string): string {
  return chaveNormalizada.split(' ')[0] ?? ''
}

function mediana(v: number[]): number {
  if (!v.length) return 0
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * Índice de medianas por modelo, montado uma vez a partir dos custos reais.
 * Devolve também a mediana geral, usada quando o modelo é desconhecido.
 */
export function indiceDeEstimativa(custos: Map<string, number>): {
  porModelo: Map<string, number>
  geral: number
} {
  const agrupado = new Map<string, number[]>()
  const todos: number[] = []
  for (const [chave, custo] of custos) {
    if (custo <= 0) continue
    todos.push(custo)
    const modelo = chaveModelo(chave)
    if (!modelo) continue
    const lista = agrupado.get(modelo) ?? []
    lista.push(custo)
    agrupado.set(modelo, lista)
  }
  const porModelo = new Map<string, number>()
  for (const [modelo, lista] of agrupado) porModelo.set(modelo, mediana(lista))
  return { porModelo, geral: mediana(todos) }
}

/**
 * Resolve o custo de um item: cadastro primeiro, estimativa só como último
 * recurso. `custoCadastrado` é o que a busca em dois níveis já encontrou.
 */
export function resolverCusto(
  chaveNormalizada: string,
  custoCadastrado: number | null,
  indice: { porModelo: Map<string, number>; geral: number },
): CustoResolvido | null {
  if (custoCadastrado !== null) {
    return { value: custoCadastrado, estimated: false, source: 'cadastro' }
  }
  const doModelo = indice.porModelo.get(chaveModelo(chaveNormalizada))
  if (doModelo !== undefined && doModelo > 0) {
    return { value: doModelo, estimated: true, source: 'modelo' }
  }
  if (indice.geral > 0) {
    return { value: indice.geral, estimated: true, source: 'geral' }
  }
  return null
}
