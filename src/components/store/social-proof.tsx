'use client'
import { useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'

const CUSTOMER_COUNT_TARGET = 150000
const CUSTOMER_COUNT_DURATION = 2000

const IMAGES = Array.from(
  { length: 30 },
  (_, i) => `/FEEDBACKS/feedback-${String(i + 1).padStart(2, '0')}.jpg`,
)

export function SocialProof() {
  const [count, setCount] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = headingRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return
        hasAnimated.current = true
        const start = performance.now()
        function tick(now: number) {
          const progress = Math.min((now - start) / CUSTOMER_COUNT_DURATION, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.round(eased * CUSTOMER_COUNT_TARGET))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section style={{ padding: '12px 0 32px', background: '#ffffff', overflow: 'hidden' }}>
      <div className="page-width" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

        {/* Top Titles */}
        <h2 ref={headingRef} style={{
          fontSize: 'clamp(48px, 8vw, 80px)',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-2px',
          fontFamily: 'var(--font-poppins), sans-serif',
          background: 'linear-gradient(180deg, #18181b 0%, #71717a 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          + {count.toLocaleString('pt-BR')}
        </h2>
        <p style={{ fontSize: '16px', color: '#52525b', marginBottom: '48px', fontWeight: 500 }}>
          Clientes Just Runner pelo mundo.
        </p>

        {/* Image Grid / Marquee */}
        <div style={{ 
          width: '100vw',
          maxWidth: '100%',
          overflow: 'hidden',
          paddingBottom: '24px',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            width: 'max-content',
            animation: 'marquee 150s linear infinite'
          }}>
            {/* Duplicamos os blocos para criar o loop infinito */}
            {[1, 2, 3].map((group) => (
              <div key={group} style={{ display: 'flex', gap: '8px', paddingRight: '8px' }}>
                {IMAGES.map((src, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      position: 'relative', 
                      width: '140px', 
                      height: '180px', 
                      flexShrink: 0,
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <img 
                      src={src} 
                      alt={`Cliente usando óculos ${i}`} 
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-33.33333%); }
          }
        `}} />

        {/* Bottom Titles */}
        <h3 style={{ 
          fontSize: 'clamp(24px, 4vw, 36px)', 
          fontWeight: 800, 
          color: '#18181b', 
          marginTop: '32px',
          marginBottom: '12px',
          fontFamily: 'var(--font-poppins), sans-serif',
          letterSpacing: '-0.5px'
        }}>
          Mais que óculos, um estilo de vida.
        </h3>
        <p style={{ fontSize: '13px', color: '#71717a' }}>
          Desde 2020 criando uma nova forma de ver, viver e sentir o mundo.
        </p>

      </div>
    </section>
  )
}
