# Running Lamppost yourself

Lamppost used to be hosted, built and given its database by Lovable. It now runs on three services
you own the accounts for:

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

   The project it deploys to is set in the workflow (`SUPABASE_PROJECT_ID`). To run the same thing
   from your own machine instead:

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
4. **Google sign-in** (Lovable used to broker this). In Google Cloud Console create an OAuth client
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
name that service's models in the same file.

## 4. Deploy to Cloudflare

```sh
npx wrangler login
# Server settings, once per environment (each one prompts for its value):
npx wrangler secret put SUPABASE_URL --name lamppost
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY --name lamppost
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name lamppost
npx wrangler secret put AI_API_KEY --name lamppost
npx wrangler secret put WARM_TOKEN --name lamppost
# Build (with the VITE_ values in .env) and upload:
npm run deploy
```

The build writes the worker and its Wrangler config to `.output/` (worker name `lamppost`, set in
`vite.config.ts`). If `wrangler secret put` says the worker doesn't exist yet, let it create the
worker, or run `npm run deploy` once and set the secrets after. Add your domain under
**Workers & Pages → lamppost → Settings → Domains & Routes**. Set every server value as a secret:
the generated config replaces plain variables set in the dashboard on each deploy.

To build for a different host, set `NITRO_PRESET` (for example `node-server` or `vercel`) when
running `npm run build`. Nitro supports most hosts.

## 5. Fill the lesson cache (optional)

Authored lessons don't need it. The older AI-written drills that reviews and the placement check
use are written on demand, and warming the cache writes them all ahead of time:

```sh
curl -X POST https://YOUR-DOMAIN/api/public/warm-curriculum -H "x-warm-token: $WARM_TOKEN"
```

## Moving people over from Lovable Cloud

- **Keep the same web address if you can.** Lamppost is local-first: a learner's progress lives in
  their browser's storage for the site's address. If the app was on your own domain, point that
  domain at Cloudflare and nothing on anyone's device is lost. If it was on a `lovable.app`
  address, a new address starts every browser fresh, and only signed-in learners get their
  numbers back (XP, streak and finished lessons sync; reviews and skill ratings are device-only).
- **Accounts and data.** The new Supabase project starts empty. If you can get a database export
  from Lovable (including the `auth` schema), restore it into the new project instead of running
  `db:push`, then mark the migrations as applied so later ones run on top:
  `npx supabase@2.118.0 migration repair --status applied <version> …` for every file in
  `supabase/migrations`. The four `20260920…` files are the former `drizzle/migrations`, which
  Lovable applied separately; they are already in any export. Without an export, people sign up
  again. A device's own progress carries into the new account on its first sync.
- The previous Lovable Cloud project's public URL and key are still in the git history
  (`.env` before October 2026), in case you need them during the move.
