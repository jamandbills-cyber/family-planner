import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

async function refreshAccessToken(token: any) {
  try {
    const url = 'https://oauth2.googleapis.com/token'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type:    'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })
    const refreshed = await res.json()
    if (!res.ok) throw refreshed
    return {
      ...token,
      accessToken:  refreshed.access_token,
      expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    }
  } catch (err) {
    console.error('Token refresh failed:', err)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/gmail.send',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        return {
          ...token,
          accessToken:  account.access_token,
          refreshToken: account.refresh_token,
          expiresAt:    account.expires_at,
        }
      }
      // Return token if not expired (5 min buffer)
      if (Date.now() < ((token.expiresAt as number) - 300) * 1000) {
        return token
      }
      // Token expired — refresh it
      return refreshAccessToken(token)
    },

    async session({ session, token }) {
      session.accessToken  = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      if (token.error) {
        (session as any).error = token.error
      }
      return session
    },

    async signIn({ user }) {
      if (!user.email) return false
      if (ADMIN_EMAILS.length === 0) return true
      return ADMIN_EMAILS.includes(user.email.toLowerCase())
    },
  },

  pages: {
    signIn: '/auth/signin',
    error:  '/auth/error',
  },
}

declare module 'next-auth' {
  interface Session {
    accessToken:  string
    refreshToken: string
    error?:       string
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?:  string
    refreshToken?: string
    expiresAt?:    number
    error?:        string
  }
}
