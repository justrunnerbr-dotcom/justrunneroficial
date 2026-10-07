import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DivergingBarChart, SequentialLineChart } from '@/app/(admin)/admin/analise-suprema/_components/charts'

const brl = (value: number) => `R$ ${value.toFixed(2)}`

describe('Gráficos da Análise Suprema', () => {
  it('apresenta ausência de dados sem SVG inválido', () => {
    const { container } = render(<DivergingBarChart data={[]} formatValue={brl} />)
    expect(screen.getByRole('status')).toHaveTextContent('Sem dados')
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
  })

  it('mantém o eixo na unidade da série financeira', () => {
    render(<SequentialLineChart data={[{ label: 'Hoje', value: 150 }]} formatValue={brl} seriesLabel="Lucro" />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Lucro ao longo do período')
    expect(screen.getByText('R$ 150.00')).toBeInTheDocument()
    expect(screen.queryByText('150.0x')).not.toBeInTheDocument()
  })

  it('permite consultar uma barra pelo teclado', () => {
    render(<DivergingBarChart data={[{ label: '29/09', value: -200 }]} formatValue={brl} />)
    fireEvent.focus(screen.getByRole('button', { name: '29/09: R$ -200.00' }))
    expect(screen.getByText('29/09')).toBeInTheDocument()
  })

  it('aceita série zerada sem coordenadas inválidas', () => {
    const { container } = render(<SequentialLineChart data={[{ label: 'Hoje', value: 0 }]} formatValue={brl} />)
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
  })
})
