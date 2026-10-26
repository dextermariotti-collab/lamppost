# When something goes wrong

What to do when Lamppost has a problem in production: a leaked key, a cost spike, a bad AI reply, a
person who isn't safe to be around, or data that may have reached the wrong people. Most of the people
using Lamppost are teenagers, so a safety problem comes before everything else on this page.

Keep a short private log as you go: the time, what you saw, what you changed. You will need it later.

## Who to contact

| Who | Why | How |
| --- | --- | --- |
| The owner | Holds the Cloudflare, Supabase, Google AI Studio and GitHub accounts | [OWNER NAME], [PHONE], [EMAIL] |
| Parent or guardian | Holds the App Store and Google Play accounts if the owner is under 18 (`docs/mobile.md`). Told about every safety incident and every possible data breach, the same day | [GUARDIAN NAME], [PHONE], [EMAIL] |
| Lawyer | Before telling anyone outside the team about a data breach | [LAWYER OR FIRM], [PHONE], [EMAIL] |

People reach Lamppost at `CONTACT_EMAIL` in `src/lib/legal-config.ts`, which is still a placeholder.
Fill it in before launch, and check that inbox during an incident.

## Rotate a secret

Rotate a key as soon as you think it may have been seen: pasted in a chat, committed, or left on a
shared machine. Each one lives in two places, the Cloudflare worker's secrets and your local `.env`.
`npx wrangler secret put NAME --name lamppost` asks for the new value and updates the live worker.

| Secret | Make a new one | Then |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` (Supabase's secret key, `sb_secret_…`; it bypasses RLS) | Supabase → **Project Settings → API Keys**: create a new secret key | Put it in Cloudflare and `.env`, check the app works, then delete the old key there. If `RATE_LIMIT_SECRET` isn't set, the per-address limits start fresh, because their key comes from this one |
| `AI_API_KEY` | Google AI Studio → **API keys**: a new key in the same billing-enabled project | Put it in Cloudflare and `.env`, then delete the old key |
| `RATE_LIMIT_SECRET` (optional) | Any long random string | Put it in Cloudflare. Per-address limits start fresh; nothing else changes |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` (GitHub Actions) | supabase.com → **Account → Access Tokens** (revoke the old token); **Project Settings → Database** to reset the password | Update both under **GitHub → Settings → Secrets and variables → Actions** |

The Supabase URL and publishable key are public by design; RLS decides what they can do.

## Switch AI off

```sh
npx wrangler secret delete AI_API_KEY --name lamppost
```

Every AI feature checks for the key itself before it calls a model (`src/lib/ai-gateway.server.ts`
only builds the provider from the key it is handed). With the key gone, the tutor, the grader, Check
something you saw and the drill follow-ups say AI isn't available, no new debate can start, and the
daily case falls back to a written one. Lessons, cached drills, streaks, sync and friends keep
working. `docs/deploy.md` (Kill switch) has the details. Put the key back with `wrangler secret put` to
turn AI on again. For a cost spike, also check the budget and alerts on the Google Cloud project.

## Pause sign-ups

Supabase → **Authentication → Sign In / Providers**: turn off **Allow new users to sign up**. This
stops new email, Google and Apple accounts. People who already have an account can still sign in,
and anyone can still use the app signed out.

## Logs

- **The server (Cloudflare):** `npx wrangler tail lamppost` streams live logs. Stored logs are in
  **Workers & Pages → lamppost → Observability** (Workers Logs, on in `vite.config.ts`, kept 3 days
  on the free plan and 7 on a paid one). Server functions log failures
  with a prefix (`[friends]`, `[debates]`, `[rate-limit]` and so on); a limiter that can't reach the
  database logs "refusing (fail closed)".
- **The database and sign-in (Supabase):** **Logs** in the dashboard, with separate views for the API,
  Postgres and Auth.
- **Migrations:** the **Supabase** workflow's runs under GitHub → Actions.

## A safety report

Reports are kept in two tables, readable only with the service role (Supabase → **Table Editor**
or **SQL Editor**):

- `user_reports`: a report about a person (reporter, reported person, reason, details). A report
  stays after the reported person deletes their account, with the person left blank.
- `content_reports`: a report about a lesson or an AI answer (reason, details, the excerpt, the lesson).

```sql
SELECT * FROM public.user_reports WHERE status = 'open' ORDER BY created_at;
SELECT * FROM public.content_reports WHERE status = 'open' ORDER BY created_at;
```

1. **Read every new report within 24 hours.** Check both tables every day.
2. **Act the same day** on a threat of harm, anything about self-harm, sexual content involving a
   minor, or an adult who seems to be targeting a teenager. If someone may be in danger now, call 911.
   Tell the parent or guardian. Report suspected child sexual exploitation to NCMEC's CyberTipline
   (report.cybertip.org), and ask the lawyer what else must be kept and reported.
3. **Keep the evidence before you act.** Copy the reports and the person's `profiles` row first:
   deleting an account deletes everything it holds.
4. **Act.** A name or handle that isn't acceptable can be cleared in the SQL Editor:
   `UPDATE public.profiles SET display_name = NULL, handle = 'reader-' || public.random_code(8) WHERE id = '…';`.
   To stop someone signing in without deleting anything, ban them through the admin API
   (`supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' })`); to remove them entirely,
   delete the user under **Authentication → Users**. A wrong or harmful lesson is fixed in
   `src/content`; a harmful AI reply that keeps happening is a reason to switch AI off (above).
5. **Close it:** `UPDATE public.user_reports SET status = 'actioned' WHERE id = '…';` (or `reviewed`,
   `dismissed`), and the same for `content_reports`.

## A possible data breach

If personal data may have reached the wrong people (a leaked secret key, a database export,
someone reading another account), rotate the secrets above, keep the logs, and write down what was
exposed and whose (`docs/data-inventory.md` says what each table holds). Then **call the lawyer
before telling anyone outside the team.** Breach-notification duties (to the people affected, their
parents, state attorneys general, the app stores) depend on the states involved and the ages of the
people affected, and some have short deadlines. Working them out needs a lawyer, not this page.
