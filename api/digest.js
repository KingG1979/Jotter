const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

function berlinHour() {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false }).format(new Date()));
}

module.exports = async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();

  // Two cron entries (14:00 and 15:00 UTC) cover summer and winter time; only the one landing at 16:xx Berlin sends.
  if (berlinHour() !== 16 && req.query.force !== '1') return res.status(200).json({ skipped: 'not 16:00 in Berlin' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'reminders' } });
  const { data, error } = await supabase.from('notes').select('id, transcript, created_at').neq('status', 'sent').order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  if (!data.length) return res.status(200).json({ sent: 0 });

  const body = 'Your reminders this week:\n' + data.map((n, i) => `${i + 1}. ${n.transcript || '(audio only, not transcribed)'}`).join('\n');

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({ to: process.env.MY_PHONE_NUMBER, from: process.env.TWILIO_FROM_NUMBER, body });

  await supabase.from('notes').update({ status: 'sent', sent_at: new Date().toISOString() }).in('id', data.map(n => n.id));
  res.status(200).json({ sent: data.length });
};
