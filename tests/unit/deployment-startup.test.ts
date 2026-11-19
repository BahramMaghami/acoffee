import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

test('startup stamps responses with the loaded build, not a later file change', async () => {
  for (const initial of ['a'.repeat(40), 'invalid', undefined]) {
    let stamp = initial
    let listener: (req: object, res: { setHeader: (key: string, value: string) => void }) => void
    const source = readFileSync(new URL('../../server.cjs', import.meta.url), 'utf8')
    const context = {
      __dirname: '/app', global: {}, console,
      process: { env: {}, chdir() {}, exit() { throw new Error('Unexpected exit') } },
      require(name: string) {
        if (name === 'node:fs') return { readFileSync() { if (stamp === undefined) throw new Error('Missing'); return stamp } }
        if (name === 'node:http') return { createServer(handler: typeof listener) { listener = handler; return { on() {}, listen() {} } } }
        if (name === 'next') return () => ({ prepare: async () => {}, getRequestHandler: () => async () => {} })
        throw new Error(`Unexpected module ${name}`)
      },
    }
    vm.runInNewContext(source, context)
    await new Promise(resolve => setImmediate(resolve))
    stamp = 'b'.repeat(40)
    const headers: Record<string, string> = {}
    listener!({}, { setHeader(key, value) { headers[key] = value } })
    assert.equal(headers['X-Acoffee-Release'], initial?.length === 40 ? initial : undefined)
  }
})
