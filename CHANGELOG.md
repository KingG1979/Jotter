# Changelog

All notable changes to Jotter are recorded here, newest first.

## 2026-11-15

### Added
- README and this changelog.
- CLAUDE.md with project instructions for future Claude sessions.
- "Send digest now" link in the app. It sends all unsent notes by SMS immediately, protected by the passphrase.
- The app shows the reason when an SMS fails to send.

## 2026-11-14

### Added
- Recording starts automatically when the app opens, once a passphrase is stored on the phone.
- Recording stops after 5 seconds of silence. Detection adapts to background noise, and pauses shorter than 5 seconds do not end a note.
- Beeps and vibration for start, saved, and failed.
- Recordings with no speech are discarded instead of saved.
- 3-minute limit per note.
- Clear message for a wrong passphrase, which also clears the stored one.

### Security
- The digest endpoint rejects every request while `CRON_SECRET` is unset.

### Initial release
- Recording page, installable as a PWA (Progressive Web App).
- Upload function: passphrase check, audio storage in Supabase, Whisper transcription.
- Weekly SMS (Short Message Service) digest via Twilio, Saturdays at 16:00 Berlin time, correct across summer and winter time.
- Supabase schema `reminders` with table `notes`, and private storage bucket `reminder-audio`.
- Vercel project linked to this repository, deploying on every push to `main`.
