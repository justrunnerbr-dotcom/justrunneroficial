'use client'
import { useState } from 'react'
import { metaLead } from '@/lib/meta'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, CheckCircle } from 'lucide-react'

const WA_URL =
  'https://wa.me/5511988766461?text=Ol%C3%A1%21%20Tenho%20uma%20d%C3%BAvida%20sobre%20os%20%C3%B3culos%20da%20Just%20Runner.'

export default function ContatoPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    // Simulate async — in production, POST to an API route or email service
    await new Promise((resolve) => setTimeout(resolve, 800))
    metaLead({ content_name: 'Formulário de Contato', content_category: 'Suporte' })
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div style={{ padding: '64px 0' }}>
      <div className="page-width" style={{ maxWidth: '560px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 40px)',
            color: 'var(--color-heading)',
            marginBottom: '12px',
          }}
        >
          Contato
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-muted)',
            marginBottom: '32px',
            fontFamily: 'var(--font-montserrat), sans-serif',
            lineHeight: 1.6,
          }}
        >
          Tem alguma dúvida? Preencha o formulário abaixo e entraremos em contato em até 24 horas.
        </p>

        {/* WhatsApp CTA */}
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '40px',
            textDecoration: 'none',
            transition: 'border-color 0.15s',
          }}
        >
          <span style={{ flexShrink: 0, background: '#25D366', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </span>
          <div>
            <div style={{ fontFamily: 'var(--font-poppins), sans-serif', fontWeight: 700, fontSize: '14px', color: '#15803d', marginBottom: '2px' }}>
              Resposta rápida pelo WhatsApp
            </div>
            <div style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontSize: '13px', color: '#166534' }}>
              (11) 98876-6461 · Seg–Sáb, 9h às 18h
            </div>
          </div>
        </a>

        {submitted ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '48px 0',
              textAlign: 'center',
            }}
          >
            <CheckCircle size={48} strokeWidth={1.5} color="var(--color-heading)" />
            <h2
              style={{
                fontFamily: 'var(--font-poppins), sans-serif',
                fontWeight: 700,
                fontSize: '20px',
                color: 'var(--color-heading)',
              }}
            >
              Mensagem enviada!
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-muted)',
                fontFamily: 'var(--font-montserrat), sans-serif',
              }}
            >
              Retornaremos em breve.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <label
                htmlFor="nome"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                  color: 'var(--color-heading)',
                  fontFamily: 'var(--font-poppins), sans-serif',
                }}
              >
                Nome
              </label>
              <Input id="nome" name="nome" placeholder="Seu nome completo" required />
            </div>

            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                  color: 'var(--color-heading)',
                  fontFamily: 'var(--font-poppins), sans-serif',
                }}
              >
                Email
              </label>
              <Input id="email" name="email" type="email" placeholder="seu@email.com" required />
            </div>

            <div>
              <label
                htmlFor="assunto"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                  color: 'var(--color-heading)',
                  fontFamily: 'var(--font-poppins), sans-serif',
                }}
              >
                Assunto
              </label>
              <Input id="assunto" name="assunto" placeholder="Como podemos ajudar?" required />
            </div>

            <div>
              <label
                htmlFor="mensagem"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                  color: 'var(--color-heading)',
                  fontFamily: 'var(--font-poppins), sans-serif',
                }}
              >
                Mensagem
              </label>
              <textarea
                id="mensagem"
                name="mensagem"
                placeholder="Escreva sua mensagem aqui..."
                required
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-montserrat), sans-serif',
                  color: 'var(--color-foreground)',
                  background: 'transparent',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              />
            </div>

            <Button type="submit" fullWidth size="lg" disabled={loading}>
              <Send size={16} strokeWidth={1.5} style={{ marginRight: '8px' }} />
              {loading ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
