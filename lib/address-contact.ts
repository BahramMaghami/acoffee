type Contact = { phone: string | null; phoneVerifiedAt: Date | string | null }
export function verifiedContactPhone(contact: Contact) {
  return contact.phoneVerifiedAt && contact.phone && /^09\d{9}$/.test(contact.phone) ? contact.phone : null
}

// A historical shipping number different from the verified account number is
// offered as an alternate, never silently relabelled as verified.
export function addressContactDefaults(address: { phone: string; alternatePhone?: string | null } | null | undefined, verifiedPhone: string | null) {
  return { phone: verifiedPhone ?? '', alternatePhone: address?.alternatePhone ?? (verifiedPhone && address?.phone && address.phone !== verifiedPhone ? address.phone : '') }
}
