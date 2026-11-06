import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifiedContactPhone, addressContactDefaults } from '../../lib/address-contact'
import { addressSchema } from '../../lib/validators/checkout'

test('only verified account mobiles supply the primary contact', () => {
  assert.equal(verifiedContactPhone({ phone: '09121234567', phoneVerifiedAt: new Date() }), '09121234567')
  assert.equal(verifiedContactPhone({ phone: '09121234567', phoneVerifiedAt: null }), null)
  assert.equal(verifiedContactPhone({ phone: null, phoneVerifiedAt: new Date() }), null)
  assert.equal(verifiedContactPhone({ phone: '02112345678', phoneVerifiedAt: new Date() }), null)
})
test('old address contacts remain optional alternates and are never labelled verified', () => {
  assert.deepEqual(addressContactDefaults({ phone: '02112345678' }, '09121234567'), { phone: '09121234567', alternatePhone: '02112345678' })
  assert.deepEqual(addressContactDefaults({ phone: '09121234567', alternatePhone: null }, '09121234567'), { phone: '09121234567', alternatePhone: '' })
  assert.equal(addressContactDefaults({ phone: 'old', alternatePhone: '02112345678' }, '09121234567').alternatePhone, '02112345678')
})
test('alternate contact is optional, normalizes Persian digits and rejects malformed numbers', () => {
  const schema = addressSchema.shape.alternatePhone
  assert.equal(schema.parse(undefined), undefined)
  assert.equal(schema.parse('   '), '')
  assert.equal(schema.parse('۰۲۱۱۲۳۴۵۶۷۸'), '02112345678')
  for (const value of ['123', 'abcdefghijk', '12345678901']) assert.equal(schema.safeParse(value).success, false)
})
