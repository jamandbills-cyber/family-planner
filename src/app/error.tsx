'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F7F4EF',
      color: '#1A1A2E',
      fontFamily: "'DM Sans', sans-serif",
      padding: 24,
    }}>
      <div style={{
        maxWidth: 420,
        background: '#fff',
        border: '1px solid #E8E3DB',
        borderRadius: 14,
        padding: 24,
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: '#8B8599', fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>
          {error.message || 'The family planner could not load this view.'}
        </p>
        <button
          onClick={reset}
          style={{
            background: '#C4522A',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            padding: '10px 18px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
