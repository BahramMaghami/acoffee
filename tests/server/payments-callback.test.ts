import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'

test('callback ignores browser success, uses only a known authority and never requires a session or trusts the request origin', async () => {
  const state = { known: true, unavailable: false, calls: [] as unknown[][], reads: 0 }
  const bundle = await build({ entryPoints: ['app/api/payments/zarinpal/callback/route.ts'], platform: 'node', bundle: true, write: false, format: 'cjs', plugins: [{ name: 'boundaries', setup(builder) {
    builder.onResolve({ filter: /^(next\/(server|cache)|@\/lib\/(db|payment-rules|payments))$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => {
      if (args.path === 'next/server') return { contents: 'export class NextResponse extends Response { static redirect(url,status) { return new Response(null,{status,headers:{location:url.toString()}}) } }' }
      if (args.path === 'next/cache') return { contents: 'export const revalidatePath=()=>{}' }
      if (args.path.endsWith('/db')) return { contents: 'export const getDb=()=>({paymentAttempt:{findUnique:async()=>{state.reads++;return state.known?{orderId:"known-order"}:null}}})' }
      if (args.path.endsWith('/payment-rules')) return { contents: 'export const paymentConfig=()=>({origin:"http://localhost:3000",environment:"SANDBOX"})' }
      return { contents: 'export const paymentService=()=>({check:async(...args)=>{state.calls.push(args);if(state.unavailable)throw Error("offline");return {status:"UNKNOWN"}}})' }
    })
  } }] })
  const mod = { exports: {} as { GET: (r: Request) => Promise<Response> } }
  new Function('module', 'exports', 'require', 'state', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url), state)
  const authority = 'S' + '1'.repeat(35)
  const invoke = (query: string) => mod.exports.GET(new Request('https://untrusted.example/api/payments/zarinpal/callback?' + query))
  assert.equal((await invoke('Authority=bad&Status=OK')).status, 400)
  assert.equal((await invoke(`Authority=${authority}&Authority=${authority}`)).status, 400)
  assert.equal(state.reads, 0)
  state.known = false
  assert.equal((await invoke(`Authority=${authority}&Status=OK&amount=1`)).status, 404)
  assert.equal(state.calls.length, 0)
  state.known = true
  for (const status of ['OK', 'NOK']) {
    const response = await invoke(`Authority=${authority}&Status=${status}&amount=1`)
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('location'), 'http://localhost:3000/orders/known-order')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
    assert.deepEqual(state.calls.at(-1), ['known-order', undefined, authority])
  }
  state.unavailable = true
  const failure = await invoke(`Authority=${authority}&Status=OK`)
  assert.equal(failure.status, 503)
  assert.ok(!(await failure.text()).includes(authority))
})
