import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResponsiveTable, type Column } from '@/app/(admin)/admin/analise-suprema/_components/shared'

type Row = { id: string; dia: string; lucro: number }

const columns: Column<Row>[] = [
  { key: 'dia',   header: 'Dia',   render: (r) => r.dia, primary: true },
  { key: 'lucro', header: 'Lucro', render: (r) => `R$ ${r.lucro}`, align: 'right' },
]

const rows: Row[] = [
  { id: '1', dia: '01 · Seg', lucro: 120 },
  { id: '2', dia: '02 · Ter', lucro: 340 },
]

describe('ResponsiveTable', () => {
  it('renderiza os valores das linhas', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={(r) => r.id} />)
    // aparece 2x: uma na tabela (desktop), outra no card (mobile)
    expect(screen.getAllByText('01 · Seg').length).toBe(2)
    expect(screen.getAllByText('R$ 340').length).toBe(2)
  })

  it('renderiza os cabecalhos de coluna', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={(r) => r.id} />)
    expect(screen.getAllByText('Lucro').length).toBeGreaterThan(0)
  })

  it('nao aplica min-width que force scroll horizontal', () => {
    const { container } = render(<ResponsiveTable columns={columns} rows={rows} rowKey={(r) => r.id} />)
    const table = container.querySelector('table')
    expect(table?.style.minWidth).toBe('')
  })

  it('expoe as duas variantes: tabela e cards empilhados', () => {
    const { container } = render(<ResponsiveTable columns={columns} rows={rows} rowKey={(r) => r.id} />)
    expect(container.querySelector('.as-table')).toBeTruthy()
    expect(container.querySelector('.as-cards')).toBeTruthy()
  })

  it('lista vazia mostra mensagem em vez de tabela quebrada', () => {
    render(<ResponsiveTable columns={columns} rows={[]} rowKey={(r) => r.id} emptyLabel="Nada aqui." />)
    expect(screen.getByText('Nada aqui.')).toBeInTheDocument()
  })

  it('usa a primeira coluna como titulo quando nenhuma e marcada primary', () => {
    const semPrimary: Column<Row>[] = [
      { key: 'dia',   header: 'Dia',   render: (r) => r.dia },
      { key: 'lucro', header: 'Lucro', render: (r) => `R$ ${r.lucro}`, align: 'right' },
    ]
    const { container } = render(<ResponsiveTable columns={semPrimary} rows={rows} rowKey={(r) => r.id} />)
    const card = container.querySelector('.as-cards > div')
    expect(card?.textContent).toContain('01 · Seg')
  })
})
