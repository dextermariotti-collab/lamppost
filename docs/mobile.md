# The iOS and Android apps

Lamppost ships as real apps for the App Store and Google Play, built with **Capacitor** from the
same code as the website. The apps carry their own copy of the screens, so they open instantly and
the authored lessons work offline. They call the deployed backend (`docs/deploy.md`) for
everything that needs a server: sync, friends, AI and the rate limits. The AI key never ships
inside the app.

```
phone app (screens bundled)  ──server calls──▶  Cloudflare Worker (same code as the website)  ──▶  Supabase, Gemini
        └──────── sign-in, account data ──────────────────────────────────────────────────▶  Supabase
```

## What's different inside the app

| | On the web | In the app | Where |
| --- | --- | --- | --- |
| Server functions | the page's own origin | `VITE_API_URL`, with CORS allowed for the app origins | `lib/platform.ts`, `lib/app-origins.ts`, `server.ts`, `start.ts` |
| Google / Apple sign-in | redirect and back to `/auth` | system browser, then back through `com.lamppost.app://auth-callback` (PKCE) | `lib/oauth.ts`, `components/NativeShell.tsx` |
| Links people share, sign-up emails | the page's origin | `VITE_PUBLIC_URL` (the website) | `publicUrl()` |
| Downloading your data | browser download | share sheet (save to Files, send) | `lib/save-file.ts` |
| Status bar, notch, home indicator | none | screens pad themselves (`--inset-top`, `--inset-bottom`) and the bar text follows the theme | `styles.css`, `NativeShell.tsx` |
| Android back button | browser back | goes back a screen, or leaves the app from the first one | `NativeShell.tsx` |
| Fonts | bundled | bundled (nothing is fetched from Google) | `styles.css` |

The apps are identified as `com.lamppost.app`. That name is permanent once the app is published,
so pick the final one before the first upload. It appears in `capacitor.config.ts`,
`src/lib/native-config.ts`, the Xcode project, `android/app/build.gradle`, the iOS `Info.plist` and
the Android manifest; `src/lib/oauth.test.ts` fails if they disagree.

## One-time setup

You need a Mac with **Xcode** for iOS, **Android Studio** for Android, an **Apple Developer
account** (yearly fee) and a **Google Play developer account** (one-time fee).

1. **Backend.** Deploy it first (`docs/deploy.md`). A staging deploy works too:
   `npx wrangler deploy` gives `https://lamppost.<account>.workers.dev`, which is enough to try the
   app on a phone.
2. **Settings.** In `.env`, set `VITE_API_URL` to the backend and `VITE_PUBLIC_URL` to the website
   (often the same address), alongside the `VITE_SUPABASE_*` values.
3. **Supabase → Authentication → URL Configuration.** Add `com.lamppost.app://auth-callback` to the
   redirect URLs, next to the website's.
4. **Sign in with Apple.** Apple requires it in any iOS app that offers Google sign-in. In the Apple
   Developer portal, create a Services ID and a key for Sign in with Apple. Then turn on the Apple
   provider in **Supabase → Authentication → Sign In / Providers** with those details, and add
   Supabase's callback URL (`https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`) to the
   Services ID. Until then the Apple button shows an error and the other ways to sign in still work.

## Build and run

```sh
npm run app:sync       # builds dist-app/ and copies it into ios/ and android/
npm run app:ios        # opens Xcode: pick a simulator or your phone, then Run
npm run app:android    # opens Android Studio: pick an emulator or your phone, then Run
```

Run `npm run app:sync` again after every change to the code. The native projects (`ios/`,
`android/`) are committed; their copies of the screens are not (they're rebuilt by `app:sync`).
Icons and the splash screen were generated from `assets/` with
`npx @capacitor/assets@3.0.5 generate`; rerun it if the artwork changes.

## Before the first store submission

- **App Store Connect:**
  - **Privacy:** the privacy policy URL (`https://YOUR-DOMAIN/legal/privacy`) and the App Privacy
    answers, using the suggestions in `SUMMARY.md`.
  - **Listing:** an age rating (the app requires 13+), a support URL, screenshots, and a demo
    account for the reviewer.
- **Rules Apple checks that are already covered:** Sign in with Apple, and in-app account deletion
  (Settings → Your data).
- **Payments.** If the paid Practice plan is sold inside the iOS app, Apple requires its in-app
  purchase system for it. Payments aren't live yet, so plan this before turning them on.
- **Google Play Console:** the Data safety form (same answers as the App Store), the content rating,
  and Play App Signing. `android/variables.gradle` targets API 36.

## Not done yet

- **Invite links open the website, not the app.** Making them open the app needs Universal Links
  (iOS) and App Links (Android): a file served from the website plus an entry in each native
  project.
- **No push notifications** (streak reminders were planned as web push and are paused).
- **The native projects weren't compiled in the environment this was built in.** It had no Xcode,
  and Google's Android SDK downloads were blocked. What was checked: the app's screens built and
  served the way Capacitor serves them, against the real backend build on another origin, in a
  browser (sign-in start, server calls, fonts, no page errors). The native files parse, CI runs
  `npm run build:app` and `npx cap sync`, and Capacitor's CLI generated the projects. Compile them
  once in Xcode and Android Studio before relying on them.
