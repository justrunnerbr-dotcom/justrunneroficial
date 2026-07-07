interface BadgeProps {
  children: React.ReactNode
  variant?: 'sale' | 'new' | 'default'
}

const badgeStyles: Record<string, React.CSSProperties> = {
  sale: { background: '#020202', color: '#fff' },
  new: { background: '#1a1b18', color: '#fff' },
  default: { background: 'var(--color-img-bg)', color: 'var(--color-heading)' },
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      style={{
        ...badgeStyles[variant],
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderRadius: '4px',
        fontFamily: 'var(--font-poppins), sans-serif',
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  )
}
