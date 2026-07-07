'use client'
import { forwardRef } from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ style, onFocus, onBlur, ...props }, ref) => (
    <input
      ref={ref}
      style={{
        width: '100%',
        padding: '12px 16px',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        fontFamily: 'var(--font-montserrat), sans-serif',
        fontSize: '14px',
        color: 'var(--color-foreground)',
        background: 'var(--color-background)',
        outline: 'none',
        transition: 'border-color var(--duration-default)',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-accent)'
        onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        onBlur?.(e)
      }}
      {...props}
    />
  )
)
Input.displayName = 'Input'
