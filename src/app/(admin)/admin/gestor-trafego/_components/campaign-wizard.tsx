'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle2, Upload, Image as ImageIcon, Video, Loader2 } from 'lucide-react'

type Objective = 'OUTCOME_SALES' | 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS'
type CTA = 'SHOP_NOW' | 'LEARN_MORE' | 'BUY_NOW' | 'GET_OFFER'
type Gender = 'all' | 'male' | 'female'

interface CreativeFile { name: string; size: number }

const OBJECTIVES: { value: Objective; label: string; desc: string }[] = [
  { value: 'OUTCOME_SALES',     label: 'Vendas',    desc: 'Otimiza para compras — ideal para campanhas de produto' },
  { value: 'OUTCOME_TRAFFIC',   label: 'Tráfego',   desc: 'Maximiza cliques para o site' },
  { value: 'OUTCOME_AWARENESS', label: 'Alcance',   desc: 'Mostra para o maior número de pessoas' },
]

const CTAS: { value: CTA; label: string }[] = [
  { value: 'SHOP_NOW',   label: 'Comprar Agora' },
  { value: 'BUY_NOW',    label: 'Compre Já' },
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'GET_OFFER',  label: 'Pegar Oferta' },
]

const fieldStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
  border: '1px solid var(--admin-border)', background: 'var(--admin-bg)',
  color: 'var(--admin-text-main)', outline: 'none', boxSizing: 'border-box' as const,
}
const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', marginBottom: '6px', display: 'block' as const }
const fieldGroup = { marginBottom: '16px' }

interface Page    { id: string; label: string }
interface Account { id: string; label: string }

