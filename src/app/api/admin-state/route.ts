import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!
const TAB = 'AdminState'

function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.sheets({ version: 'v4', auth })
}

// ─── GET — load saved state for a given weekStart ─────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
  }

  try {
    const sheets = getSheetsClient(session.accessToken)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: `${TAB}!A2:C200`,
    })

    const rows = (res.data.values ?? []) as string[][]

    // Find the most recent saved row for this weekStart
    const matching = rows
      .filter(r => r[0] === weekStart)
      .sort((a, b) => b[1].localeCompare(a[1])) // latest savedAt first

    if (matching.length === 0) {
      return NextResponse.json({ found: false })
    }

    const stateJSON = matching[0][2]
    const state = JSON.parse(stateJSON)

    return NextResponse.json({ found: true, state, savedAt: matching[0][1] })
  } catch (err) {
    console.error('Load state error:', err)
    return NextResponse.json({ error: 'Failed to load state' }, { status: 500 })
  }
}

// ─── POST — save current state ────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { weekStart, state } = await req.json()
    if (!weekStart || !state) {
      return NextResponse.json({ error: 'weekStart and state required' }, { status: 400 })
    }

    const sheets = getSheetsClient(session.accessToken)
    const savedAt = new Date().toISOString()

    // First check if a row already exists for this weekStart
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: `${TAB}!A2:C200`,
    })

    const rows = (existing.data.values ?? []) as string[][]
    const rowIdx = rows.findIndex(r => r[0] === weekStart)

    if (rowIdx >= 0) {
      // Update existing row (row 2 = index 0, so add 2)
      const sheetRow = rowIdx + 2
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `${TAB}!A${sheetRow}:C${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[weekStart, savedAt, JSON.stringify(state)]]
        }
      })
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEETS_ID,
        range: `${TAB}!A:C`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[weekStart, savedAt, JSON.stringify(state)]]
        }
      })
    }

    return NextResponse.json({ saved: true, savedAt })
  } catch (err) {
    console.error('Save state error:', err)
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 })
  }
}
