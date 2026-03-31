import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request offline access so we get a refresh token,
          // and calendar.readonly so we can read the family calendar.
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
    // Persist the access token and refresh token in the JWT
    async jwt({ token, account }) {
      if (account) {
        token.accessToken  = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt    = account.expires_at
      }
      return token
    },

    // Expose the access token to the client session
    async session({ session, token }) {
      session.accessToken  = token.accessToken  as string
      session.refreshToken = token.refreshToken as string
      return session
    },

    // Only allow admin emails through
    async signIn({ user }) {
      if (!user.email) return false
      if (ADMIN_EMAILS.length === 0) return true // no restriction if not configured
      return ADMIN_EMAILS.includes(user.email.toLowerCase())
    },
  },

  pages: {
    signIn:  '/auth/signin',
    error:   '/auth/error',
  },
}

// Extend next-auth types to include our extra fields
declare module 'next-auth' {
  interface Session {
    accessToken:  string
    refreshToken: string
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?:  string
    refreshToken?: string
    expiresAt?:    number
  }
}
