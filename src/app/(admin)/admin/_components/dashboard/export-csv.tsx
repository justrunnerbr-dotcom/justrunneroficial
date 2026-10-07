'use client'
import { registrarExportacao } from './actions'

export const METRICS_VERSION = 'dashboard-v1 (30/09/2026)'

export interface CsvMeta {
  /** Nome da tabela, vira o nome do arquivo. */
  table:    string
  period:   string
  sources:  string
  coverage?: string
}

function cell(v: string | number | null): string {
  if (v === null) return ''
  // Número vai no formato brasileiro para o Excel abrir certo com separador ";".
  const s = typeof v === 'number' ? v.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: 4 }) : v
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV com cabeçalho de contexto (período, fuso, moeda, fontes, cobertura e
 *  versão das métricas), separador ";" e BOM para o Excel ler os acentos. */
export function ExportCsvButton({ meta, header, rows }: { meta: CsvMeta; header: string[]; rows: (string | number | null)[][] }) {
  function exportar() {
    const lines = [
      `# ${meta.table}`,
      `# Período: ${meta.period}`,
      '# Fuso: America/Sao_Paulo · Moeda: BRL',
      `# Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      `# Fontes: ${meta.sources}`,
      ...(meta.coverage ? [`# Cobertura: ${meta.coverage}`] : []),
      `# Versão das métricas: ${METRICS_VERSION}`,
      header.map(cell).join(';'),
      ...rows.map(r => r.map(cell).join(';')),
    ]
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meta.table.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    void registrarExportacao(meta.table, meta.period, rows.length)
  }

  return <button type="button" className="dsh-btn" onClick={exportar}>Exportar CSV</button>
}
