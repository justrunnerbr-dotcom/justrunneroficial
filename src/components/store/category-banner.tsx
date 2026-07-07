'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Play, X } from 'lucide-react'
import { getProductionVideos } from '@/data/production-videos'

interface CategoryBannerProps {
  desktopSrc: string
  mobileSrc: string
  alt: string
  href?: string
  videoSlug?: string
}

export function CategoryBanner({ desktopSrc, mobileSrc, alt, href, videoSlug }: CategoryBannerProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const videos = videoSlug ? getProductionVideos(videoSlug) : null
  const hasVideo = !!videos?.length

  const picture = (
    <picture>
      <source media="(min-width: 750px)" srcSet={desktopSrc} />
      <img src={mobileSrc} alt={alt} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </picture>
  )

  return (
    <>
      <section>
        <div style={{ position: 'relative' }}>
          {href ? (
            <Link href={href} style={{ display: 'block' }}>
              {picture}
            </Link>
          ) : picture}

          {hasVideo && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: '7%',
              pointerEvents: 'none',
            }}>
              <button
                onClick={(e) => { e.preventDefault(); setModalOpen(true) }}
                className="category-video-btn"
                style={{
                  pointerEvents: 'auto',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(0,0,0,0.60)',
                  backdropFilter: 'blur(6px)',
                  color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.55)',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-poppins), sans-serif',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.80)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.60)' }}
              >
                <Play size={14} fill="#fff" color="#fff" />
                VER VÍDEO DO ÓCULOS
              </button>
            </div>
          )}
        </div>
      </section>

      {modalOpen && videos && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.88)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setModalOpen(false)}
            aria-label="Fechar vídeo"
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.12)', border: 'none',
              borderRadius: '50%', width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={20} />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '360px',
              aspectRatio: '9 / 16',
              borderRadius: '14px', overflow: 'hidden',
              background: '#000',
              margin: '0 20px',
            }}
          >
            <video
              src={videos[0]}
              autoPlay
              playsInline
              muted
              loop
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      )}
    </>
  )
}
