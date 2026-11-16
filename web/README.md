# Muzio - web app

React + TypeScript + Vite + Tailwind (v4) + Supabase. Built from the product spec described in
`HUDEBN~1.docx` - see the repo's plan history for why this stack was chosen over the spec's
React Native + Expo recommendation. This is now the only app in the repo (the original vanilla
prototype it was ported from has been removed).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
```

## Push notifications

`api/notify.ts` (a Vercel function) sends them with `web-push`; `public/sw.js` shows them. The app
calls it after grading, a new recording and a new assignment; Supabase `pg_cron` calls it hourly for
the evening reminders (migration `0035_push_notifications.sql`). Vercel needs `VITE_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` (the same value as the Vault
secret `muzio_cron_secret`). New keys: `npx web-push generate-vapid-keys`.

## Scripts

```bash
npm run dev       # start the dev server
npm run build     # type-check (tsc -b) + production build
npm test          # run the Vitest suite
npm run preview   # preview the production build locally
```

## Structure

```
src/
├── design/tokens/     # colors, typography, spacing - "Alternativní paleta 4" theme
├── components/
│   ├── ui/             # Button, Card, Input, Avatar, Badge, Progress, Modal, Toast
│   ├── audio/           # AudioPlayer, RecordingUI, Waveform (placeholder shells)
│   └── gamification/    # Streak, XPDisplay, Confetti, LevelProgress
├── screens/
│   ├── student/          # Dashboard, Lessons, Recording, Profile
│   └── teacher/          # Dashboard, Students, LessonLibrary, Grading
├── lib/
│   ├── supabase.ts       # Supabase client (env-driven)
│   └── game-logic.ts     # gamification logic (levels, badges, streaks), with tests in game-logic.test.ts
```

Routing is handled by `react-router-dom` (see `src/router.tsx`). Screens are currently placeholders -
no auth, data fetching, or the spec's GDPR/pairing/moderation flows yet; that's the next phase.
