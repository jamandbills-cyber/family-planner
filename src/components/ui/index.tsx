import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const toneVars: Record<Tone, { bg: string; border: string; text: string }> = {
  neutral: { bg: 'var(--surface-soft)', border: 'var(--border)', text: 'var(--text-secondary)' },
  success: { bg: 'var(--success-soft)', border: 'var(--success-border)', text: 'var(--success)' },
  warning: { bg: 'var(--warning-soft)', border: 'var(--warning-border)', text: 'var(--warning)' },
  danger: { bg: 'var(--danger-soft)', border: 'var(--danger-border)', text: 'var(--danger)' },
  info: { bg: 'var(--info-soft)', border: 'var(--info-border)', text: 'var(--info)' },
}

export function PageShell({
  children,
  size = 'base',
  ...props
}: HTMLAttributes<HTMLDivElement> & { size?: 'base' | 'wide' | 'narrow' }) {
  const maxWidth = size === 'wide' ? 'var(--content-wide)' : size === 'narrow' ? 700 : 'var(--content-max)'
  return (
    <div
      {...props}
      style={{
        maxWidth,
        margin: '0 auto',
        padding: '24px clamp(16px, 4vw, 24px) 60px',
        ...props.style,
      }}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div
      {...props}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 24,
        ...props.style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div style={{
            color: 'var(--muted)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 5,
          }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{
          color: 'var(--text)',
          fontFamily: "'Playfair Display', serif",
          fontSize: 28,
          lineHeight: 1.15,
          fontWeight: 700,
          margin: 0,
        }}>
          {title}
        </h1>
        {description && (
          <p style={{
            color: 'var(--muted)',
            fontSize: 14,
            lineHeight: 1.55,
            marginTop: 7,
            maxWidth: 680,
          }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function Card({
  children,
  padded = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      {...props}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: padded ? 20 : 0,
        ...props.style,
      }}
    >
      {children}
    </div>
  )
}

export function Button({
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: {
      background: 'var(--accent)',
      border: '1px solid var(--accent)',
      color: '#fff',
    },
    secondary: {
      background: 'var(--surface)',
      border: '1px solid var(--border-strong)',
      color: 'var(--text-secondary)',
    },
    ghost: {
      background: 'transparent',
      border: '1px solid transparent',
      color: 'var(--muted)',
    },
    danger: {
      background: 'var(--danger)',
      border: '1px solid var(--danger)',
      color: '#fff',
    },
  }[variant]

  return (
    <button
      type="button"
      {...props}
      style={{
        ...styles,
        borderRadius: 'var(--radius-md)',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1,
        opacity: props.disabled ? 0.55 : 1,
        padding: '10px 16px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        ...props.style,
      }}
    />
  )
}

export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      style={{
        alignItems: 'center',
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 'var(--radius-md)',
        color: 'var(--muted)',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        justifyContent: 'center',
        minHeight: 36,
        minWidth: 36,
        padding: 6,
        ...props.style,
      }}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  help,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; help?: ReactNode; error?: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ color: 'var(--muted)', display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
        {label}
      </span>
      <input
        {...props}
        style={{
          background: 'var(--surface)',
          border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-md)',
          color: 'var(--text)',
          fontSize: 14,
          padding: '10px 12px',
          width: '100%',
          ...props.style,
        }}
      />
      {help && !error && <span style={{ color: 'var(--muted)', display: 'block', fontSize: 12, marginTop: 5 }}>{help}</span>}
      {error && <span style={{ color: 'var(--danger)', display: 'block', fontSize: 12, marginTop: 5 }}>{error}</span>}
    </label>
  )
}

export function SelectField({
  label,
  children,
  help,
  error,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: ReactNode; help?: ReactNode; error?: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ color: 'var(--muted)', display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
        {label}
      </span>
      <select
        {...props}
        style={{
          background: 'var(--surface)',
          border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-md)',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: 14,
          padding: '10px 12px',
          width: '100%',
          ...props.style,
        }}
      >
        {children}
      </select>
      {help && !error && <span style={{ color: 'var(--muted)', display: 'block', fontSize: 12, marginTop: 5 }}>{help}</span>}
      {error && <span style={{ color: 'var(--danger)', display: 'block', fontSize: 12, marginTop: 5 }}>{error}</span>}
    </label>
  )
}

export function Alert({
  tone = 'neutral',
  title,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone; title?: ReactNode }) {
  const toneStyle = toneVars[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      {...props}
      style={{
        background: toneStyle.bg,
        border: `1px solid ${toneStyle.border}`,
        borderRadius: 'var(--radius-lg)',
        color: toneStyle.text,
        fontSize: 13,
        lineHeight: 1.5,
        padding: '12px 14px',
        ...props.style,
      }}
    >
      {title && <div style={{ color: toneStyle.text, fontWeight: 800, marginBottom: 3 }}>{title}</div>}
      {children}
    </div>
  )
}

export function StatusPill({
  tone = 'neutral',
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const toneStyle = toneVars[tone]
  return (
    <span
      {...props}
      style={{
        alignItems: 'center',
        background: toneStyle.bg,
        border: `1px solid ${toneStyle.border}`,
        borderRadius: 999,
        color: toneStyle.text,
        display: 'inline-flex',
        fontSize: 12,
        fontWeight: 800,
        gap: 5,
        lineHeight: 1,
        padding: '4px 9px',
        whiteSpace: 'nowrap',
        ...props.style,
      }}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <Card style={{ padding: 36, textAlign: 'center' }}>
      <h2 style={{ color: 'var(--text)', fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 8 }}>
        {title}
      </h2>
      {children && <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.55, margin: '0 auto 18px', maxWidth: 420 }}>{children}</div>}
      {action}
    </Card>
  )
}

export function LoadingState({ label = 'Loading...' }: { label?: ReactNode }) {
  return (
    <div style={{
      alignItems: 'center',
      color: 'var(--muted)',
      display: 'flex',
      fontSize: 15,
      gap: 10,
      justifyContent: 'center',
      minHeight: '50vh',
      padding: 24,
    }}>
      <span aria-hidden="true" style={{
        animation: 'spin 1s linear infinite',
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        height: 18,
        width: 18,
      }} />
      <span>{label}</span>
    </div>
  )
}
