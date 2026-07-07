'use client'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'var(--color-accent)',
    color: 'var(--color-accent-text)',
    border: '1px solid var(--color-accent)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--color-heading)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-heading)',
    border: 'none',
  },
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '8px 16px', fontSize: '13px' },
  md: { padding: '12px 24px', fontSize: '14px' },
  lg: { padding: '16px 32px', fontSize: '16px' },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, style, children, onMouseEnter, onMouseLeave, ...props }, ref) => {
    return (
      <button
        ref={ref}
        style={{
          ...variantStyles[variant],
          ...sizeStyles[size],
          borderRadius: 'var(--button-radius)',
          fontFamily: 'var(--font-poppins), sans-serif',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'opacity var(--duration-default)',
          width: fullWidth ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.85'
          onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
          onMouseLeave?.(e)
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
