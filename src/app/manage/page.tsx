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

  const supabase = getSupabaseAdmin()
  const [
    { count: memberCount },
    { count: projectCount },
    { count: deviceCount },
    { count: openTaskCount },
    { count: ideaCount },
  ] = await Promise.all([
    supabase.from('family_members').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('device_tokens').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).is('completed_at', null),
    supabase.from('ideas').select('*', { count: 'exact', head: true }),
  ])

  const tiles = [
    {
      href: '/admin/family',
      label: 'Roster',
      blurb: `${memberCount ?? 0} family members`,
      desc: 'Add, edit, or remove family members. Manage names, emails, phones, and roles.',
      color: '#7F77DD',
    },
    {
      href: '/admin/tasks',
      label: 'Tasks',
      blurb: `${openTaskCount ?? 0} open tasks`,
      desc: 'Add tasks for any family member. They show up on the kitchen TV and personal dashboards.',
      color: '#C4522A',
    },
    {
      href: '/admin/ideas',
      label: 'Ideas',
      blurb: `${ideaCount ?? 0} ideas`,
      desc: 'Random thoughts, wishlist items, things to remember. Less structured than tasks.',
      color: '#D4A017',
    },
    {
      href: '/admin/projects',
      label: 'Projects',
      blurb: `${projectCount ?? 0} active projects`,
      desc: 'Group tasks under projects. Mark a project as shared to put it on every dashboard.',
      color: '#1D9E75',
    },
    {
      href: '/admin/photos',
      label: 'Photos',
      blurb: 'Photo rotation',
      desc: 'Upload photos that rotate on the kitchen TV.',
      color: '#4A90D9',
    },
    {
      href: '/admin/devices',
      label: 'Devices',
      blurb: `${deviceCount ?? 0} devices`,
      desc: 'Mint URLs for wall-mounted dashboards. Toggle landscape/portrait or revoke access.',
      color: '#D85A30',
    },
  ]

  const sundayTiles = [
    {
      href: '/admin',
      label: 'Sunday Setup',
      desc: 'Choose transportation needs, dinners, deadlines, and planning links for the week.',
    },
    {
      href: '/meeting',
      label: 'Family Meeting',
      desc: 'Review submissions, assign drivers, finish the agenda, and confirm the weekly plan.',
    },
    {
      href: '/plan',
      label: 'Live Plan',
      desc: 'Open the current published plan that the family can bookmark.',
    },
  ]

  return (
    <AuthedLayout>
      <div style={{ maxWidth: 900, margin: '40px auto', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 6, color: '#1A1A2E' }}>
          Manage
        </h1>
        <p style={{ fontSize: 14, color: '#8B8599', marginBottom: 28 }}>
          Family-wide settings. Anything you change here affects every dashboard.
        </p>

        <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
          {tiles.map(t => (
            <Link key={t.href} href={t.href}
              style={{
                display: 'block', padding: 20, background: '#fff',
                border: '1px solid #E2DDD6', borderRadius: 12,
                textDecoration: 'none', color: 'inherit',
                borderLeft: `4px solid ${t.color}`,
              }}>
              <div style={{ display: 'flex', alignItems: 'baseline',
                            justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{t.label}</span>
                <span style={{ fontSize: 13, color: '#8B8599', textAlign: 'right' }}>{t.blurb}</span>
              </div>
              <p style={{ fontSize: 13, color: '#4A4A5A', margin: 0, lineHeight: 1.5 }}>
                {t.desc}
              </p>
            </Link>
          ))}
        </div>

        <div style={{ padding: 18, background: '#FFFBEB',
                      border: '1px solid #FDE68A', borderRadius: 12,
                      color: '#92400E', lineHeight: 1.5 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
            Sunday Planning
          </div>
          <p style={{ fontSize: 13, color: '#92400E', margin: '0 0 14px' }}>
            Weekly setup, the Sunday meeting, and the live plan are grouped here because they use the Google Calendar planning flow.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            {sundayTiles.map(t => (
              <Link key={t.href} href={t.href}
                style={{ display: 'block', padding: 14, background: '#fff', border: '1px solid #FDE68A', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 3 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: '#92400E' }}>{t.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AuthedLayout>
  )
}
