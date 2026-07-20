# Sushi Battle

A realtime mobile web app for tracking sushi orders and competing with friends. Count your pieces as you eat, watch the live leaderboard update, and get a shareable award badge on the results screen (e.g. "Re del Salmone", "Divoratore di Sashimi", "Senza Fondo"...). Built for the classic all-you-can-eat sushi night.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, src-dir) — React 19
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres + Realtime + Auth (anonymous sign-in)
- [Vercel](https://vercel.com) for hosting/deploy
- [Vitest](https://vitest.dev) + Testing Library for tests

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env example and fill in your Supabase credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Then edit `.env.local` and set:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

   `.env.local` is gitignored — never commit it.

### Supabase notes

- Project name: `sushi-counter`
- Project ref: `hqxwujapcvthpurbymhl`
- **Required manual step**: this app signs players in anonymously, so you must **enable "Allow anonymous sign-ins"** in the Supabase dashboard under **Authentication → Sign In / Providers** for the project. Without this, sign-in will fail.
- Optional Google login: see [`docs/SETUP-google-oauth.md`](docs/SETUP-google-oauth.md) for the full setup (Google Cloud OAuth client + Supabase provider config).

## Running

- Dev server: `npm run dev` — open [http://localhost:3000](http://localhost:3000)
- Tests: `npm test` (or `npm run test:watch` for watch mode)
- Production build: `npm run build`
- Start built app: `npm run start`
- Lint: `npm run lint`

## Deploying to Vercel

1. Import this repository into [Vercel](https://vercel.com/new).
2. In the project's Environment Variables settings, set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Vercel will run `npm run build` automatically on every push.
4. Confirm anonymous sign-in is enabled on the Supabase project (see above) before sharing the deployed URL — this is easy to miss and will otherwise block everyone from signing in.

## Assets

- Award badge images live in `public/badges/`. These are the canonical, in-app assets (referenced by the results screen).
- The original source asset drop is kept locally under `BADGES/` (gitignored) and is not part of the deployed app — `public/badges/` is what ships.
- `public/badges/partecipante.png` is currently a **placeholder** and should be replaced with a final badge image before launch.

## PWA

The app ships a web manifest (`public/manifest.webmanifest`) with `display: "standalone"` and app icons under `public/icons/`, so it can be added to the home screen on mobile.