export function CampaignWizard({ pages = [], accounts = [] }: { pages?: Page[]; accounts?: Account[] }) {
  const router  = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; adId?: string; campaignId?: string; adsetId?: string; creativeId?: string; error?: string } | null>(null)

  const [imagens, setImagens] = useState<CreativeFile[]>([])
  const [videos,  setVideos]  = useState<CreativeFile[]>([])

  // Form state
  const [campName,    setCampName]    = useState('')
  const [objective,   setObjective]   = useState<Objective>('OUTCOME_SALES')
  const [conjName,    setConjName]    = useState('')
  const [budget,      setBudget]      = useState('50')
  const [ageMin,      setAgeMin]      = useState('18')
  const [ageMax,      setAgeMax]      = useState('55')
  const [gender,      setGender]      = useState<Gender>('all')
  const [criativoFile, setCriativoFile] = useState('')
  const [criativoTipo, setCriativoTipo] = useState<'imagem' | 'video'>('imagem')
  const [accountId,    setAccountId]    = useState(() => accounts[0]?.id ?? '')
  const [pageId,       setPageId]       = useState(() => pages[0]?.id ?? '')
  const [adName,      setAdName]      = useState('')
  const [link,        setLink]        = useState('https://justhavefun.com.br/')
  const [message,     setMessage]     = useState('')
  const [headline,    setHeadline]    = useState('')
  const [description, setDescription] = useState('')
  const [cta,         setCta]         = useState<CTA>('SHOP_NOW')

  useEffect(() => {
    fetch('/api/admin/criativos')
      .then(r => r.json())
      .then(d => { setImagens(d.imagens ?? []); setVideos(d.videos ?? []) })
      .catch(() => {})
  }, [])

  const steps = ['Campanha', 'Conjunto', 'Criativo', 'Anúncio', 'Revisar']
  const allFiles = criativoTipo === 'imagem' ? imagens : videos

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/gestor-trafego', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          campanha: { name: campName, objective },
          conjunto: { name: conjName, dailyBudgetBrl: parseFloat(budget), ageMin: parseInt(ageMin), ageMax: parseInt(ageMax), gender },
          criativo: { filename: criativoFile, tipo: criativoTipo },
          anuncio:  { name: adName, link, message, headline, description, cta, pageId },
        }),
      })
      const data = await res.json()
      setResult(data)
      setStep(5)
    } catch {
      setResult({ ok: false, error: 'Erro de conexão' })
      setStep(5)
    } finally {
      setLoading(false)
    }
  }

  const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '28px', marginBottom: '20px' }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '780px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => router.push('/admin/gestor-trafego')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0, marginBottom: '12px' }}>
          <ChevronLeft size={14} /> Gestor de Tráfego
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--admin-text-main)' }}>Nova Campanha</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--admin-text-muted)' }}>Tudo criado em estado PAUSADO — você ativa no Meta quando quiser.</p>
      </div>

      {/* Progress */}
      {step < 5 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '4px', borderRadius: '2px', background: i <= step ? 'var(--admin-accent)' : 'var(--admin-border)', marginBottom: '6px', transition: 'background 0.3s' }} />
              <div style={{ fontSize: '11px', fontWeight: i === step ? 700 : 400, color: i <= step ? 'var(--admin-accent)' : 'var(--admin-text-muted)' }}>{s}</div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 0 — Campanha */}
      {step === 0 && (
        <div style={card}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>1. Campanha</h2>
          {accounts.length > 1 && (
            <div style={fieldGroup}>
              <label style={labelStyle}>Conta de Anúncios</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {accounts.map(a => (
                  <button key={a.id} onClick={() => setAccountId(a.id)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${accountId === a.id ? 'var(--admin-accent)' : 'var(--admin-border)'}`, background: accountId === a.id ? 'rgba(var(--admin-accent-rgb),0.1)' : 'transparent', color: accountId === a.id ? 'var(--admin-accent)' : 'var(--admin-text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                    {a.label}<br /><span style={{ fontSize: '10px', opacity: 0.7 }}>{a.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={fieldGroup}>
            <label style={labelStyle}>Nome da Campanha</label>
            <input style={fieldStyle} value={campName} onChange={e => setCampName(e.target.value)} placeholder="Ex: JHF — Juliet — Vendas — Jun/26" />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Objetivo</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {OBJECTIVES.map(o => (
                <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '8px', border: `1px solid ${objective === o.value ? 'var(--admin-accent)' : 'var(--admin-border)'}`, cursor: 'pointer', background: objective === o.value ? 'rgba(var(--admin-accent-rgb),0.06)' : 'transparent' }}>
                  <input type="radio" value={o.value} checked={objective === o.value} onChange={() => setObjective(o.value)} style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>{o.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{o.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 — Conjunto */}
      {step === 1 && (
        <div style={card}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>2. Conjunto de Anúncios</h2>
          <div style={fieldGroup}>
            <label style={labelStyle}>Nome do Conjunto</label>
            <input style={fieldStyle} value={conjName} onChange={e => setConjName(e.target.value)} placeholder="Ex: BR — 18-45 — Feed + Stories" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Orçamento Diário (R$)</label>
              <input style={fieldStyle} type="number" value={budget} onChange={e => setBudget(e.target.value)} min="5" />
            </div>
            <div>
              <label style={labelStyle}>Idade Mín.</label>
              <input style={fieldStyle} type="number" value={ageMin} onChange={e => setAgeMin(e.target.value)} min="18" max="65" />
            </div>
            <div>
              <label style={labelStyle}>Idade Máx.</label>
              <input style={fieldStyle} type="number" value={ageMax} onChange={e => setAgeMax(e.target.value)} min="18" max="65" />
            </div>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Gênero</label>
            <select style={fieldStyle} value={gender} onChange={e => setGender(e.target.value as Gender)}>
              <option value="all">Todos</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', padding: '10px 12px', background: 'var(--admin-bg)', borderRadius: '8px' }}>
            País fixo: <strong>Brasil</strong> · Posicionamentos: Feed, Stories e Reels do Facebook e Instagram
          </div>
        </div>
      )}

      {/* STEP 2 — Criativo */}
      {step === 2 && (
        <div style={card}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>3. Criativo</h2>
          {pages.length > 1 && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Página do Facebook / Instagram</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {pages.map(p => (
                  <button key={p.id} onClick={() => setPageId(p.id)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${pageId === p.id ? 'var(--admin-accent)' : 'var(--admin-border)'}`, background: pageId === p.id ? 'rgba(var(--admin-accent-rgb),0.1)' : 'transparent', color: pageId === p.id ? 'var(--admin-accent)' : 'var(--admin-text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                    {p.label}<br /><span style={{ fontSize: '10px', opacity: 0.7 }}>{p.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['imagem', 'video'] as const).map(t => (
              <button key={t} onClick={() => { setCriativoTipo(t); setCriativoFile('') }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: `1px solid ${criativoTipo === t ? 'var(--admin-accent)' : 'var(--admin-border)'}`, background: criativoTipo === t ? 'rgba(var(--admin-accent-rgb),0.1)' : 'transparent', color: criativoTipo === t ? 'var(--admin-accent)' : 'var(--admin-text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {t === 'imagem' ? <ImageIcon size={14} /> : <Video size={14} />}
                {t === 'imagem' ? 'Imagem' : 'Vídeo'}
              </button>
            ))}
          </div>
          {allFiles.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', border: '2px dashed var(--admin-border)', borderRadius: '10px', color: 'var(--admin-text-muted)' }}>
              <Upload size={28} style={{ marginBottom: '8px', opacity: 0.4 }} />
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Nenhum arquivo encontrado</div>
              <div style={{ fontSize: '12px' }}>
                Adicione {criativoTipo === 'imagem' ? 'imagens (jpg, png, webp)' : 'vídeos (mp4, mov)'} em:<br />
                <code style={{ color: 'var(--admin-accent)' }}>gestor-trafego/criativos/{criativoTipo === 'imagem' ? 'imagens' : 'videos'}/</code>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {allFiles.map(f => (
                <label key={f.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px', border: `2px solid ${criativoFile === f.name ? 'var(--admin-accent)' : 'var(--admin-border)'}`, borderRadius: '10px', cursor: 'pointer', background: criativoFile === f.name ? 'rgba(var(--admin-accent-rgb),0.06)' : 'var(--admin-bg)', textAlign: 'center' }}>
                  <input type="radio" value={f.name} checked={criativoFile === f.name} onChange={() => setCriativoFile(f.name)} style={{ display: 'none' }} />
                  {criativoTipo === 'imagem' ? <ImageIcon size={28} color={criativoFile === f.name ? 'var(--admin-accent)' : 'var(--admin-text-muted)'} style={{ marginBottom: '8px' }} /> : <Video size={28} color={criativoFile === f.name ? 'var(--admin-accent)' : 'var(--admin-text-muted)'} style={{ marginBottom: '8px' }} />}
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-main)', wordBreak: 'break-all' }}>{f.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{(f.size / 1024).toFixed(0)} KB</div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — Anúncio */}
      {step === 3 && (
        <div style={card}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>4. Copy do Anúncio</h2>
          <div style={fieldGroup}>
            <label style={labelStyle}>Nome do Anúncio (interno)</label>
            <input style={fieldStyle} value={adName} onChange={e => setAdName(e.target.value)} placeholder="Ex: JHF — Juliet — Img01 — Copy A" />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>URL de Destino</label>
            <input style={fieldStyle} value={link} onChange={e => setLink(e.target.value)} placeholder="https://justhavefun.com.br/produto/..." />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Texto Principal (message)</label>
            <textarea style={{ ...fieldStyle, minHeight: '80px', resize: 'vertical' }} value={message} onChange={e => setMessage(e.target.value)} placeholder="Texto que aparece acima do criativo..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Título (headline)</label>
              <input style={fieldStyle} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Ex: Oakley Juliet Original" />
            </div>
            <div>
              <label style={labelStyle}>Descrição</label>
              <input style={fieldStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Leve 2 pelo preço de 1" />
            </div>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Botão de Chamada (CTA)</label>
            <select style={fieldStyle} value={cta} onChange={e => setCta(e.target.value as CTA)}>
              {CTAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* STEP 4 — Revisão */}
      {step === 4 && (
        <div style={card}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>5. Revisar e Criar</h2>
          {[
            { label: 'Conta',      value: accounts.find(a => a.id === accountId)?.label ?? accountId },
            { label: 'Campanha',   value: `${campName} (${objective})` },
            { label: 'Conjunto',   value: `${conjName} — R$ ${budget}/dia — ${ageMin}–${ageMax} anos — ${gender}` },
            { label: 'Página',     value: pages.find(p => p.id === pageId)?.label ?? pageId },
            { label: 'Criativo',   value: `${criativoFile} (${criativoTipo})` },
            { label: 'Anúncio',    value: adName },
            { label: 'URL',        value: link },
            { label: 'Copy',       value: message },
            { label: 'Headline',   value: headline },
            { label: 'CTA',        value: CTAS.find(c => c.value === cta)?.label ?? cta },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--admin-border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', minWidth: '90px' }}>{r.label}</div>
              <div style={{ fontSize: '13px', color: 'var(--admin-text-main)', flex: 1, wordBreak: 'break-all' }}>{r.value || '—'}</div>
            </div>
          ))}
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
            ⚠️ Tudo será criado em estado <strong>PAUSADO</strong>. Você ativa no Gerenciador de Anúncios do Meta quando estiver pronto.
          </div>
        </div>
      )}

      {/* STEP 5 — Resultado */}
      {step === 5 && (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          {loading ? (
            <>
              <Loader2 size={40} color="var(--admin-accent)" style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Criando no Meta...</div>
            </>
          ) : result?.ok ? (
            <>
              <CheckCircle2 size={48} color="#22c55e" style={{ marginBottom: '16px' }} />
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '8px' }}>Campanha criada com sucesso!</div>
              <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginBottom: '24px' }}>Tudo pausado. Ative no Meta Ads Manager quando estiver pronto.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px', textAlign: 'left' }}>
                {[
                  { label: 'Campaign ID', value: result.campaignId },
                  { label: 'Ad Set ID',   value: result.adsetId },
                  { label: 'Creative ID', value: result.creativeId },
                  { label: 'Ad ID',       value: result.adId },
                ].map(r => (
                  <div key={r.label} style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '4px' }}>{r.label}</div>
                    <code style={{ fontSize: '12px', color: 'var(--admin-accent)' }}>{r.value}</code>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/admin/gestor-trafego')} style={{ padding: '10px 24px', background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                Voltar ao Gestor
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>❌</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>Erro ao criar campanha</div>
              <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginBottom: '24px', fontFamily: 'monospace', background: 'var(--admin-bg)', padding: '12px', borderRadius: '8px' }}>{result?.error}</div>
              <button onClick={() => setStep(4)} style={{ padding: '10px 24px', background: 'var(--admin-card)', color: 'var(--admin-text-main)', border: '1px solid var(--admin-border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginRight: '8px' }}>
                Voltar e corrigir
              </button>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      {step < 5 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => step > 0 ? setStep(step - 1) : router.push('/admin/gestor-trafego')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-sec)' }}
          >
            <ChevronLeft size={16} /> {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 0 && !campName) ||
                (step === 1 && (!conjName || !budget)) ||
                (step === 2 && !criativoFile) ||
                (step === 3 && (!adName || !link || !message || !headline))
              }
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, opacity: ((step === 0 && !campName) || (step === 1 && (!conjName || !budget)) || (step === 2 && !criativoFile) || (step === 3 && (!adName || !link || !message || !headline))) ? 0.4 : 1 }}
            >
              Próximo <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
              {loading ? 'Criando...' : 'Criar Campanha no Meta'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
