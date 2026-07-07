'use client'
import { useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'

const CUSTOMER_COUNT_TARGET = 150000
const CUSTOMER_COUNT_DURATION = 2000

const IMAGES = [
  '/FEEDBACKS/11112022-4Y7A6042.jpg',
  '/FEEDBACKS/11112022-4Y7A6047.jpg',
  '/FEEDBACKS/11112022-4Y7A6054.jpg',
  '/FEEDBACKS/11112022-4Y7A6062.jpg',
  '/FEEDBACKS/11112022-4Y7A6065.jpg',
  '/FEEDBACKS/11112022-4Y7A6068.jpg',
  '/FEEDBACKS/11112022-4Y7A6082.jpg',
  '/FEEDBACKS/11112022-4Y7A6090.jpg',
  '/FEEDBACKS/11112022-4Y7A6097.jpg',
  '/FEEDBACKS/11112022-4Y7A6107.jpg',
  '/FEEDBACKS/11112022-4Y7A6115.jpg',
  '/FEEDBACKS/11112022-4Y7A6135.jpg',
  '/FEEDBACKS/11112022-4Y7A6232.jpg',
  '/FEEDBACKS/11112022-4Y7A6259.jpg',
  '/FEEDBACKS/11112022-4Y7A6263.jpg',
  '/FEEDBACKS/11112022-4Y7A6300.jpg',
  '/FEEDBACKS/11112022-4Y7A6347.jpg',
  '/FEEDBACKS/11112022-4Y7A6349.jpg',
  '/FEEDBACKS/11112022-4Y7A6368.jpg',
  '/FEEDBACKS/11112022-4Y7A6411.jpg',
  '/FEEDBACKS/11112022-4Y7A6425.jpg',
  '/FEEDBACKS/11112022-4Y7A6426.jpg',
  '/FEEDBACKS/11112022-4Y7A6439.jpg',
  '/FEEDBACKS/11112022-4Y7A6446.jpg',
  '/FEEDBACKS/11112022-4Y7A6455.jpg',
  '/FEEDBACKS/11112022-4Y7A6472.jpg',
  '/FEEDBACKS/11112022-4Y7A6481.jpg',
  '/FEEDBACKS/11112022-4Y7A6503.jpg',
  '/FEEDBACKS/11112022-4Y7A6533.jpg',
  '/FEEDBACKS/11112022-4Y7A6536.jpg',
  '/FEEDBACKS/11112022-4Y7A6561.jpg',
  '/FEEDBACKS/11112022-4Y7A6567.jpg',
  '/FEEDBACKS/11112022-4Y7A6638.jpg',
  '/FEEDBACKS/11112022-4Y7A6652.jpg',
  '/FEEDBACKS/11112022-4Y7A6666.jpg',
  '/FEEDBACKS/11112022-4Y7A6683.jpg',
  '/FEEDBACKS/11112022-4Y7A6689.jpg',
  '/FEEDBACKS/11112022-4Y7A6692.jpg',
  '/FEEDBACKS/11112022-4Y7A6713.jpg',
  '/FEEDBACKS/11112022-4Y7A6719.jpg',
  '/FEEDBACKS/11112022-4Y7A6744.jpg',
  '/FEEDBACKS/11112022-4Y7A6756.jpg',
  '/FEEDBACKS/11112022-4Y7A6760.jpg',
  '/FEEDBACKS/11112022-4Y7A6764.jpg',
  '/FEEDBACKS/11112022-4Y7A6782.jpg',
  '/FEEDBACKS/11112022-4Y7A6803.jpg',
  '/FEEDBACKS/11112022-4Y7A6809.jpg',
  '/FEEDBACKS/11112022-4Y7A6826.jpg',
  '/FEEDBACKS/11112022-4Y7A6851.jpg',
  '/FEEDBACKS/11112022-4Y7A6863.jpg',
  '/FEEDBACKS/11112022-4Y7A6885.jpg',
  '/FEEDBACKS/11112022-4Y7A6889.jpg',
  '/FEEDBACKS/11112022-4Y7A6901.jpg',
  '/FEEDBACKS/11112022-4Y7A6904.jpg',
  '/FEEDBACKS/11112022-4Y7A6928.jpg',
  '/FEEDBACKS/11112022-4Y7A6957.jpg',
  '/FEEDBACKS/11112022-4Y7A6967.jpg',
  '/FEEDBACKS/11112022-4Y7A6986.jpg',
  '/FEEDBACKS/11112022-4Y7A7041.jpg',
  '/FEEDBACKS/11112022-4Y7A7051.jpg',
  '/FEEDBACKS/11112022-4Y7A7054.jpg',
  '/FEEDBACKS/11112022-4Y7A7056.jpg',
  '/FEEDBACKS/11112022-4Y7A7067.jpg',
  '/FEEDBACKS/11112022-4Y7A7076.jpg',
  '/FEEDBACKS/11112022-4Y7A7116.jpg',
  '/FEEDBACKS/11112022-4Y7A7141.jpg',
  '/FEEDBACKS/11112022-4Y7A7145.jpg',
  '/FEEDBACKS/11112022-4Y7A7151.jpg',
  '/FEEDBACKS/11112022-4Y7A7152.jpg',
  '/FEEDBACKS/11112022-4Y7A7160.jpg',
  '/FEEDBACKS/11112022-4Y7A7171.jpg',
  '/FEEDBACKS/11112022-4Y7A7181.jpg',
  '/FEEDBACKS/11112022-4Y7A7196.jpg',
  '/FEEDBACKS/11112022-4Y7A7199.jpg',
  '/FEEDBACKS/11112022-4Y7A7205.jpg',
  '/FEEDBACKS/11112022-4Y7A7213.jpg',
  '/FEEDBACKS/11112022-4Y7A7250.jpg',
  '/FEEDBACKS/11112022-4Y7A7254.jpg',
  '/FEEDBACKS/11112022-4Y7A7270.jpg',
  '/FEEDBACKS/11112022-4Y7A7278.jpg'
]

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
          Clientes JHF pelo mundo.
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
