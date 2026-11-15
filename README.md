# Jotter

Tap a button, speak a reminder, and get every note from the week as one SMS (Short Message Service) text on Saturday at 16:00 Berlin time.

Live at https://jotter-rust.vercel.app

## How it works

1. Opening the app starts recording straight away (after the passphrase has been saved once on that phone).
2. Recording stops by itself after 5 seconds of silence. A beep confirms the save.
3. The audio is stored in Supabase and transcribed with OpenAI Whisper.
4. Every Saturday at 16:00 Berlin time, a scheduled job sends all unsent notes as one text message via Twilio and marks them as sent.

If nothing is said, nothing is saved. A single note is limited to 3 minutes. Tapping the button stops a recording manually.

## Project structure

| File | Purpose |
|---|---|
| `public/index.html` | Recording page: auto-start, silence detection, upload |
| `public/manifest.json` | Lets the page be installed to the home screen as a PWA (Progressive Web App) |
| `api/upload.js` | Checks the passphrase, stores the audio, transcribes it, saves the note |
| `api/digest.js` | Weekly digest: collects unsent notes and sends the SMS |
| `vercel.json` | Cron schedule for the digest |

## Setup

### Supabase

- Schema `reminders` with table `notes` (id, created_at, audio_path, transcript, status, sent_at). Row level security is on and only the service role has access.
- Private storage bucket `reminder-audio`.
- Under Project Settings, Data API, `reminders` must be added to the exposed schemas. Without this, saving a note fails with a 500 error.

### Vercel environment variables

Set these in the project settings and redeploy afterwards. Never commit them.

| Variable | Value |
|---|---|
| `APP_PASSPHRASE` | Shared passphrase typed into the app once per phone |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | OpenAI API (Application Programming Interface) key, used for Whisper |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (String Identifier) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio sender number, international format |
| `MY_PHONE_NUMBER` | Number that receives the digest, international format |
| `CRON_SECRET` | Long random string. Vercel sends it to the digest job automatically |

### Phone

1. Open the live address in Chrome, enter the passphrase, and save one note.
2. Chrome menu, "Add to Home screen".
3. Optional: map a hardware button to the installed app (side-key double press on Samsung, back tap on Pixel, or an app such as Button Mapper).

## Schedule and time zones

Vercel cron runs in UTC (Coordinated Universal Time). The digest is scheduled at both 14:00 and 15:00 UTC on Saturdays, and the function only sends when the hour in Berlin is 16. This keeps the delivery time correct in summer and winter.

## Deployment

The Vercel project `jotter` is linked to this repository. Every push to `main` deploys to production.

## Known limits

- The phone must be unlocked. A web app cannot record from the lock screen.
- One recipient only. Separate logins for a second user are not built yet.
- Whisper and Twilio charge small per-use fees.
- Recording, transcription and the SMS digest have not yet been confirmed end to end on a real phone.

See [CHANGELOG.md](CHANGELOG.md) for the history.
