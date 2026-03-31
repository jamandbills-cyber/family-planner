// ─── Twilio SMS helper ────────────────────────────────────────
// Sends a text message via Twilio REST API.
// No SDK needed — plain fetch to keep the bundle small.

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER!

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.error('Twilio credentials not configured')
    return false
  }

  // Twilio needs E.164 format — ensure + prefix
  const toNumber = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_FROM,
        To:   toNumber,
        Body: body,
      }).toString(),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Twilio error:', err)
      return false
    }

    return true
  } catch (err) {
    console.error('SMS send failed:', err)
    return false
  }
}

// ─── Send to multiple numbers, return results ─────────────────
export async function sendBulkSMS(
  messages: Array<{ to: string; body: string; name: string }>
): Promise<{ name: string; success: boolean }[]> {
  const results = await Promise.allSettled(
    messages.map(m => sendSMS(m.to, m.body).then(ok => ({ name: m.name, success: ok })))
  )
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { name: messages[i].name, success: false }
  )
}
