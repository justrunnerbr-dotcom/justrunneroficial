export function ProductBanner() {
  return (
    <div style={{ width: '100%' }}>
      <picture>
        {/* Imagem para Celular */}
        <source media="(max-width: 768px)" srcSet="/BANNERS%20297/banner_08_mobile_297.jpg" />
        {/* Imagem para Computador */}
        <img
          src="/BANNERS%20297/banner_08_297.jpg"
          alt="Oferta Especial"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </picture>
    </div>
  )
}
