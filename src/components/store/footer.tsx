'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Lock, ShieldCheck, BadgeCheck, ChevronDown } from 'lucide-react'

const SECURITY_SEALS = [
  { icon: Lock, label: 'Compra 100% Segura' },
  { icon: ShieldCheck, label: 'SSL Certificado' },
  { icon: BadgeCheck, label: 'Site Verificado' },
]

function SealBadge({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
  label: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '68px' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="24" cy="24" r="22.5" fill="none" stroke="#4a4a4a" strokeWidth="1" strokeDasharray="2.2 3" />
          <circle cx="24" cy="24" r="18" fill="#232323" stroke="#4a4a4a" strokeWidth="1" />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} strokeWidth={1.5} color="#e4e4e4" />
        </div>
      </div>
      <span
        style={{
          fontSize: '10px',
          color: '#999',
          textAlign: 'center',
          lineHeight: 1.3,
          fontFamily: 'var(--font-montserrat), sans-serif',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function FooterColumnTitle({
  children,
  isOpen,
  onToggle,
}: {
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="footer-accordion-toggle"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: 'inherit',
        fontWeight: 700,
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: '12px',
        fontFamily: 'var(--font-poppins), sans-serif',
      }}
    >
      {children}
      <ChevronDown
        size={16}
        strokeWidth={2}
        className="footer-accordion-icon"
        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}
      />
    </button>
  )
}

export function Footer() {
  const [atendimentoOpen, setAtendimentoOpen] = useState(false)
  const [pagamentoOpen, setPagamentoOpen] = useState(false)

  return (
    <footer
      style={{
        background: 'var(--color-heading)',
        color: 'var(--color-accent-text)',
        marginTop: '48px',
      }}
    >
      <div className="footer-grid">
        {/* Col 1 — Brand */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-poppins), sans-serif',
              fontWeight: 800,
              fontSize: '16px',
              marginBottom: '10px',
              letterSpacing: '-0.2px',
            }}
          >
            JUST RUNNER
          </div>
          <p
            style={{
              fontSize: '13px',
              color: '#aaa',
              lineHeight: 1.6,
              fontFamily: 'var(--font-montserrat), sans-serif',
              marginBottom: '14px',
            }}
          >
            Óculos de alta performance e estilo para quem vive a vida intensamente.
          </p>
          <div style={{ display: 'flex', gap: '14px' }}>
            <a
              href="https://instagram.com/justhavefun.store"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              style={{ color: '#aaa', transition: 'color 0.2s', display: 'flex' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@jhfstore"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              style={{ color: '#aaa', transition: 'color 0.2s', display: 'flex' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>

        {/* Col 2 — Atendimento */}
        <div>
          <FooterColumnTitle isOpen={atendimentoOpen} onToggle={() => setAtendimentoOpen((v) => !v)}>
            Atendimento
          </FooterColumnTitle>
          <div
            className="footer-accordion-content footer-accordion-flex"
            style={{
              display: atendimentoOpen ? 'flex' : 'none',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '13px',
              color: '#aaa',
              fontFamily: 'var(--font-montserrat), sans-serif',
              lineHeight: 1.6,
            }}
          >
            <span>Seg — Sáb: 9h às 18h</span>
            <a
              href="https://wa.me/5511988766461"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#aaa' }}
            >
              WhatsApp: (11) 98876-6461
            </a>
            <a href="mailto:suportejustrunner@gmail.com" style={{ color: '#aaa' }}>
              suportejustrunner@gmail.com
            </a>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {[
                { href: '/sobre', label: 'Sobre nós' },
                { href: '/faq', label: 'Perguntas frequentes' },
                { href: '/contato', label: 'Contato' },
                { href: '/trocas-e-devolucoes', label: 'Trocas e Devoluções' },
                { href: '/politica-de-privacidade', label: 'Política de Privacidade' },
              ].map((link) => (
                <Link key={link.href} href={link.href} style={{ color: '#aaa' }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3 — Pagamento */}
        <div>
          <FooterColumnTitle isOpen={pagamentoOpen} onToggle={() => setPagamentoOpen((v) => !v)}>
            Pagamento Seguro
          </FooterColumnTitle>

          <div className="footer-accordion-content footer-accordion-block" style={{ display: pagamentoOpen ? 'block' : 'none' }}>
            {/* Selos de segurança */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              {SECURITY_SEALS.map(({ icon, label }) => (
                <SealBadge key={label} icon={icon} label={label} />
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Diners', 'Boleto', 'Pix'].map((m) => (
                <span
                  key={m}
                  style={{
                    border: '1px solid #3a3a3a',
                    borderRadius: '4px',
                    padding: '3px 9px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ccc',
                    fontFamily: 'var(--font-montserrat), sans-serif',
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#666', fontFamily: 'var(--font-montserrat), sans-serif', lineHeight: 1.6 }}>
              Checkout 100% seguro via Yampi.
              <br />
              Entregamos para todo o Brasil.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <span style={{ fontSize: '12px', color: '#555', fontFamily: 'var(--font-montserrat), sans-serif' }}>
          © 2026 Just Runner Store - Óculos. CNPJ: 62.880.024/0001-30
        </span>
        <span style={{ fontSize: '11px', color: '#444', fontFamily: 'var(--font-montserrat), sans-serif' }}>
          Av. Aparecida do Rio Negro, 368 — Piqueri, SP — CEP 05144-085
        </span>
      </div>
    </footer>
  )
}
