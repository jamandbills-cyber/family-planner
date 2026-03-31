export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F7F4EF', minHeight: '100vh', padding: '40px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 12, border: '1px solid #E8E3DB', padding: '48px 48px' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: '#8B8599', marginBottom: 8 }}>Family Planner</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Privacy Policy</h1>
          <div style={{ fontSize: 13, color: '#8B8599' }}>Last updated: March 2026</div>
        </div>

        {[
          {
            title: '1. Overview',
            body: 'Family Planner is a private, invite-only application used exclusively by a single family for weekly scheduling and coordination. This policy describes how personal information is collected, used, and protected within the application.'
          },
          {
            title: '2. Information We Collect',
            body: 'We collect the following information solely for the purpose of operating the family scheduling application:\n\n• Names of family members\n• Phone numbers (used to send weekly planning notifications via SMS)\n• Email addresses (used to send weekly plan summaries)\n• Schedule information and availability submitted voluntarily through the weekly planning forms\n• Grocery and shopping requests submitted through the weekly planning forms'
          },
          {
            title: '3. How We Use Your Information',
            body: 'All information collected is used exclusively to:\n\n• Send weekly planning form links via SMS to family members\n• Send deadline reminder notifications via SMS\n• Send weekly plan summaries via email after the family meeting\n• Display schedule and coordination information within the private application\n\nWe do not use any collected information for marketing, advertising, or any commercial purpose.'
          },
          {
            title: '4. SMS Communications',
            body: 'Phone numbers are collected directly by the application administrator from family members who have consented to participate in the family planning application. Family members receive:\n\n• One SMS per week on Sunday morning with a link to their weekly planning form\n• One reminder SMS if they have not completed their form by the configured deadline\n• One SMS after the Sunday family meeting with a link to the confirmed weekly plan\n\nMessage and data rates may apply. Message frequency is approximately 2–3 messages per week.'
          },
          {
            title: '5. Data Storage',
            body: 'Information is stored in a private Google Sheet accessible only to the application administrator. Calendar data is read from a private Google Calendar. No data is sold, shared, or transmitted to any third party. Data is not used for advertising or marketing purposes of any kind.'
          },
          {
            title: '6. Data Sharing',
            body: 'We do not sell, trade, rent, or otherwise share personal information with third parties. The only external services used are:\n\n• Google (Calendar and Sheets APIs) — for storing and reading family scheduling data\n• Twilio — for delivering SMS notifications to family members\n• Vercel — for hosting the application\n\nEach of these services has its own privacy policy governing their handling of data.'
          },
          {
            title: '7. Opt-Out',
            body: 'Family members may opt out of SMS notifications at any time by replying STOP to any message. To be removed from the application entirely, contact the application administrator directly.'
          },
          {
            title: '8. Data Retention',
            body: 'Weekly planning submissions are retained in Google Sheets for reference purposes. Family members may request that their data be deleted at any time by contacting the application administrator.'
          },
          {
            title: '9. Contact',
            body: 'This application is privately operated. For any questions about this privacy policy or your data, contact the application administrator directly.'
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 10 }}>{section.title}</h2>
            <p style={{ fontSize: 14, color: '#4A4A5A', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{section.body}</p>
          </div>
        ))}

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E8E3DB', fontSize: 13, color: '#8B8599' }}>
          <a href="/" style={{ color: '#C4522A', textDecoration: 'none' }}>← Back to Family Planner</a>
        </div>
      </div>
    </div>
  )
}
