# Notes for coding agents

Read `CLAUDE.md` first: it holds the architecture, the security model and the rules the tests
enforce. In short:

- Work on a branch and open a pull request. Don't push to `main`, and don't rewrite history that
  has been pushed (no force-push, rebase, amend or squash of pushed commits).
- Before pushing, run what CI runs: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Never put a secret in code, in a `VITE_` variable, or in a committed file. Real values live in
  `.env` locally (ignored by git) and as Cloudflare secrets in production (`docs/deploy.md`).
