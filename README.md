# Lamppost

A critical-thinking trainer: seven units, 35 lessons, each a run of interactive steps ending on a
harder real-world case, then the idea in full, a graded written argument and an "explain it back"
chat. After the map there's a daily case and spaced reviews. It's an iOS and Android app (and a
website, from the same code) that works fully signed out; an account carries progress across devices
and adds friends.

## Run it

```sh
cp .env.example .env    # fill in as you set up each service (docs/deploy.md)
npm install
npm run dev             # http://localhost:8080
```

| Command | What it does |
| --- | --- |
| `npm run dev` | local app with hot reload |
| `npm test` | the test suite (pure logic, components, and the database rules in an in-memory Postgres) |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint, as CI runs them |
| `npm run build` | production build for Cloudflare Workers, into `.output/` |
| `npm run deploy` | build and upload to Cloudflare |
| `npm run db:push` / `npm run db:types` | apply `supabase/migrations` to the linked project / regenerate its types |
| `npm run app:sync` | build the phone app's screens and copy them into the iOS and Android projects |
| `npm run app:ios` / `npm run app:android` | open the app in Xcode / Android Studio |

## Where things are

- **Stack:** TanStack Start (React 19), Tailwind v4, Supabase (Postgres, auth, row-level security),
  the Vercel AI SDK against Google's Gemini API, deployed to Cloudflare Workers.
- **Setting it up and deploying:** `docs/deploy.md` (backend and website), `docs/mobile.md` (the apps).
- **How the code is put together, and the rules it keeps:** `CLAUDE.md`; the reasoning and the
  roadmap are in `docs/architecture.md`.
- **What data is stored where:** `docs/data-inventory.md`.
