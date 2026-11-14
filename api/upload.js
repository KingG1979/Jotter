const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

function readBody(req) {
  return new Promise((resolve, reject) => {
    const parts = [];
    req.on('data', c => parts.push(c));
    req.on('end', () => resolve(Buffer.concat(parts)));
    req.on('error', reject);
  });
}

function same(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.APP_PASSPHRASE || !same(req.headers['x-passphrase'], process.env.APP_PASSPHRASE)) {
    return res.status(401).end();
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'reminders' } });
  const audio = await readBody(req);
  const type = (req.headers['content-type'] || 'audio/webm').split(';')[0];
  const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
  const path = `${Date.now()}.${ext}`;

  const up = await supabase.storage.from('reminder-audio').upload(path, audio, { contentType: type });
  if (up.error) return res.status(500).json({ error: up.error.message });

  let transcript = null;
  try {
    const form = new FormData();
    form.append('file', new Blob([audio], { type }), `note.${ext}`);
    form.append('model', 'whisper-1');
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });
    const j = await r.json();
    transcript = j.text || null;
  } catch (e) {}

  const ins = await supabase.from('notes').insert({ audio_path: path, transcript, status: transcript ? 'transcribed' : 'pending' });
  if (ins.error) return res.status(500).json({ error: ins.error.message });
  res.status(200).json({ ok: true });
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
