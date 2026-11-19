/* eslint-disable @typescript-eslint/no-require-imports -- Passenger loads this CommonJS entry point. */
// cPanel / CloudLinux Passenger entry point. Keep .cjs: this project uses ESM.
process.env.NODE_ENV = 'production'
process.chdir(__dirname)

const passenger = global.PhusionPassenger
if (passenger) passenger.configure({ autoInstall: false })

const { createServer } = require('node:http')
const { readFileSync } = require('node:fs')
let release
try {
  const value = readFileSync(`${__dirname}/.next/DEPLOY_COMMIT`, 'utf8').trim()
  if (/^[0-9a-f]{40}$/.test(value)) release = value
} catch { /* Existing builds without a release stamp still start normally. */ }
const next = require('next')
const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      if (release) res.setHeader('X-Acoffee-Release', release)
      Promise.resolve(handle(req, res)).catch(() => {
        // Do not log request URLs: password-reset links contain sensitive tokens.
        console.error('cPanel request handling failed')
        if (!res.headersSent) res.writeHead(500)
        res.end()
      })
    })
    server.on('error', () => {
      console.error('cPanel HTTP server failed to start')
      process.exit(1)
    })
    if (passenger) server.listen('passenger')
    else server.listen(Number(process.env.PORT || 3000), '127.0.0.1')
  })
  .catch(() => {
    console.error(
      'Next.js startup failed. Check the production build and environment configuration.',
    )
    process.exit(1)
  })
