'use client'

import { useState } from 'react'
import type { Automation } from '@/lib/ig/automations'

const inputStyle: React.CSSProperties = {
  width: '100%', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)',
  padding: '8px 12px', fontSize: '13px', color: 'var(--admin-text-main)',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', marginBottom: '5px' }
const fieldsetStyle: React.CSSProperties = { border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '16px' }
const legendStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-main)', padding: '0 4px' }

export function AutomationForm({
  automation,
  action,
}: {
  automation?: Automation
  action: (formData: FormData) => void
}) {
  const [matchType, setMatchType] = useState(automation?.match_type ?? 'contains')

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <label style={labelStyle}>Nome da automação</label>
        <input name="name" defaultValue={automation?.name} required style={inputStyle} placeholder="Ex: Palavra QUERO no Reels do lançamento" />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--admin-text-main)' }}>
        <input type="checkbox" name="active" defaultChecked={automation?.active ?? true} />
        Automação ativa
      </label>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Gatilho</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <input type="checkbox" name="trigger_comment" defaultChecked={automation?.trigger_comment} />
            Comentário em post/reels
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <input type="checkbox" name="trigger_story_reply" defaultChecked={automation?.trigger_story_reply} />
            Resposta a story
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <input type="checkbox" name="trigger_dm" defaultChecked={automation?.trigger_dm} />
            Mensagem direta (DM)
          </label>
        </div>
      </fieldset>

      <div>
        <label style={labelStyle}>Tipo de correspondência</label>
        <select name="match_type" value={matchType} onChange={e => setMatchType(e.target.value as typeof matchType)} style={inputStyle}>
          <option value="contains">Contém a palavra</option>
          <option value="exact">É exatamente a palavra</option>
          <option value="any">Qualquer texto (sem checar palavra)</option>
        </select>
      </div>

      {matchType !== 'any' && (
        <div>
          <label style={labelStyle}>Palavras-chave (separadas por vírgula)</label>
          <input name="keywords" defaultValue={automation?.keywords.join(', ')} style={inputStyle} placeholder="quero, eu quero, link" />
        </div>
      )}

      <div>
        <label style={labelStyle}>ID do post/reels específico (opcional)</label>
        <input name="specific_media_id" defaultValue={automation?.specific_media_id ?? ''} style={inputStyle} placeholder="deixe em branco pra valer em qualquer post" />
        <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>Depois de conectar o Instagram, isso vira um seletor visual dos seus posts.</p>
      </div>

      <div>
        <label style={labelStyle}>Respostas públicas no comentário (1 por linha, sorteia entre elas)</label>
        <textarea name="public_replies" defaultValue={automation?.public_replies.join('\n')} rows={3} style={inputStyle} placeholder={'Já te mandei no direct! 📩\nChegando na sua DM! 🚀'} />
      </div>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>DM de boas-vindas</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <div>
            <label style={labelStyle}>Mensagem</label>
            <textarea name="welcome_message" defaultValue={automation?.welcome_message} required rows={3} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Texto do botão de resposta rápida (opcional)</label>
            <input name="quick_reply_label" defaultValue={automation?.quick_reply_label ?? ''} style={inputStyle} placeholder="Quero o link!" />
            <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>Quando a pessoa toca nesse botão, abre a janela de 24h e dispara o link abaixo.</p>
          </div>
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Link (enviado depois que a pessoa responde)</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <div>
            <label style={labelStyle}>Mensagem</label>
            <textarea name="link_message" defaultValue={automation?.link_message ?? ''} rows={2} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2" style={{ gap: '12px' }}>
            <div>
              <label style={labelStyle}>Texto do botão</label>
              <input name="link_button_label" defaultValue={automation?.link_button_label ?? ''} style={inputStyle} placeholder="Ver agora" />
            </div>
            <div>
              <label style={labelStyle}>URL</label>
              <input name="link_url" defaultValue={automation?.link_url ?? ''} style={inputStyle} placeholder="https://..." />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Lembrete (opcional)</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <div>
            <label style={labelStyle}>Mensagem</label>
            <textarea name="reminder_message" defaultValue={automation?.reminder_message ?? ''} rows={2} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Atraso (minutos depois da DM do link)</label>
            <input type="number" name="reminder_delay_minutes" defaultValue={automation?.reminder_delay_minutes ?? 60} style={inputStyle} />
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        style={{ borderRadius: '8px', background: 'var(--admin-accent)', color: '#fff', fontWeight: 700, padding: '11px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
      >
        {automation ? 'Salvar alterações' : 'Criar automação'}
      </button>
    </form>
  )
}
