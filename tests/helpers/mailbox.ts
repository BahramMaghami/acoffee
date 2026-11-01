import { createServer, type Socket } from 'node:net'

// Loopback-only SMTP sink. Nothing is forwarded, persisted or printed.
export async function startMailbox(port = 3325) {
  const messages: { recipient: string; raw: string }[] = []
  const sockets = new Set<Socket>()
  let reject = false
  const server = createServer(socket => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    socket.on('error', () => {})
    socket.setEncoding('utf8')
    socket.write('220 localhost test SMTP\r\n')
    let buffer = '', recipient = '', data = '', readingData = false
    socket.on('data', chunk => {
      buffer += chunk
      let end: number
      while ((end = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2)
        if (readingData) {
          if (line !== '.') { data += `${line.replace(/^\.\./, '.')}\r\n`; continue }
          readingData = false
          if (reject) socket.write('451 test delivery failure\r\n')
          else { messages.push({ recipient, raw: data }); socket.write('250 accepted\r\n') }
          data = ''; continue
        }
        if (/^(EHLO|HELO) /i.test(line)) socket.write('250 localhost\r\n')
        else if (/^MAIL FROM:/i.test(line)) { recipient = ''; socket.write('250 OK\r\n') }
        else if (/^RCPT TO:/i.test(line)) { recipient = line.slice(8).trim().replace(/[<>]/g, ''); socket.write('250 OK\r\n') }
        else if (line === 'DATA') { readingData = true; data = ''; socket.write('354 End with dot\r\n') }
        else if (line === 'QUIT') socket.end('221 Bye\r\n')
        else socket.write('250 OK\r\n')
      }
    })
  })
  await new Promise<void>((resolve, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', resolve) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Mailbox did not start')
  return { messages, port: address.port, rejectDelivery: (value: boolean) => { reject = value },
    close: async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>((resolve, fail) => server.close(error => error ? fail(error) : resolve())) },
  }
}

export function decodedMessage(raw: string) {
  const base64 = [...raw.matchAll(/Content-Transfer-Encoding:\s*base64\r\n(?:[^\r\n]+\r\n)*\r\n([A-Za-z0-9+/=\r\n]+)/gi)]
    .map(match => Buffer.from(match[1].replace(/\s/g, ''), 'base64').toString('utf8')).join('\n')
  return raw.replace(/=\r\n/g, '').replace(/=3D/g, '=') + '\n' + base64
}

export function recoveryToken(raw: string) {
  const decoded = decodedMessage(raw)
  const token = /token=([A-Za-z0-9_-]{43})/.exec(decoded)?.[1]
  if (!token) throw new Error('Test message did not contain a recovery link')
  return token
}
