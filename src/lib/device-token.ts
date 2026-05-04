import 'server-only'
import { getSupabaseAdmin } from './supabase'

export type DeviceTokenInfo = {
  valid: boolean
  deviceId?: string
  viewType?: 'kitchen' | 'personal'
  memberId?: string | null
  label?: string
}

// Validate a device token from a URL param.
// Used by /api/i/* routes to authorize input requests without requiring login.
export async function validateDeviceToken(token: string | null | undefined): Promise<DeviceTokenInfo> {
  if (!token) return { valid: false }
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('device_tokens')
    .select('id, view_type, member_id, label')
    .eq('token', token)
    .maybeSingle()
  if (error || !data) return { valid: false }
  return {
    valid: true,
    deviceId: data.id,
    viewType: data.view_type,
    memberId: data.member_id,
    label: data.label,
  }
}
