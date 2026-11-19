import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { introScript } from '../../app/intro'

function run({ path = '/', hash = '', reduced = false, seen = false, blocked = false } = {}) {
  const dataset: Record<string, string> = {}
  const timers: { run: () => void; ms: number }[] = []
  const document = { documentElement: { dataset }, addEventListener() {}, removeEventListener() {} }
  let stored = seen
  runInNewContext(introScript, {
    document, location: { pathname: path, hash }, matchMedia: () => ({ matches: reduced }),
    sessionStorage: { getItem() { if (blocked) throw Error(); return stored ? 'seen' : null }, setItem() { stored = true } },
    setTimeout: (run: () => void, ms: number) => timers.push({ run, ms }),
  })
  return { dataset, timers, stored }
}

test('intro plays only on the first eligible home visit', () => {
  const result = run()
  assert.equal(result.dataset.intro, 'drawing')
  assert.equal(result.stored, true)
  result.timers.find(timer => timer.ms === 2200)!.run()
  assert.equal(result.dataset.intro, 'revealing')
  result.timers.find(timer => timer.ms === 700)!.run()
  assert.equal(result.dataset.intro, undefined)
  for (const options of [{ seen: true }, { reduced: true }, { blocked: true }, { path: '/orders/123' }, { hash: '#coffee-selection' }])
    assert.equal(run(options).dataset.intro, undefined)
})

test('intro has a hard timeout independent of React hydration', () => {
  const result = run()
  result.timers.find(timer => timer.ms === 3200)!.run()
  assert.equal(result.dataset.intro, undefined)
})
