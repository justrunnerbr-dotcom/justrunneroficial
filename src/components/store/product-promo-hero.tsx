export function ProductPromoHero() {
  return (
    <div style={{ width: '100%', lineHeight: 0 }}>
      <picture>
        <source media="(max-width: 640px)" srcSet="/BANNERS%20297/banner_08_mobile_297.jpg" />
        <img
          src="/BANNERS%20297/banner_08_297.jpg"
          alt="Compre 1 Leve 2 Just Have Fun"
          loading="eager"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </picture>
    </div>
  )
}
