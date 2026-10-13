// Builds the screens for the iOS and Android apps into dist-app/, ready for `npx cap sync`.
//
// The app bundles the client only; its server functions, AI calls and sync run on the deployed
// backend, so VITE_API_URL must name it (in .env or the environment). VITE_PUBLIC_URL is the
// web address used in links people share and in sign-up emails.
//
//   npm run build:app   # needs VITE_API_URL: the production backend, or a staging deploy
//                       # (https://lamppost.<account>.workers.dev) to try it on a phone first
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, renameSync, rmSync } from "node:fs";
import { loadEnv } from "vite";

const env = { ...loadEnv("app", process.cwd(), ""), ...process.env };

const missing = ["VITE_API_URL", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].filter(
  (name) => !env[name],
);
if (missing.length > 0) {
  console.error(`Missing ${missing.join(", ")}. Set them in .env (see .env.example).`);
  process.exit(1);
}

rmSync("dist", { recursive: true, force: true });
execFileSync("npx", ["vite", "build", "--mode", "app"], { stdio: "inherit", env });

rmSync("dist-app", { recursive: true, force: true });
cpSync("dist/client", "dist-app", { recursive: true });
if (!existsSync("dist-app/_shell.html")) {
  console.error("The build did not produce dist/client/_shell.html.");
  process.exit(1);
}
renameSync("dist-app/_shell.html", "dist-app/index.html");
console.log(`\ndist-app/ is ready (backend: ${env.VITE_API_URL}). Next: npx cap sync`);
