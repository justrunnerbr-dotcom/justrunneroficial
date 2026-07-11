import Link from 'next/link'

interface HeroProps {
  desktopBanner?: string
  mobileBanner?: string
  alt?: string
  href?: string
}

export function Hero({
  desktopBanner = '/BANNERS%20297/banner_01.jpg',
  mobileBanner = '/BANNERS%20297/banner_01_mobile.jpg',
  alt = 'Just Runner',
  href = '/colecao',
}: HeroProps) {
  return (
    <section style={{ width: '100%' }}>
      <Link href={href} style={{ display: 'block', width: '100%', position: 'relative' }}>
        <picture>
          <source media="(min-width: 768px)" srcSet={desktopBanner} />
          {/* fetchpriority="high" + loading="eager" garante que esta imagem (LCP) seja baixada primeiro */}
          <img
            src={mobileBanner}
            alt={alt}
            fetchPriority="high"
            loading="eager"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </picture>
      </Link>
    </section>
  )
}
