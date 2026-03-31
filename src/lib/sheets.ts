import { google } from 'googleapis'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!

// ─── Auth ─────────────────────────────────────────────────────
function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.sheets({ version: 'v4', auth })
}

// ─── Read a range from the sheet ─────────────────────────────
async function readRange(accessToken: string, range: string): Promise<string[][]> {
  const sheets = getSheetsClient(accessToken)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID,
    range,
  })
  return (res.data.values ?? []) as string[][]
}

// ─── Append rows to a sheet ───────────────────────────────────
async function appendRows(accessToken: string, range: string, rows: string[][]) {
  const sheets = getSheetsClient(accessToken)
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_ID,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  })
}

// ─── Write to a specific range (overwrite) ────────────────────
async function writeRange(accessToken: string, range: string, rows: string[][]) {
  const sheets = getSheetsClient(accessToken)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEETS_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  })
}

// ═══════════════════════════════════════════════════════════
// FAMILY MEMBERS
// ═══════════════════════════════════════════════════════════

export interface SheetMember {
  id: string
  name: string
  type: 'adult' | 'child'
  phone: string
  email: string
  color: string
}

export async function getFamilyMembers(accessToken: string): Promise<SheetMember[]> {
  // Sheet: "Family" with columns: id, name, type, phone, email, color
  const rows = await readRange(accessToken, 'Family!A2:F100')
  return rows
    .filter(r => r[0]) // skip empty rows
    .map(r => ({
      id:    r[0]?.trim() ?? '',
      name:  r[1]?.trim() ?? '',
      type:  (r[2]?.trim() ?? 'adult') as 'adult' | 'child',
      phone: r[3]?.trim() ?? '',
      email: r[4]?.trim() ?? '',
      color: r[5]?.trim() ?? '#8B8599',
    }))
}

// ═══════════════════════════════════════════════════════════
// FORM TOKENS
// Stored in sheet "Tokens": token, memberId, weekStart, formType, usedAt
// ═══════════════════════════════════════════════════════════

export interface TokenRecord {
  token: string
  memberId: string
  weekStart: string
  formType: 'kid' | 'adult'
  usedAt: string
}

export async function getToken(
  accessToken: string,
  token: string
): Promise<TokenRecord | null> {
  const rows = await readRange(accessToken, 'Tokens!A2:E500')
  const row = rows.find(r => r[0] === token)
  if (!row) return null
  return {
    token:     row[0],
    memberId:  row[1],
    weekStart: row[2],
    formType:  row[3] as 'kid' | 'adult',
    usedAt:    row[4] ?? '',
  }
}

export async function saveTokens(
  accessToken: string,
  tokens: Omit<TokenRecord, 'usedAt'>[]
) {
  const rows = tokens.map(t => [t.token, t.memberId, t.weekStart, t.formType, ''])
  await appendRows(accessToken, 'Tokens!A:E', rows)
}

// ═══════════════════════════════════════════════════════════
// FORM SUBMISSIONS
// Sheet "Submissions": submittedAt, memberId, formType, weekStart, payload (JSON)
// ═══════════════════════════════════════════════════════════

export async function saveSubmission(
  accessToken: string,
  memberId: string,
  formType: 'kid' | 'adult',
  weekStart: string,
  payload: object
) {
  await appendRows(accessToken, 'Submissions!A:E', [[
    new Date().toISOString(),
    memberId,
    formType,
    weekStart,
    JSON.stringify(payload),
  ]])
}

export async function getSubmissions(
  accessToken: string,
  weekStart: string
): Promise<Array<{ memberId: string; formType: string; payload: object; submittedAt: string }>> {
  const rows = await readRange(accessToken, 'Submissions!A2:E500')
  return rows
    .filter(r => r[3] === weekStart)
    .map(r => ({
      submittedAt: r[0],
      memberId:    r[1],
      formType:    r[2],
      weekStart:   r[3],
      payload:     JSON.parse(r[4] ?? '{}'),
    }))
}

// ═══════════════════════════════════════════════════════════
// WEEKLY PLAN (confirmed plan stored for live page)
// Sheet "Plans": weekStart, confirmedAt, planJSON
// ═══════════════════════════════════════════════════════════

export async function savePlan(
  accessToken: string,
  weekStart: string,
  plan: object
) {
  await appendRows(accessToken, 'Plans!A:C', [[
    weekStart,
    new Date().toISOString(),
    JSON.stringify(plan),
  ]])
}

export async function getLatestPlan(
  accessToken: string
): Promise<{ weekStart: string; confirmedAt: string; plan: object } | null> {
  const rows = await readRange(accessToken, 'Plans!A2:C100')
  if (rows.length === 0) return null
  const last = rows[rows.length - 1]
  return {
    weekStart:   last[0],
    confirmedAt: last[1],
    plan:        JSON.parse(last[2] ?? '{}'),
  }
}
