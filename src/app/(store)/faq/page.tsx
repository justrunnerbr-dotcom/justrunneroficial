'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'Os produtos são originais?',
    answer:
      'Sim, todos os produtos vendidos na Just Runner são 100% originais. Trabalhamos apenas com fornecedores autorizados e garantimos a autenticidade de cada item.',
  },
  {
    question: 'Qual o prazo de entrega?',
    answer:
      'O prazo de entrega varia de acordo com a sua localização. Em geral, capitais recebem em 3 a 5 dias úteis, e interior em até 10 dias úteis após a confirmação do pagamento.',
  },
  {
    question: 'Como funciona o checkout?',
    answer:
      'Ao clicar em "Comprar Agora" ou "Finalizar Compra", você será redirecionado para nossa plataforma de pagamento segura (Yampi), onde poderá pagar com cartão de crédito, boleto ou Pix.',
  },
  {
    question: 'Posso trocar ou devolver um produto?',
    answer:
      'Sim. Você tem até 7 dias corridos após o recebimento para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor. Entre em contato pelo nosso WhatsApp.',
  },
  {
    question: 'O frete é grátis?',
    answer:
      'Oferecemos frete grátis para compras acima de um valor mínimo. Consulte o valor atual no banner do site. Para compras abaixo desse valor, o frete é calculado no checkout.',
  },
  {
    question: 'Como entro em contato com o suporte?',
    answer:
      'Você pode falar conosco pelo formulário na página de contato ou pelo WhatsApp. Respondemos em horário comercial, de segunda a sábado.',
  },
]

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-border)',
        padding: '0',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '16px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 600,
            fontSize: '15px',
            color: 'var(--color-heading)',
          }}
        >
          {question}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          style={{
            flexShrink: 0,
            color: 'var(--color-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            paddingBottom: '20px',
            fontSize: '14px',
            color: 'var(--color-muted)',
            lineHeight: 1.7,
            fontFamily: 'var(--font-montserrat), sans-serif',
          }}
        >
          {answer}
        </div>
      )}
    </div>
  )
}

export default function FaqPage() {
  return (
    <div style={{ padding: '64px 0' }}>
      <div className="page-width" style={{ maxWidth: '680px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 40px)',
            color: 'var(--color-heading)',
            marginBottom: '40px',
          }}
        >
          Perguntas Frequentes
        </h1>

        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          {faqs.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </div>
  )
}
