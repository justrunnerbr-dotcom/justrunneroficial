'use client'
import { useRef, useState, useEffect } from 'react'
import { Play } from 'lucide-react'
import { getProductionVideos } from '@/data/production-videos'

interface Props {
  categorySlug: string | undefined
}

export function ProductionVideosSection({ categorySlug }: Props) {
  const urls = getProductionVideos(categorySlug)
  if (!urls) return null
  return <VideosInner urls={urls} />
}

function VideosInner({ urls }: { urls: string[] }) {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const sectionRef = useRef<HTMLElement>(null)
  const [playing, setPlaying] = useState<boolean[]>(() => new Array(urls.length).fill(false))

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        videoRefs.current.forEach((video) => {
          if (!video) return
          if (entry.isIntersecting) {
            video.muted = true
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.25 },
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  function handleClick(idx: number) {
    const video = videoRefs.current[idx]
    if (!video) return
    if (video.paused) {
      video.muted = true
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }

  return (
    <section ref={sectionRef} style={{ margin: '28px 0 4px' }}>
      <p style={{
        fontSize: '10px', fontWeight: 700, textAlign: 'center',
        textTransform: 'uppercase', letterSpacing: '3px',
        color: '#a1a1aa', marginBottom: '4px',
      }}>
        EXPERIÊNCIA JUST RUNNER
      </p>
      <h3 style={{
        fontSize: '15px', fontWeight: 800, textAlign: 'center',
        marginBottom: '16px', fontFamily: 'var(--font-montserrat), sans-serif',
        textTransform: 'uppercase', color: '#000000',
      }}>
        DESIGN EM DETALHES
      </h3>

      <div className="production-videos-grid">
        {urls.map((url, idx) => (
          <div
            key={url}
            className="production-video-card"
            onClick={() => handleClick(idx)}
            style={{
              position: 'relative',
              aspectRatio: '9 / 16',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#111111',
              cursor: 'pointer',
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            <video
              ref={(el) => { videoRefs.current[idx] = el }}
              src={url}
              preload="none"
              playsInline
              autoPlay
              muted
              loop
              onError={() => {}}
              onPlay={() => setPlaying(prev => { const n = [...prev]; n[idx] = true; return n })}
              onPause={() => setPlaying(prev => { const n = [...prev]; n[idx] = false; return n })}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />

            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 45%)',
              pointerEvents: 'none',
            }} />

            {!playing[idx] && (
              <div style={{
                position: 'absolute', bottom: '12px', left: '12px',
                width: '28px', height: '28px', borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <Play size={12} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
