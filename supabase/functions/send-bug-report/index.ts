// @ts-nocheck

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const SMTP_EMAIL = Deno.env.get('SMTP_EMAIL') ?? ''
const SMTP_PASS = Deno.env.get('SMTP_PASS') ?? ''
const TO_EMAIL = 'asepdotstudio@gmail.com'

async function sendEmail(title: string, description: string) {
  const encoder = new TextEncoder()
  const auth = btoa(`\0${SMTP_EMAIL}\0${SMTP_PASS}`)
  const msg = [
    `From: ${SMTP_EMAIL}`,
    `To: ${TO_EMAIL}`,
    `Subject: [Bug Report DuitGue] ${title}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    `<h2>🐛 Laporan Bug DuitGue</h2>
     <p><strong>Judul:</strong> ${title}</p>
     <p><strong>Deskripsi:</strong></p>
     <p>${description.replace(/\n/g, '<br>')}</p>`,
  ].join('\r\n')

  const sock = await Deno.connectTls({ hostname: 'smtp.gmail.com', port: 465 })
  const buf = new Uint8Array(4096)

  const read = async () => { buf.fill(0); const n = await sock.read(buf); return new TextDecoder().decode(buf.slice(0, n)) }
  const write = async (s: string) => { await sock.write(encoder.encode(s + '\r\n')); return await read() }

  await read()
  await write(`EHLO duitgue-app`)
  await write(`AUTH PLAIN ${auth}`)
  await write(`MAIL FROM:<${SMTP_EMAIL}>`)
  await write(`RCPT TO:<${TO_EMAIL}>`)
  await write('DATA')
  await write(`${msg}\r\n.`)
  await write('QUIT')
  sock.close()
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const { title, description } = await req.json()

    if (!title || !description) {
      return new Response(JSON.stringify({ error: 'Title and description are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    await sendEmail(title, description)

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
