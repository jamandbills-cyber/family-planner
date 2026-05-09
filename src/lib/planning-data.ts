import 'server-only'

import { getSupabaseAdmin } from './supabase'

export type PlanningMember = {
  id: string
  name: string
  type: 'adult' | 'child'
  phone: string
  email: string
  color: string
  canDrive: boolean
}

export type PlanningToken = {
  token: string
  memberId: string
  weekStart: string
  formType: 'kid' | 'adult'
  usedAt: string
}

export type PlanningSubmission = {
  submittedAt: string
  memberId: string
  formType: string
  weekStart: string
  payload: any
}

export async function getPlanningMembers(): Promise<PlanningMember[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('family_members')
    .select('id, display_name, type, phone, email, color, can_drive')
    .order('type', { ascending: false })
    .order('display_name')

  if (error) throw new Error(`Family members: ${error.message}`)

  return (data ?? []).map(m => ({
    id: m.id,
    name: m.display_name,
    type: m.type,
    phone: m.phone ?? '',
    email: m.email ?? '',
    color: m.color ?? '#8B8599',
    canDrive: !!m.can_drive,
  }))
}

export async function savePlanningTokens(tokens: Omit<PlanningToken, 'usedAt'>[]) {
  if (tokens.length === 0) return
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('form_tokens')
    .upsert(
      tokens.map(t => ({
        token: t.token,
        member_id: t.memberId,
        week_start: t.weekStart,
        form_type: t.formType,
      })),
      { onConflict: 'token' }
    )

  if (error) throw new Error(`Save form tokens: ${error.message}`)
}

export async function getPlanningToken(
  token: string,
  expectedType?: 'kid' | 'adult'
): Promise<(PlanningToken & { member: PlanningMember }) | null> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('form_tokens')
    .select('token, member_id, week_start, form_type, used_at')
    .eq('token', token)

  if (expectedType) query = query.eq('form_type', expectedType)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`Form token: ${error.message}`)
  if (!data) return null

  const { data: member, error: memberError } = await supabase
    .from('family_members')
    .select('id, display_name, type, phone, email, color, can_drive')
    .eq('id', data.member_id)
    .maybeSingle()

  if (memberError) throw new Error(`Token member: ${memberError.message}`)
  if (!member) return null

  return {
    token: data.token,
    memberId: data.member_id,
    weekStart: data.week_start,
    formType: data.form_type,
    usedAt: data.used_at ?? '',
    member: {
      id: member.id,
      name: member.display_name,
      type: member.type,
      phone: member.phone ?? '',
      email: member.email ?? '',
      color: member.color ?? '#8B8599',
      canDrive: !!member.can_drive,
    },
  }
}

export async function savePlanningSubmission(
  token: string,
  expectedType: 'kid' | 'adult',
  payload: object
) {
  const record = await getPlanningToken(token, expectedType)
  if (!record) return null

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('form_submissions')
    .insert({
      member_id: record.memberId,
      form_type: record.formType,
      week_start: record.weekStart,
      payload,
    })

  if (error) throw new Error(`Save submission: ${error.message}`)

  await supabase
    .from('form_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)

  return record
}

export async function getLatestPlanningSubmissions(weekStart: string): Promise<PlanningSubmission[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('form_submissions')
    .select('submitted_at, member_id, form_type, week_start, payload')
    .eq('week_start', weekStart)
    .order('submitted_at', { ascending: false })

  if (error) throw new Error(`Submissions: ${error.message}`)

  const byMember = new Map<string, PlanningSubmission>()
  for (const row of data ?? []) {
    if (byMember.has(row.member_id)) continue
    byMember.set(row.member_id, {
      submittedAt: row.submitted_at,
      memberId: row.member_id,
      formType: row.form_type,
      weekStart: row.week_start,
      payload: row.payload ?? {},
    })
  }

  return Array.from(byMember.values())
}

export async function getPlanningTokensForWeek(weekStart: string): Promise<PlanningToken[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('form_tokens')
    .select('token, member_id, week_start, form_type, used_at')
    .eq('week_start', weekStart)

  if (error) throw new Error(`Form tokens: ${error.message}`)

  return (data ?? []).map(row => ({
    token: row.token,
    memberId: row.member_id,
    weekStart: row.week_start,
    formType: row.form_type,
    usedAt: row.used_at ?? '',
  }))
}

export async function publishPlanningPlan(weekStart: string, plan: object) {
  const supabase = getSupabaseAdmin()
  const confirmedAt = new Date().toISOString()
  const { error } = await supabase
    .from('published_plans')
    .upsert({
      week_start: weekStart,
      confirmed_at: confirmedAt,
      plan,
    })

  if (error) throw new Error(`Publish plan: ${error.message}`)
  return confirmedAt
}

export async function getLatestPublishedPlan() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('published_plans')
    .select('week_start, confirmed_at, plan')
    .order('confirmed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Published plan: ${error.message}`)
  if (!data) return null

  return {
    weekStart: data.week_start,
    confirmedAt: data.confirmed_at,
    plan: data.plan,
  }
}
