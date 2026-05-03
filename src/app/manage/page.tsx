import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentMember } from '@/lib/auth-helpers'
import { AuthedLayout } from '@/lib/AuthedLayout'
import { getSupabaseAdmin } from '@/lib/supabase'

export default async function ManagePage() {
  const me = await getCurrentMember()
  if (!me) redirect('/login')

  if (me.role !== 'admin') {
    return (
      <AuthedLayout>
        <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
          Admins only.
        </div>
      </AuthedLayout>
    )
  }

  // Quick counts to show on each tile so the admin sees state at a glance
  const supabase = getSupabaseAdmin()
  const { count: memberCount } = await supabase
    .from('family_members').select('*', { count: 'exact', head: true })
  const { count: projectCount } = await supabase
    .from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: deviceCount } = await supabase
    .from('device_tokens').select('*', { count: 'exact', head: true }).eq('revoked', false)

  const tiles = [
    {
      href: '/admin/family',
      label: 'Roster',
      blurb: `${memberCount ?? 0} family members`,
      desc: 'Add, edit, or remove family members. Manage names, emails, phones, and roles.',
      color: '#7F77DD',
    },
    {
      href: '/admin/projects',
      label: 'Projects',
      blurb: `${projectCount ?? 0} active projects`,
      desc: 'Create projects and add tasks. Mark projects as shared to put them on every dashboard.',
      color: '#1D9E75',
    },
    {
      href: '/admin/devices',
      label: 'Devices',
      blurb: `${deviceCount ?? 0} active devices`,
      desc: 'Mint URLs for wall-mounted dashboards. Revoke a URL to disable a display.',
      color: '#D85A30',
    },
  ]

  return (
    <AuthedLayout>
      <div style={{ maxWidth: 720, margin: '40px auto', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 6, color: '#1A1A2E' }}>
          Manage
        </h1>
        <p style={{ fontSize: 14, color: '#8B8599', marginBottom: 28 }}>
          Family-wide settings. Anything you change here affects every dashboard.
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          {tiles.map(t => (
            <Link key={t.href} href={t.href}
              style={{
                display: 'block', padding: 20, background: '#fff',
                border: '1px solid #E2DDD6', borderRadius: 12,
                textDecoration: 'none', color: 'inherit',
                borderLeft: `4px solid ${t.color}`,
              }}>
              <div style={{ display: 'flex', alignItems: 'baseline',
                            justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{t.label}</span>
                <span style={{ fontSize: 13, color: '#8B8599' }}>{t.blurb}</span>
              </div>
              <p style={{ fontSize: 13, color: '#4A4A5A', margin: 0, lineHeight: 1.5 }}>
                {t.desc}
              </p>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 36, padding: 16, background: '#FFFBEB',
                      border: '1px solid #FDE68A', borderRadius: 8,
                      fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
          <strong>Heads up:</strong> Sunday Planning (the weekly meeting flow,
          driving assignments, and SMS sends) lives at <code style={{
            background: '#fff', padding: '1px 5px', borderRadius: 3,
            fontSize: 12 }}>/admin</code> and uses a separate Google sign-in.
          If you tap "Sunday Plan" in the bottom nav and get sent to a Google
          login, that's expected.
        </div>
      </div>
    </AuthedLayout>
  )
}
