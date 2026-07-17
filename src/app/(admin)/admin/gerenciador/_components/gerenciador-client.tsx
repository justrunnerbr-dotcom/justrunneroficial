'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Layers, Rows3, Image as ImageIcon, Play, Pause, ChevronDown, ChevronUp, Filter, X } from 'lucide-react'
import type { GerenciadorData, GerenciadorRow, GerenciadorAccount } from '@/lib/admin/gerenciador'

type TabKey = 'campanhas' | 'conjuntos' | 'anuncios'
type SortKey = 'name' | 'dailyBudget' | 'spend' | 'sessions' | 'conversionRate' | 'metaResults' | 'orders'
type StatusFilter = 'all' | 'ACTIVE' | 'PAUSED'

const TABS: { key: TabKey; label: string; icon: typeof Layers }[] = [
  { key: 'campanhas', label: 'Campanhas',            icon: Layers },
  { key: 'conjuntos', label: 'Conjuntos de anúncios', icon: Rows3 },
  { key: 'anuncios',  label: 'Anúncios',              icon: ImageIcon },
]

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all',    label: 'Todos' },
  { key: 'ACTIVE', label: 'Ativos' },
  { key: 'PAUSED', label: 'Pausados' },
]

const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtInt = (n: number) => n.toLocaleString('pt-BR')
const fmtPct = (n: number) => n > 0 ? `${n.toFixed(2)}%` : '—'

function MetaBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '16px', height: '16px', borderRadius: '4px', background: '#1877F2',
      color: '#fff', fontSize: '10px', fontWeight: 800, flexShrink: 0,
    }}>f</span>
  )
}

function StatusToggle({ status, pending, onToggle }: { status: string; pending: boolean; onToggle: (e: React.MouseEvent) => void }) {
  const isActive = status === 'ACTIVE'
  const isKnown  = status === 'ACTIVE' || status === 'PAUSED'
  if (!isKnown) {
    return <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{status || '—'}</span>
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      title={isActive ? 'Pausar' : 'Ativar'}
      style={{
        position: 'relative', width: '38px', height: '20px', borderRadius: '99px',
        border: 'none', cursor: pending ? 'wait' : 'pointer',
        background: isActive ? '#16a34a' : 'var(--admin-border)',
        opacity: pending ? 0.6 : 1,
        transition: 'background 0.15s ease',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '2px', left: isActive ? '20px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'left 0.15s ease',
      }}>
        {isActive ? <Play size={8} fill="#16a34a" color="#16a34a" /> : <Pause size={8} fill="#8a9791" color="#8a9791" />}
      </span>
    </button>
  )
}

function budgetDisplay(row: GerenciadorRow, tab: TabKey): string {
  if (tab === 'anuncios') return '—'
  if (row.dailyBudget && row.dailyBudget > 0) return `${fmtBrl.format(row.dailyBudget)} /dia`
  return tab === 'campanhas' ? 'Orçamento de conjunto' : '—'
}

function SortableTh({
  label, active, dir, onClick, align = 'left',
}: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void; align?: 'left' | 'right' }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: '10px 14px', textAlign: align, fontWeight: 600,
        color: active ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10px',
        whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        {label}
        {active ? (dir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />) : null}
      </span>
    </th>
  )
}

function StatusFilterTh({
  value, onChange,
}: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10px', position: 'relative' }}>
      <div ref={ref} style={{ display: 'inline-block', position: 'relative' }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, color: value !== 'all' ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
            fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px',
          }}
        >
          Status
          <Filter size={11} />
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
            background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px',
            padding: '4px', minWidth: '120px', boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
          }}>
            {STATUS_OPTIONS.map(opt => (
              <div
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false) }}
                style={{
                  padding: '7px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                  textTransform: 'none', letterSpacing: 0,
                  color: value === opt.key ? 'var(--admin-accent)' : 'var(--admin-text-sec)',
                  background: value === opt.key ? 'rgba(var(--admin-accent-rgb), 0.10)' : 'transparent',
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </th>
  )
}

function computeTotals(rows: GerenciadorRow[]) {
  const spend       = rows.reduce((s, r) => s + r.spend, 0)
  const sessions    = rows.reduce((s, r) => s + r.sessions, 0)
  const orders      = rows.reduce((s, r) => s + r.orders, 0)
  const metaResults = rows.reduce((s, r) => s + r.metaResults, 0)
  return { spend, sessions, orders, metaResults, conversionRate: sessions > 0 ? (orders / sessions) * 100 : 0 }
}

