export type EmailSendResult = {
  ok: boolean
  error?: string
}

export async function sendEmail(
  opts: {
    to: string[]
    subject: string
    html: string
  }
): Promise<boolean> {
  const result = await sendEmailWithResult(opts)
  return result.ok
}

export async function sendEmailWithResult(
  opts: {
    to: string[]
    subject: string
    html: string
  }
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  if (!from) return { ok: false, error: 'EMAIL_FROM is not configured.' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    })

    if (res.ok) return { ok: true }

    const data = await res.json().catch(() => null)
    return { ok: false, error: describeResendError(res.status, data) }
  } catch (err) {
    console.error('Resend email error:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown Resend error' }
  }
}

function describeResendError(status: number, data: any): string {
  const message = data?.message ?? data?.error ?? data?.name
  return message ? `Resend API ${status}: ${message}` : `Resend API ${status}: Email send failed.`
}

// ─── Build the weekly plan HTML email ────────────────────────
export function buildWeeklyPlanEmail(plan: any): string {
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  const scheduleRows = (plan.schedule ?? [])
    .filter((day: any) => day.events?.length > 0 || plan.dinner?.find((d: any) => d.day === day.day)?.meal)
    .map((day: any) => {
      const dinner = plan.dinner?.find((d: any) => d.day === day.day)
      const eventRows = (day.events ?? []).map((evt: any) => `
        <tr>
          <td style="padding:6px 12px;font-size:14px;color:#1A1A2E;">${evt.title}</td>
          <td style="padding:6px 12px;font-size:14px;color:#8B8599;">${evt.time}</td>
          <td style="padding:6px 12px;font-size:14px;color:#C4522A;font-weight:600;">${evt.driver ? `🚗 ${evt.driver}` : ''}</td>
        </tr>
      `).join('')

      const dinnerRow = dinner?.meal ? `
        <tr style="background:#FFFBF5;">
          <td style="padding:6px 12px;font-size:13px;color:#B45309;">🍽 ${dinner.meal}</td>
          <td style="padding:6px 12px;font-size:13px;color:#8B8599;"></td>
          <td style="padding:6px 12px;font-size:13px;color:#B45309;">${dinner.cook ? `${dinner.cook} cooking` : ''}</td>
        </tr>
      ` : ''

      return `
        <tr><td colspan="3" style="padding:16px 12px 6px;font-size:13px;font-weight:700;color:#1A1A2E;text-transform:uppercase;letter-spacing:0.06em;border-top:2px solid #E8E3DB;">${day.day}</td></tr>
        ${eventRows}
        ${dinnerRow}
      `
    }).join('')

  const shoppingItems = (plan.shopping ?? [])
    .map((item: any) => `<li style="padding:4px 0;font-size:14px;color:#1A1A2E;">${item.qty ? `${item.qty} × ` : ''}${item.item} <span style="color:#8B8599;font-size:12px;">(${item.who})</span></li>`)
    .join('')

  const agendaItems = (plan.agenda ?? [])
    .map((item: string, i: number) => `<li style="padding:4px 0;font-size:14px;color:#1A1A2E;"><strong>${i+1}.</strong> ${item}</li>`)
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:'-apple-system',sans-serif;background:#F7F4EF;margin:0;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #E8E3DB;overflow:hidden;">

        <!-- Header -->
        <div style="background:#1A1A2E;padding:28px 32px;">
          <div style="font-size:11px;color:#7070A0;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Family Weekly Plan</div>
          <div style="font-size:24px;font-weight:700;color:#fff;">${plan.weekLabel ?? 'This Week'}</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">Confirmed at the family meeting</div>
        </div>

        <!-- Schedule -->
        <div style="padding:24px 32px 0;">
          <div style="font-size:16px;font-weight:700;color:#1A1A2E;margin-bottom:12px;">📅 Week Schedule</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#F7F4EF;">
                <th style="padding:8px 12px;font-size:12px;color:#8B8599;text-align:left;font-weight:600;">Event</th>
                <th style="padding:8px 12px;font-size:12px;color:#8B8599;text-align:left;font-weight:600;">Time</th>
                <th style="padding:8px 12px;font-size:12px;color:#8B8599;text-align:left;font-weight:600;">Driver</th>
              </tr>
            </thead>
            <tbody>${scheduleRows}</tbody>
          </table>
        </div>

        ${shoppingItems ? `
        <!-- Shopping -->
        <div style="padding:24px 32px 0;">
          <div style="font-size:16px;font-weight:700;color:#1A1A2E;margin-bottom:12px;">🛒 Shopping List</div>
          <ul style="margin:0;padding-left:20px;">${shoppingItems}</ul>
        </div>` : ''}

        ${agendaItems ? `
        <!-- Agenda -->
        <div style="padding:24px 32px 0;">
          <div style="font-size:16px;font-weight:700;color:#1A1A2E;margin-bottom:12px;">📋 Meeting Notes</div>
          <ul style="margin:0;padding-left:20px;">${agendaItems}</ul>
        </div>` : ''}

        <!-- Live link -->
        <div style="padding:24px 32px;">
          <div style="background:#F0FDF4;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:13px;color:#166534;margin-bottom:8px;">View the live plan anytime</div>
            <a href="${process.env.NEXTAUTH_URL}/plan" style="color:#15803D;font-weight:600;font-size:14px;">${process.env.NEXTAUTH_URL}/plan</a>
          </div>
        </div>

      </div>
    </body>
    </html>
  `
}
