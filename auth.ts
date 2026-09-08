import 'server-only'
import NextAuth, { AuthError, CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { getDb } from '@/lib/db'
import { loginSchema } from '@/lib/validators/auth'
import { consumeAuthAttempt } from '@/lib/auth-rate-limit'

const SESSION_MAX_AGE = 14 * 24 * 60 * 60
// A non-user hash keeps nonexistent-account checks comparable to password checks.
const DUMMY_HASH = '$2b$12$R5np22einRg4rAh/dMAxWOF/x2uZxDopp.uV3dHGq8ArO4QVYE.Mq'

class RateLimited extends CredentialsSignin {
  code = 'rate_limited'
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  jwt: { maxAge: SESSION_MAX_AGE },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'ایمیل', type: 'email' },
        password: { label: 'رمز عبور', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { email, password } = parsed.data
        if (!await consumeAuthAttempt(email, 'login')) throw new RateLimited()

        const user = await getDb().user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, role: true, passwordHash: true },
        })
        const valid = await compare(password, user?.passwordHash ?? DUMMY_HASH)
        if (!user || !valid) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.role = user.role
      }
      // Ignore user-supplied session updates: identity and role come from the DB.
      return token
    },
    session({ session, token }) {
      session.user.id = token.sub ?? ''
      session.user.role = token.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER'
      return session
    },
  },
  logger: {
    error(error) {
      if (!(error instanceof CredentialsSignin)) {
        console.error(`[auth] ${error instanceof AuthError ? error.type : error.name}`)
      }
    },
  },
})
