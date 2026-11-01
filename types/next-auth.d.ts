import type { DefaultSession } from 'next-auth'

type UserRole = 'CUSTOMER' | 'ADMIN'

declare module 'next-auth' {
  interface User { role: UserRole; sessionVersion?: number }
  interface Session {
    user: { id: string; role: UserRole; sessionVersion?: number } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT { role?: UserRole; sessionVersion?: number }
}
