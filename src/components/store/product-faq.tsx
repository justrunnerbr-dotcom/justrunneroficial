'use client'
import { useState } from 'react'
import { Star, Truck, Lock, Headphones, Plus, Minus } from 'lucide-react'

const TRUST_BADGES = [
  { 
    icon: Star, 
    title: 'Mais de 200 mil clientes', 
    text: 'Marca brasileira atendendo clientes em todo o Brasil desde 2020.' 
  },
  { 
    icon: Truck, 
    title: 'Envio com rastreio', 
    text: 'Acompanhe seu pedido do envio até a entrega.' 
  },
  { 
    icon: Lock, 
    title: 'Compra segura', 
    text: 'Ambiente protegido com criptografia e pagamentos processados pelo Mercado Pago.' 
  },
  { 
    icon: Headphones, 
    title: 'Troca fácil e garantia', 
    text: 'Você pode trocar ou devolver com praticidade e segurança.' 
  },
]

type TabKey = 'Nossos Óculos' | 'Envios' | 'Trocas & Devoluções'

const TABS: TabKey[] = ['Nossos Óculos', 'Envios', 'Trocas & Devoluções']

const FAQ_DATA: Record<TabKey, { q: string, a: string }[]> = {
  'Nossos Óculos': [
    { q: 'Os óculos possuem proteção UV?', a: 'Sim! Nossas lentes possuem proteção UV400, bloqueando 100% dos raios ultravioleta nocivos (UVA e UVB).' },
    { q: 'Qual o material dos óculos?', a: 'Trabalhamos com materiais premium, como acetato de alta resistência e ligas metálicas leves, garantindo durabilidade e conforto.' },
    { q: 'Como consultar as medidas antes de comprar?', a: 'Na página de cada produto você encontra a aba "Especificações técnicas" com todas as medidas detalhadas.' },
    { q: 'Os óculos possuem os emblemas e marcações?', a: 'Sim! Todos acompanham os emblemas das marcas. Ocultamos nas fotos por diretrizes comerciais, mas você recebe o produto oficial.' }
  ],
  'Envios': [
    { q: 'Qual o prazo de envio e entrega?', a: 'Despachamos em até 24h úteis. O prazo de entrega varia de 7 a 15 dias úteis, dependendo da sua região.' },
    { q: 'Como rastrear meu pedido?', a: 'Você receberá o código de rastreio por e-mail e WhatsApp assim que o pedido for despachado.' }
  ],
  'Trocas & Devoluções': [
    { q: 'Como funciona a política de trocas?', a: 'Você tem até 30 dias após o recebimento para solicitar a primeira troca gratuitamente.' },
    { q: 'E se eu não gostar, posso devolver?', a: 'Sim! Garantimos seu direito de arrependimento com devolução gratuita em até 7 dias após o recebimento.' }
  ]
}

export function ProductFAQ() {
  const [activeTab, setActiveTab] = useState<TabKey>('Nossos Óculos')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const currentFaqs = FAQ_DATA[activeTab]

  return (
    <section style={{ padding: '32px 0', borderTop: '1px solid var(--color-border)', background: '#ffffff' }}>
      <div className="page-width">

        {/* Trust Badges — grid no desktop */}
        <div className="trust-badges-grid" style={{ marginBottom: '32px' }}>
          {TRUST_BADGES.map((badge, idx) => {
            const Icon = badge.icon
            return (
              <div key={idx} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', background: '#f4f4f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon size={20} color="#18181b" strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#18181b', marginBottom: '8px', fontFamily: 'var(--font-poppins), sans-serif' }}>
                  {badge.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.5 }}>
                  {badge.text}
                </p>
              </div>
            )
          })}
        </div>

        {/* Trust Badges — carrossel automático no mobile */}
        <div className="trust-badges-marquee-wrap" style={{ marginBottom: '32px' }}>
          <div className="trust-badges-marquee-track">
            {[1, 2, 3].map((group) => (
              <div key={group} style={{ display: 'flex', gap: '12px', paddingRight: '12px' }}>
                {TRUST_BADGES.map((badge, idx) => {
                  const Icon = badge.icon
                  return (
                    <div key={idx} className="trust-badge-card">
                      <div style={{ width: '40px', height: '40px', background: '#f4f4f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', flexShrink: 0 }}>
                        <Icon size={18} color="#18181b" strokeWidth={1.5} />
                      </div>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', marginBottom: '6px', fontFamily: 'var(--font-poppins), sans-serif' }}>
                        {badge.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.4 }}>
                        {badge.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Area */}
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 24px)', fontWeight: 600, color: '#18181b', textAlign: 'center', marginBottom: '32px', fontFamily: 'var(--font-poppins), sans-serif' }}>
            Tudo o que você precisa saber, de forma simples e direta.
          </h2>

          {/* Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: '40px', padding: '4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setOpenIndex(null); }}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '40px',
                    border: 'none',
                    background: activeTab === tab ? '#18181b' : 'transparent',
                    color: activeTab === tab ? '#ffffff' : '#71717a',
                    fontSize: '13px',
                    fontWeight: activeTab === tab ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Accordion List */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {currentFaqs.map((faq, i) => {
              const isOpen = openIndex === i
              return (
                <div key={i} style={{ borderBottom: '1px solid #e4e4e7' }}>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '24px 0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#18181b',
                    }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>{faq.q}</span>
                    <span style={{ color: '#a1a1aa' }}>
                      {isOpen ? <Minus size={18} strokeWidth={1.5} /> : <Plus size={18} strokeWidth={1.5} />}
                    </span>
                  </button>
                  <div style={{ maxHeight: isOpen ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                    <p style={{ fontSize: '14px', color: '#52525b', paddingBottom: '24px', lineHeight: 1.6 }}>
                      {faq.a}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </section>
  )
}