const EMPTY_SETS: Record<TabKey, Set<string>> = { campanhas: new Set(), conjuntos: new Set(), anuncios: new Set() }
const EMPTY_BOOLS: Record<TabKey, boolean> = { campanhas: false, conjuntos: false, anuncios: false }

// Filtra em cascata: selecionar campanha(s) restringe os conjuntos/anúncios
// dela nas outras abas; selecionar conjunto(s) restringe os anúncios ainda mais.
function cascadeRows(
  allRows:              Record<TabKey, GerenciadorRow[]>,
  key:                  TabKey,
  account:              string,
  selectedCampaignNames: Set<string> | null,
  selectedAdsetNames:    Set<string> | null,
): GerenciadorRow[] {
  const base = allRows[key].filter(r => r.accountName === account)
  if (key === 'conjuntos' && selectedCampaignNames) {
    return base.filter(r => r.campaignName && selectedCampaignNames.has(r.campaignName))
  }
  if (key === 'anuncios') {
    let b = base
    if (selectedCampaignNames) b = b.filter(r => r.campaignName && selectedCampaignNames.has(r.campaignName))
    if (selectedAdsetNames)    b = b.filter(r => r.adsetName && selectedAdsetNames.has(r.adsetName))
    return b
  }
  return base
}

export function GerenciadorClient({ data, rangeLabel }: { data: GerenciadorData; rangeLabel: string }) {
  const accounts: GerenciadorAccount[] = data.accounts
  const [tab, setTab]       = useState<TabKey>('campanhas')
  const [query, setQuery]   = useState('')
  const [account, setAccount] = useState<string>(accounts[0]?.name ?? '')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [rows, setRows]     = useState<Record<TabKey, GerenciadorRow[]>>({
    campanhas: data.campanhas.rows,
    conjuntos: data.conjuntos.rows,
    anuncios:  data.anuncios.rows,
  })
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)

  // Seleção por aba — selecionar campanha(s) filtra em cascata os conjuntos e
  // anúncios dela nas outras abas (clicar numa campanha = "abrir" ela).
  const [selectedByTab, setSelectedByTab]     = useState<Record<TabKey, Set<string>>>(EMPTY_SETS)
  const [onlySelectedByTab, setOnlySelected]  = useState<Record<TabKey, boolean>>(EMPTY_BOOLS)

  function switchTab(next: TabKey) {
    setTab(next)
    setQuery('')
  }

  function switchAccount(next: string) {
    setAccount(next)
    setSelectedByTab(EMPTY_SETS)
    setOnlySelected(EMPTY_BOOLS)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const selected     = selectedByTab[tab]
  const onlySelected = onlySelectedByTab[tab]

  function setSelectedForTab(next: Set<string>) {
    setSelectedByTab(prev => ({ ...prev, [tab]: next }))
  }
  function setOnlySelectedForTab(next: boolean) {
    setOnlySelected(prev => ({ ...prev, [tab]: next }))
  }

  // Nomes das campanhas/conjuntos selecionados — usados pra filtrar em
  // cascata as abas "abaixo" (campanha → conjuntos → anúncios).
  const selectedCampaignNames = useMemo(() => {
    const ids = selectedByTab.campanhas
    if (ids.size === 0) return null
    return new Set(rows.campanhas.filter(r => ids.has(r.id) && r.accountName === account).map(r => r.name))
  }, [rows.campanhas, selectedByTab.campanhas, account])

  const selectedAdsetNames = useMemo(() => {
    const ids = selectedByTab.conjuntos
    if (ids.size === 0) return null
    return new Set(rows.conjuntos.filter(r => ids.has(r.id) && r.accountName === account).map(r => r.name))
  }, [rows.conjuntos, selectedByTab.conjuntos, account])

  const scopedRows = useMemo(
    () => cascadeRows(rows, tab, account, selectedCampaignNames, selectedAdsetNames),
    [rows, tab, account, selectedCampaignNames, selectedAdsetNames],
  )

  // Linhas visíveis antes do filtro "só selecionados" — usadas pro checkbox
  // do cabeçalho (selecionar/limpar tudo que está visível agora).
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scopedRows
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .filter(r => !q || r.name.toLowerCase().includes(q) || (r.parentLabel ?? '').toLowerCase().includes(q))
  }, [scopedRows, query, statusFilter])

  const filtered = useMemo(() => {
    const base = onlySelected ? visibleRows.filter(r => selected.has(r.id)) : visibleRows
    return [...base].sort((a, b) => {
      if (sortKey === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      const av = sortKey === 'dailyBudget' ? (a.dailyBudget ?? -1) : a[sortKey]
      const bv = sortKey === 'dailyBudget' ? (b.dailyBudget ?? -1) : b[sortKey]
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [visibleRows, onlySelected, selected, sortKey, sortDir])

  const totals = useMemo(() => computeTotals(filtered), [filtered])

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(r => selected.has(r.id))

  function toggleSelectAll() {
    const next = new Set(selected)
    if (allVisibleSelected) {
      for (const r of visibleRows) next.delete(r.id)
    } else {
      for (const r of visibleRows) next.add(r.id)
    }
    setSelectedForTab(next)
  }

  function toggleSelectRow(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedForTab(next)
  }

  async function handleToggle(row: GerenciadorRow) {
    const nextStatus = row.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    const verb = nextStatus === 'ACTIVE' ? 'ativar' : 'pausar'
    if (!window.confirm(`Tem certeza que quer ${verb} "${row.name}"? Isso muda o status direto no Meta Ads.`)) return

    setErrorMsg(null)
    setPendingId(row.id)
    setRows(prev => ({ ...prev, [tab]: prev[tab].map(r => r.id === row.id ? { ...r, status: nextStatus } : r) }))

    try {
      const res = await fetch('/api/admin/meta-ads/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status: nextStatus }),
      })
      const result = await res.json() as { ok: boolean; error?: string }
      if (!result.ok) throw new Error(result.error ?? 'Falha ao atualizar status')
    } catch (err) {
      setRows(prev => ({ ...prev, [tab]: prev[tab].map(r => r.id === row.id ? { ...r, status: row.status } : r) }))
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao atualizar status')
    } finally {
      setPendingId(null)
    }
  }

  const nameCol  = tab === 'campanhas' ? 'Nome da campanha' : tab === 'conjuntos' ? 'Nome do conjunto de anúncios' : 'Nome do anúncio'
  const searchPh = tab === 'campanhas' ? 'Pesquisar campanha...' : tab === 'conjuntos' ? 'Pesquisar conjunto...' : 'Pesquisar anúncio...'

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1500px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Gerenciador</h1>
        <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>{rangeLabel} · Meta Ads</div>
      </div>

      {/* Contas de anúncio */}
      {accounts.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
          {accounts.map(acc => {
            const active = account === acc.name
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => switchAccount(acc.name)}
                style={{
                  padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', border: `1px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                  background: active ? 'rgba(var(--admin-accent-rgb), 0.12)' : 'var(--admin-card)',
                  color: active ? 'var(--admin-accent)' : 'var(--admin-text-sec)',
                }}
              >
                {acc.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '420px' }}>
        <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPh}
          style={{
            width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px',
            background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-main)', fontSize: '13px', outline: 'none',
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--admin-border)' }}>
        {TABS.map(t => {
          const Icon   = t.icon
          const active = tab === t.key
          const count  = cascadeRows(rows, t.key, account, selectedCampaignNames, selectedAdsetNames).length
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                color: active ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                borderBottom: active ? '2px solid var(--admin-accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <Icon size={14} />
              {t.label}
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '99px',
                background: active ? 'rgba(var(--admin-accent-rgb), 0.15)' : 'var(--admin-card-hover)',
                color: active ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {errorMsg && (
        <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px' }}>
          {errorMsg}
        </div>
      )}

      {/* Filtro em cascata vindo de abas anteriores (campanha → conjunto) */}
      {(tab === 'conjuntos' || tab === 'anuncios') && selectedCampaignNames && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
            color: 'var(--admin-accent)', background: 'rgba(var(--admin-accent-rgb), 0.10)',
            padding: '5px 10px', borderRadius: '99px',
          }}>
            Campanha: {selectedCampaignNames.size === 1 ? [...selectedCampaignNames][0] : `${selectedCampaignNames.size} selecionadas`}
            <X
              size={12}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedByTab(prev => ({ ...prev, campanhas: new Set() }))}
            />
          </span>
        </div>
      )}
      {tab === 'anuncios' && selectedAdsetNames && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
            color: 'var(--admin-accent)', background: 'rgba(var(--admin-accent-rgb), 0.10)',
            padding: '5px 10px', borderRadius: '99px',
          }}>
            Conjunto: {selectedAdsetNames.size === 1 ? [...selectedAdsetNames][0] : `${selectedAdsetNames.size} selecionados`}
            <X
              size={12}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedByTab(prev => ({ ...prev, conjuntos: new Set() }))}
            />
          </span>
        </div>
      )}

      {/* Barra de seleção da aba atual — só aparece quando algo está marcado */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px',
          padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(var(--admin-accent-rgb), 0.08)', border: '1px solid rgba(var(--admin-accent-rgb), 0.25)',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-accent)' }}>
            {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={() => setOnlySelectedForTab(!onlySelected)}
            style={{
              fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '7px', cursor: 'pointer',
              border: `1px solid ${onlySelected ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              background: onlySelected ? 'var(--admin-accent)' : 'var(--admin-bg)',
              color: onlySelected ? '#fff' : 'var(--admin-text-sec)',
            }}
          >
            {onlySelected ? 'Vendo somente selecionados' : 'Analisar somente selecionados'}
          </button>
          {tab !== 'anuncios' && (
            <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
              {tab === 'campanhas' ? 'A seleção também filtra Conjuntos e Anúncios' : 'A seleção também filtra Anúncios'}
            </span>
          )}
          <button
            type="button"
            onClick={() => { setSelectedForTab(new Set()); setOnlySelectedForTab(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--admin-text-muted)',
              background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto',
            }}
          >
            <X size={13} /> Limpar seleção
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ padding: '10px 14px', width: '32px' }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <StatusFilterTh value={statusFilter} onChange={setStatusFilter} />
                <SortableTh label={nameCol}            active={sortKey === 'name'}           dir={sortDir} onClick={() => handleSort('name')} />
                <SortableTh label="Orçamento"           active={sortKey === 'dailyBudget'}    dir={sortDir} onClick={() => handleSort('dailyBudget')} />
                <SortableTh label="Gasto"               active={sortKey === 'spend'}          dir={sortDir} onClick={() => handleSort('spend')} />
                <SortableTh label="Sessões"             active={sortKey === 'sessions'}       dir={sortDir} onClick={() => handleSort('sessions')} />
                <SortableTh label="Taxa de conversão"   active={sortKey === 'conversionRate'} dir={sortDir} onClick={() => handleSort('conversionRate')} />
                <SortableTh label="Vendas"               active={sortKey === 'metaResults'}    dir={sortDir} onClick={() => handleSort('metaResults')} />
                <SortableTh label="Vendas Total"         active={sortKey === 'orders'}         dir={sortDir} onClick={() => handleSort('orders')} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const isSelected = selected.has(row.id)
                const isDrillable = tab !== 'anuncios'
                return (
                  <tr
                    key={row.id}
                    onClick={() => toggleSelectRow(row.id)}
                    title={isDrillable ? 'Clique para filtrar as abas seguintes por este item' : undefined}
                    style={{
                      borderBottom: '1px solid var(--admin-border)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(var(--admin-accent-rgb), 0.06)' : undefined,
                    }}
                  >
                    <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(row.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      <StatusToggle status={row.status} pending={pendingId === row.id} onToggle={(e) => { e.stopPropagation(); handleToggle(row) }} />
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {tab === 'anuncios' ? (
                          <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', background: 'var(--admin-bg)', flexShrink: 0 }}>
                            {row.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- thumbnail vem direto da CDN do Meta, dinâmico por anúncio
                              <img src={row.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ImageIcon size={14} color="var(--admin-text-muted)" />
                              </div>
                            )}
                            <span style={{ position: 'absolute', bottom: '-3px', right: '-3px' }}>
                              <MetaBadge />
                            </span>
                          </div>
                        ) : (
                          <MetaBadge />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--admin-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.name}>
                            {row.name}
                          </div>
                          {row.parentLabel && (
                            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.parentLabel}>
                              {row.parentLabel}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{budgetDisplay(row, tab)}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--admin-text-main)', whiteSpace: 'nowrap' }}>{row.spend > 0 ? fmtBrl.format(row.spend) : '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtInt(row.sessions)}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtPct(row.conversionRate)}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--admin-text-sec)', whiteSpace: 'nowrap' }}>{fmtInt(row.metaResults)}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--admin-text-main)', whiteSpace: 'nowrap' }}>{fmtInt(row.orders)}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                  Nenhum resultado no período.
                </td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--admin-bg)', borderTop: '2px solid var(--admin-border)' }}>
                  <td colSpan={3} style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
                    Total ({filtered.length})
                  </td>
                  <td />
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--admin-text-main)' }}>{fmtBrl.format(totals.spend)}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{fmtInt(totals.sessions)}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{fmtPct(totals.conversionRate)}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{fmtInt(totals.metaResults)}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{fmtInt(totals.orders)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
