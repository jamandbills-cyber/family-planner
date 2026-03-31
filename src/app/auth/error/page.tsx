'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const messages: Record<string, string> = {
    AccessDenied: "Your Google account isn't on the approved list. Ask Justin to add your email to ADMIN_EMAILS in Vercel.",
    Configuration: "There's a configuration error. Check that all environment variables are set correctly in Vercel.",
    Default: "Something went wrong with sign in. Try again.",
  }

  const message = messages[error ?? ''] ?? messages.Default

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#F7F4EF',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #FECACA',
        padding: '48px 40px',
        maxWidth: 380,
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>⚠️</div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22,
          fontWeight: 700,
          color: '#1A1A2E',
          marginBottom: 12
        }}>
          Sign in failed
        </div>
        <p style={{ fontSize: 14, color: '#8B8599', marginBottom: 28, lineHeight: 1.6 }}>
          {message}
        </p>
        <a href="/auth/signin" style={{
          display: 'inline-block',
          padding: '11px 24px',
          background: '#1A1A2E',
          color: '#fff',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none'
        }}>
          Try again
        </a>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  )
}
