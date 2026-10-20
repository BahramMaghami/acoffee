import { test } from 'node:test'
import assert from 'node:assert/strict'
import { usersPage, adminUserMutationSchema } from '../../lib/validators/admin-users'

test('user pagination accepts only safe positive integer pages', () => {
  for (const value of [undefined, [], '-1', '0', '1.5', 'Infinity', '9007199254740992', '1e3']) assert.equal(usersPage(value), 1)
  assert.equal(usersPage('2'), 2)
})

test('user management rejects invalid roles, targets and operations', () => {
  const userId = 'clabcdefg00000123456789012'
  assert.equal(adminUserMutationSchema.safeParse({ operation: 'role', userId, role: 'ADMIN' }).success, true)
  assert.equal(adminUserMutationSchema.safeParse({ operation: 'delete', userId }).success, true)
  for (const input of [
    { operation: 'role', userId, role: 'OWNER' },
    { operation: 'role', userId },
    { operation: 'delete', userId: '' },
    { operation: 'deleteAll', userId },
  ]) assert.equal(adminUserMutationSchema.safeParse(input).success, false)
})
