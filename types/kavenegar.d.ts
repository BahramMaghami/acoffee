declare module 'kavenegar' {
  interface LookupInput {
    receptor: string
    token: string
    template: string
    type: 'sms'
  }
  interface Client {
    VerifyLookup(
      input: LookupInput,
      callback: (entries: unknown, status?: number, message?: string) => void,
    ): void
  }
  const Kavenegar: { KavenegarApi(options: { apikey: string }): Client }
  export default Kavenegar
}
