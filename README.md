# Jotter

Tap a button, speak a reminder, and get every note from the week as one Telegram message on Saturday at 16:00 Berlin time.

Live at https://jotter-rust.vercel.app

## How it works

1. Opening the app starts recording straight away (after the passphrase has been saved once on that phone).
2. Recording stops by itself after 5 seconds of silence. A beep confirms the save.
3. The audio is stored in Supabase and transcribed with OpenAI Whisper.
4. Every Saturday at 16:00 Berlin time, a scheduled job sends all unsent notes as one Telegram message from your own bot and marks them as sent.

The "Send digest now" link under the button sends all unsent notes immediately instead of waiting for Saturday.

If nothing is said, nothing is saved. A single note is limited to 3 minutes. Tapping the button stops a recording manually.

## Project structure

| File | Purpose |
|---|---|
| `public/index.html` | Recording page: auto-start, silence detection, upload |
| `public/manifest.json` | Lets the page be installed to the home screen as a PWA (Progressive Web App) |
| `api/upload.js` | Checks the passphrase, stores the audio, transcribes it, saves the note |
| `api/digest.js` | Weekly digest: collects unsent notes and sends the Telegram message |
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
| `TELEGRAM_BOT_TOKEN` | Token of your Telegram bot, from BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID. The app tells you the value, see below |
| `CRON_SECRET` | Long random string. Vercel sends it to the digest job automatically |

### Telegram

1. In Telegram, open a chat with `@BotFather`, send `/newbot`, and follow the prompts. BotFather replies with a bot token.
2. Put the token into Vercel as `TELEGRAM_BOT_TOKEN` and redeploy.
3. Open your new bot in Telegram and send it `/start`.
4. In the app, tap "Send digest now". While `TELEGRAM_CHAT_ID` is unset, the app shows the value to use.
5. Put that value into Vercel as `TELEGRAM_CHAT_ID` and redeploy.

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
- Whisper charges a small per-use fee. Telegram is free.
- Recording and transcription are confirmed on a real phone. The Telegram digest is not confirmed yet.

See [CHANGELOG.md](CHANGELOG.md) for the history.
