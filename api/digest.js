const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

function berlinHour() {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false }).format(new Date()));
}

function same(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function telegram(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.description || `Telegram returned ${r.status}`);
  return j.result;
}

// Telegram allows 4096 characters per message, so long digests are split on line breaks.
function chunks(text, max = 3800) {
  const out = [];
  let cur = '';
  for (const line of text.split('\n')) {
    let l = line;
    while (l.length > max) { if (cur) { out.push(cur); cur = ''; } out.push(l.slice(0, max)); l = l.slice(max); }
    if (cur && cur.length + l.length + 1 > max) { out.push(cur); cur = l; }
    else cur = cur ? cur + '\n' + l : l;
  }
  if (cur) out.push(cur);
  return out;
}

module.exports = async (req, res) => {
  // Two ways in: the Saturday cron (CRON_SECRET), or "Send digest now" in the app (POST with the passphrase).
  const byCron = !!process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  const byApp = req.method === 'POST' && !!process.env.APP_PASSPHRASE && same(req.headers['x-passphrase'], process.env.APP_PASSPHRASE);
  if (!byCron && !byApp) return res.status(401).end();

  // Two cron entries (14:00 and 15:00 UTC) cover summer and winter time; only the one landing at 16:xx Berlin sends.
  if (byCron && !byApp && berlinHour() !== 16 && req.query.force !== '1') return res.status(200).json({ skipped: 'not 16:00 in Berlin' });

  if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not set in Vercel.' });

  // Setup helper: until TELEGRAM_CHAT_ID is set, report the chat ID of whoever messaged the bot.
  if (!process.env.TELEGRAM_CHAT_ID) {
    try {
      const updates = await telegram('getUpdates');
      const ids = [...new Set(updates.map(u => u.message && u.message.chat && u.message.chat.type === 'private' && u.message.chat.id).filter(Boolean))];
      if (!ids.length) return res.status(500).json({ error: 'Send /start to your bot in Telegram, then tap "Send digest now" again.' });
      return res.status(500).json({ error: `Set TELEGRAM_CHAT_ID to ${ids.join(' or ')} in Vercel, then redeploy.` });
    } catch (e) {
      return res.status(502).json({ error: 'Telegram failed: ' + e.message });
    }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'reminders' } });
  const { data, error } = await supabase.from('notes').select('id, transcript, created_at').neq('status', 'sent').order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  if (!data.length) return res.status(200).json({ sent: 0 });

  const body = 'Your reminders this week:\n' + data.map((n, i) => `${i + 1}. ${n.transcript || '(audio only, not transcribed)'}`).join('\n');

  try {
    for (const text of chunks(body)) await telegram('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text });
  } catch (e) {
    console.error('Telegram send failed:', e.message);
    return res.status(502).json({ error: 'Telegram failed: ' + e.message });
  }

  const upd = await supabase.from('notes').update({ status: 'sent', sent_at: new Date().toISOString() }).in('id', data.map(n => n.id));
  if (upd.error) return res.status(500).json({ error: 'Message sent, but marking notes as sent failed: ' + upd.error.message });
  res.status(200).json({ sent: data.length });
};
