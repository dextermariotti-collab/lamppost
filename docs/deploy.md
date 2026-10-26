# Running Lamppost yourself

Lamppost runs on three services you own the accounts for:

| Part | Service | What it needs from you |
| --- | --- | --- |
| The app and its server functions | **Cloudflare Workers** | a Cloudflare account; `npm run deploy` |
| Database and sign-in | **Supabase** | a project; the migrations in `supabase/migrations` |
| AI features | **Google's Gemini API** (any OpenAI-compatible service works) | an API key from a billing-enabled project |

Everything a learner does works without the AI key and without signing in, so you can bring these
up one at a time.

## 1. Local development

```sh
cp .env.example .env      # then fill in the values as you create each service below
npm install
npm run dev               # http://localhost:8080
```

`npm run dev` loads `.env` into the server, and the `VITE_` values into the browser. `.env` is
ignored by git: never commit it.

## 2. Supabase (database and sign-in)

1. Create a project at supabase.com. From **Project Settings → API** copy the URL, the publishable
   key and the secret (service role) key into `.env` (see `.env.example` for which goes where).
2. Build the database. The **Supabase** workflow (`.github/workflows/supabase.yml`) applies every
   new file in `supabase/migrations`, in order, whenever one is pushed. It needs two repository
   secrets under **GitHub → Settings → Secrets and variables → Actions**:
   - `SUPABASE_ACCESS_TOKEN`: a personal access token from supabase.com → Account → Access Tokens.
   - `SUPABASE_DB_PASSWORD`: the database password (Project Settings → Database; reset it there if
     you don't have it).

   The project it deploys to is set in the workflow (`SUPABASE_PROJECT_ID`). For now it also runs
   on pushes to the feature branch (`revamp/interactive-legal`), so the pending migrations reach the
   new project before that branch is merged. Once they are applied, change the workflow to run from
   `main` only, and put its job behind a GitHub environment with a required reviewer (**GitHub →
   Settings → Environments**), so nobody changes the production database without a second look.

   **Deploy the code right after the migrations it goes with.** The workflow applies a migration as
   soon as it is pushed, but the server is deployed by hand (section 4), so for a while one is ahead
   of the other. Some changes only work together: `20261019100000_social_safety_hardening` stops the
   browser reading debate answers, so a build from before it can't open `/debates`, and the current
   build calls `search_profiles` and passes a lease holder, which only that migration provides. When
   a push carries both SQL and server code, wait for the workflow to finish and run `npm run deploy`
   straight after.

   To run the same thing from your own machine instead:

   ```sh
   npx supabase@2.118.0 login
   npx supabase@2.118.0 link --project-ref YOUR-PROJECT-REF
   npm run db:push
   npm run db:types         # refreshes src/integrations/supabase/types.ts from the real schema
   ```

   After `db:types`, the two small untyped accessors for tables that weren't in the old types
   (`casesTable` in `cases.functions.ts`, `doneLessonsOf` in `profile.functions.ts`) can be
   replaced by the typed client.
3. **Authentication → URL Configuration.** Set the Site URL to your app's address and add these
   redirect URLs (sign-up confirmation emails and Google sign-in both come back to them):
   - `https://YOUR-DOMAIN`
   - `https://YOUR-DOMAIN/auth`
   - `http://localhost:8080` and `http://localhost:8080/auth` for local development
4. **Google sign-in.** In Google Cloud Console create an OAuth client
   (type "Web application") with the authorized redirect URI
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`. Then paste its client ID and secret
   into **Authentication → Sign In / Providers → Google** and turn the provider on. Until you do,
   "Continue with Google" shows an error and email sign-up still works.
5. **Email.** Supabase's built-in email sender is for testing: it sends only a few emails an hour.
   Before launch, set up your own SMTP under **Authentication → Emails → SMTP settings**.

## 3. AI key

Create a key in Google AI Studio (aistudio.google.com) for a Google Cloud project with **billing
enabled**: Google's terms let it use requests on unpaid keys to improve its products, and the privacy
policy has a `[CONFIRM]` note about this. Put it in `.env` as `AI_API_KEY`.

The models are named in `src/lib/ai-models.ts`. If Google renames or retires one, change it there.
To use another OpenAI-compatible service instead (OpenRouter, for example), set `AI_BASE_URL` and
name that service's models in the same file. Every call asks for low reasoning effort (`aiOutput` in
`ai-models.ts`, sent as `reasoning_effort`); a service that refuses that field for a model that
doesn't reason fails every call, so try one call before switching.

**Kill switch.** To stop every model call at once (a cost spike, a bad reply, a provider problem),
remove `AI_API_KEY` (`npx wrangler secret delete AI_API_KEY --name lamppost`). Each AI feature
checks for the key before it calls the model: the tutor chat, the written-argument grader, Check
something you saw and the drill follow-ups say AI isn't available, a new debate can't be started
and says why, and the daily case falls back to a written one. The authored lessons, drills already
in the cache, streaks, sync and friends keep working. Put the key back to turn them on again.
`docs/incident.md` has this and the other steps for when something goes wrong.

## 4. Deploy to Cloudflare

```sh
npx wrangler login
# Server settings, once per environment (each one prompts for its value):
npx wrangler secret put SUPABASE_URL --name lamppost
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY --name lamppost
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name lamppost
npx wrangler secret put AI_API_KEY --name lamppost
# Optional, the same way: RATE_LIMIT_SECRET, APP_ORIGINS, CLIENT_IP_HEADER (.env.example says
# what each does).
# Build (with the VITE_ values in .env) and upload:
npm run deploy
```

The build writes the worker and its Wrangler config to `.output/` (worker name `lamppost`, set in
`vite.config.ts`). If `wrangler secret put` says the worker doesn't exist yet, let it create the
worker, or run `npm run deploy` once and set the secrets after. Add your domain under
**Workers & Pages → lamppost → Settings → Domains & Routes**. Set every server value as a secret:
the generated config replaces plain variables set in the dashboard on each deploy.

The per-address rate limits read the caller's address from one header only: `CLIENT_IP_HEADER`, or
Cloudflare's `cf-connecting-ip` when it is empty. Leave it empty on Cloudflare, which overwrites that
header on every request.

To build for a different host, set `NITRO_PRESET` (for example `node-server` or `vercel`) when
running `npm run build`. Nitro supports most hosts. Set `CLIENT_IP_HEADER` there too, to the header
that host overwrites with the caller's address: a header the caller can set themselves would let
anyone take a fresh limit with every request.

## Moving people over from a previous host

- **Keep the same web address if you can.** Lamppost is local-first: a learner's progress lives in
  their browser's storage for the site's address. If the app was on your own domain, point that
  domain at Cloudflare and nothing on anyone's device is lost. If it was on the previous host's
  address, a new address starts every browser fresh, and only signed-in learners get their
  numbers back (XP, streak, finished lessons, reviews and skills sync; unit checks and badges are device-only).
- **Accounts and data.** The new Supabase project starts empty. If you can get a database export
  from the previous host (including the `auth` schema), restore it into the new project instead of running
  `db:push`, then mark the migrations as applied so later ones run on top:
  `npx supabase@2.118.0 migration repair --status applied <version> …` for every file in
  `supabase/migrations`. The four `20260920…` files are the former `drizzle/migrations`, which
  were applied separately; they are already in any export. Without an export, people sign up
  again. A device's own progress carries into the new account on its first sync.
- The previous project's public URL and key are still in the git history
  (`.env` before October 2026), in case you need them during the move.
