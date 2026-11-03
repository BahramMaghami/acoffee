import { createHmac } from 'node:crypto'

export function accountPhoneHash(
  secret: string,
  id: string,
  userId: string,
  sessionVersion: number,
  phone: string,
  code: string,
) {
  return createHmac('sha256', secret)
    .update(
      JSON.stringify([
        'account-phone-initial',
        id,
        userId,
        sessionVersion,
        phone,
        code,
      ]),
    )
    .digest('hex')
}
