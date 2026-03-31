export default function TermsAndConditions() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F7F4EF', minHeight: '100vh', padding: '40px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 12, border: '1px solid #E8E3DB', padding: '48px 48px' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: '#8B8599', marginBottom: 8 }}>Family Planner</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Terms &amp; Conditions</h1>
          <div style={{ fontSize: 13, color: '#8B8599' }}>Last updated: March 2026</div>
        </div>

        {[
          {
            title: '1. Program Description',
            body: 'Family Planner is a private, invite-only weekly scheduling application operated for personal family use. The application sends SMS notifications to family members to facilitate weekly scheduling, transportation coordination, and meal planning.'
          },
          {
            title: '2. Who Can Use This Application',
            body: 'This application is restricted exclusively to family members whose phone numbers have been added to the application by the administrator. There is no public access or sign-up process. All users are known individuals with a pre-existing family relationship to the administrator.'
          },
          {
            title: '3. SMS Messaging Terms',
            body: 'By providing your phone number to the application administrator, you consent to receive SMS messages from Family Planner. Message frequency is approximately 2–3 messages per week, including:\n\n• A Sunday morning message with your weekly planning form link\n• A reminder message if your form is not completed by the deadline\n• A post-meeting message with the confirmed weekly plan\n\nMessage and data rates may apply depending on your mobile carrier and plan.'
          },
          {
            title: '4. How to Stop Receiving Messages',
            body: 'You may opt out of SMS messages at any time.\n\nReply STOP to any message to unsubscribe. You will receive one confirmation message and no further messages will be sent to your number.\n\nReply HELP to any message for assistance.\n\nTo be re-added to the application, contact the administrator directly.'
          },
          {
            title: '5. Support',
            body: 'For help with this application or its SMS notifications, reply HELP to any message or contact the application administrator directly.'
          },
          {
            title: '6. Message and Data Rates',
            body: 'Message and data rates may apply. Contact your mobile carrier for information about your specific plan. Family Planner does not charge any fees for sending or receiving messages through this application.'
          },
          {
            title: '7. Privacy',
            body: 'Your personal information is handled in accordance with our Privacy Policy, available at https://family-planner-tawny.vercel.app/privacy. We do not sell or share your information with third parties for marketing purposes.'
          },
          {
            title: '8. Changes to These Terms',
            body: 'The administrator may update these terms at any time. Continued participation in the family planning application constitutes acceptance of any updated terms.'
          },
          {
            title: '9. Limitation of Liability',
            body: 'This application is provided for personal family use on an as-is basis. The administrator is not liable for any missed notifications, scheduling errors, or other issues arising from use of the application.'
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 10 }}>{section.title}</h2>
            <p style={{ fontSize: 14, color: '#4A4A5A', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{section.body}</p>
          </div>
        ))}

        {/* Highlighted STOP/HELP section — required by carriers */}
        <div style={{ margin: '32px 0', padding: '20px 24px', background: '#F7F4EF', borderRadius: 10, border: '1px solid #E8E3DB' }}>
          <div style={{ fontSize: 14, color: '#1A1A2E', lineHeight: 1.8 }}>
            <p>To opt out of messages at any time, reply <strong>STOP</strong>.</p>
            <p>For help, reply <strong>HELP</strong>.</p>
            <p style={{ marginTop: 8, color: '#8B8599', fontSize: 13 }}>Message and data rates may apply. Approximately 2–3 messages per week.</p>
          </div>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E8E3DB', fontSize: 13, color: '#8B8599' }}>
          <a href="/" style={{ color: '#C4522A', textDecoration: 'none' }}>← Back to Family Planner</a>
        </div>
      </div>
    </div>
  )
}
