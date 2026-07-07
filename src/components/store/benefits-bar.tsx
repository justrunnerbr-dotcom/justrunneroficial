import { Truck, ShieldCheck, Sun, Zap } from 'lucide-react'

const BENEFITS = [
  { Icon: Truck, title: 'Frete Grátis', subtitle: 'Em compras acima de R$ 200' },
  { Icon: ShieldCheck, title: 'Compra Segura', subtitle: 'Checkout 100% protegido' },
  { Icon: Sun, title: 'Proteção UV400', subtitle: 'Em todas as lentes' },
  { Icon: Zap, title: 'Entrega Rápida', subtitle: 'Para todo o Brasil' },
]

export function BenefitsBar() {
  return (
    <section
      style={{
        background: '#f7f7f7',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        padding: '20px 0',
      }}
    >
      <div className="page-width">
        {/* Desktop / tablet — static grid */}
        <div className="benefits-grid">
          {BENEFITS.map(({ Icon, title, subtitle }) => (
            <div
              key={title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                justifyContent: 'center',
              }}
            >
              <Icon
                size={26}
                strokeWidth={1.5}
                style={{ flexShrink: 0, color: 'var(--color-heading)' }}
              />
              <div>
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--color-heading)',
                    fontFamily: 'var(--font-poppins), sans-serif',
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-muted)',
                    fontFamily: 'var(--font-montserrat), sans-serif',
                    lineHeight: 1.3,
                  }}
                >
                  {subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile — auto-scrolling marquee (infinite loop). Sibling of .page-width
          (not nested in it) so it spans the full section width with no side gap —
          the <section> itself has no horizontal padding. */}
      <div className="benefits-marquee-wrap">
        <div className="benefits-marquee-track">
          {[1, 2, 3].map((group) => (
            <div key={group} style={{ display: 'flex' }}>
              {BENEFITS.map(({ Icon, title, subtitle }) => (
                <div key={title} className="benefits-marquee-item">
                  <Icon
                    size={22}
                    strokeWidth={1.5}
                    style={{ flexShrink: 0, color: 'var(--color-heading)' }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-heading)',
                        fontFamily: 'var(--font-poppins), sans-serif',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {title}
                    </p>
                    <p
                      style={{
                        fontSize: '10px',
                        color: 'var(--color-muted)',
                        fontFamily: 'var(--font-montserrat), sans-serif',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
