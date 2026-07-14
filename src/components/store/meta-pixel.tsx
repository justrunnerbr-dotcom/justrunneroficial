'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { META_PIXEL_ID, META_PIXEL_ID_2, metaPageView } from '@/lib/meta'

export function MetaPixel() {
  const pathname = usePathname()
  const isMounted = useRef(false)

  useEffect(() => {
    if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    // Fires PageView on subsequent SPA navigations (initial is fired by the inline script)
    metaPageView()
  }, [pathname])

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // Testes locais não devem poluir a otimização de anúncios reais no Meta.
            if (!/^(localhost|127\\.0\\.0\\.1)$/.test(window.location.hostname)) {
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
              n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
              s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
              (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init','${META_PIXEL_ID}');
              ${META_PIXEL_ID_2 ? `fbq('init','${META_PIXEL_ID_2}');` : ''}
              fbq('track','PageView');
            }
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      {META_PIXEL_ID_2 && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID_2}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}
    </>
  )
}
