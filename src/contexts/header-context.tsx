'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface HeaderContextValue {
  isTransparentPage: boolean
  setTransparentPage: (v: boolean) => void
}

const HeaderContext = createContext<HeaderContextValue>({
  isTransparentPage: false,
  setTransparentPage: () => {},
})

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [isTransparentPage, setTransparentPage] = useState(false)
  return (
    <HeaderContext.Provider value={{ isTransparentPage, setTransparentPage }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeaderContext() {
  return useContext(HeaderContext)
}

/**
 * Drop this into any page to request a transparent header on initial scroll position.
 * The header automatically becomes solid once the user scrolls down.
 */
export function TransparentHeader() {
  const { setTransparentPage } = useHeaderContext()
  useEffect(() => {
    setTransparentPage(true)
    return () => setTransparentPage(false)
  }, [setTransparentPage])
  return null
}
