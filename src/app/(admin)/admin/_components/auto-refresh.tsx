'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Os dados no banco já se atualizam sozinhos (webhook da Yampi + crons de 5 e
// 10 min), mas uma página do admin aberta só é montada de novo quando alguém
// navega — a aba parada mostrava os números da hora em que foi aberta. Isto
// re-renderiza a página atual a cada 3 min. O `router.refresh()` mantém o
// estado do cliente (o que está digitado num campo continua lá).
const INTERVAL_MS = 3 * 60 * 1000
const RETRY_MS = 60 * 1000

function isTyping() {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

export function AdminAutoRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  const lastRef = useRef(0)

  useEffect(() => {
    if (pathname.startsWith('/admin/login')) return
    // Navegar já traz a página nova — conta como atualização.
    lastRef.current = Date.now()

    function refreshIfStale() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRef.current < INTERVAL_MS) return
      // Não atualiza no meio de uma digitação; tenta de novo no próximo minuto.
      if (isTyping()) return
      lastRef.current = Date.now()
      router.refresh()
    }

    const timer = setInterval(refreshIfStale, RETRY_MS)
    // Voltou pra aba depois de 3+ min fora: atualiza na hora, sem esperar o timer.
    document.addEventListener('visibilitychange', refreshIfStale)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshIfStale)
    }
  }, [pathname, router])

  return null
}
