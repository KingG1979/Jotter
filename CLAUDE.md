# Jotter: project instructions

Voice reminder app. The user opens it, speaks, and receives all notes from the week as one Telegram message on Saturday at 16:00 Berlin time. See README.md for the full description.

## Stack and layout

- Static page in `public/`, Vercel serverless functions in `api/` (CommonJS, no framework, no build step).
- Supabase project `rastfuchs` (ref `ljmkihbqkmuycuqtmquf`, shared with another app). Jotter uses only the `reminders` schema and the private `reminder-audio` bucket. Do not touch the `public` schema or anything else in that project.
- Vercel project `jotter` in team `kingg1979s-projects`. Live at https://jotter-rust.vercel.app. Every push to `main` deploys to production.
- OpenAI Whisper for transcription. The digest is sent through the Telegram Bot API by the user's own bot (Twilio was dropped: trial accounts cannot send custom text).

## Rules

- Never commit secrets, and never ask the user to paste them into chat. All secrets live in Vercel environment variables, which the user sets himself.
- Keep it simple. One page, two functions. Do not add a framework or build step without asking.
- Update CHANGELOG.md in the same commit as any user-visible change, and README.md when setup or behaviour changes.
- Database changes go through Supabase migrations, inside the `reminders` schema only.
- The digest must only send at 16:00 Berlin time. Vercel cron runs in UTC, so there are two cron entries and an hour check in `api/digest.js`. Keep both.
- `api/digest.js` and `api/upload.js` must reject requests when their secret is unset.

## Writing style for docs and messages

- Short and direct. No em-dashes.
- Expand abbreviations on first use, e.g. "PWA (Progressive Web App)".

## Testing

- `node --check api/*.js` for syntax.
- The recording page can be tested headless with Playwright and Chromium's fake microphone (`--use-fake-device-for-media-stream`, `--use-file-for-fake-audio-capture=<wav>%noloop`). Serve the page from `localhost`, since the microphone is hidden on insecure origins. The fake device has a noise floor of about 0.028 RMS, which is why silence detection is relative to background noise.
- `/api/digest?force=1` (with the cron secret) bypasses the Berlin hour check. It sends a real message, so ask before using it. The app's "Send digest now" link does the same with the passphrase.

## Known tool limits

- The Vercel connector can read deployments and logs but cannot create projects or list environment variables. Vercel logs are kept for one hour on this plan.
- Supabase's exposed-schemas setting is changed in the dashboard, not by SQL.

## Open items

- Recording and transcription are confirmed on a real phone. The Telegram digest is not confirmed yet.
- Hardware button mapping on the user's Android phone.
- Possible later: separate logins so a second person can use it.
