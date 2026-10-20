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

## Version numbers for a release

Both stores refuse a build number they have already seen. Set the version for both apps at once:

```sh
npm run release:bump -- 1.0.1 --dry-run   # print what would change, write nothing
npm run release:bump -- 1.0.1             # write it
```

It sets the version people see (`versionName` in `android/app/build.gradle`, `MARKETING_VERSION`
in every build configuration of `ios/App/App.xcodeproj/project.pbxproj`) and raises the build
number (`versionCode`, `CURRENT_PROJECT_VERSION`) to one more than the larger of the current ones,
so Android and iOS stay equal. It changes those lines only and prints each one. To upload another
build of the same version, pass the current version again; a lower version is refused. It stops
without writing anything if a file doesn't look as expected (a second `versionCode`, a version
that isn't a plain number like `1.2.3`, an `Info.plist` that doesn't read `$(MARKETING_VERSION)`),
so set that one by hand. Keep the `--` (without it npm takes `--dry-run` for itself; the script
still treats that as a dry run). It doesn't tag anything: commit the two files, then tag that
commit (`git tag v1.0.1`) and push the tag. Then run `npm run app:sync` and build the uploads.

## Before the first store submission

- **Who holds the accounts.** Google requires the Play developer account holder to be 18 or over,
  and Apple requires the age of majority where the holder lives. If the author is younger, a parent
  or guardian opens both accounts in their own name and stays the account holder; the author can
  be added as a team member.
- **App Store Connect:**
  - **Privacy:** the privacy policy URL (`https://YOUR-DOMAIN/legal/privacy`) and the App Privacy
    answers, using the suggestions in `SUMMARY.md`. They must agree with the privacy manifest
    (`ios/App/App/PrivacyInfo.xcprivacy`: no tracking; email, name, user ID, written text, product
    interaction and the age band, all linked to the person and used only to run the app; and the
    file-date and settings APIs the Capacitor plugins use). Check it again whenever a plugin is added.
  - **Age rating:** answer the questionnaire, then set the rating to 13+ by hand if the answers give
    a lower one (accounts start at 13).
  - **Export compliance:** declared in `Info.plist` (`ITSAppUsesNonExemptEncryption` is false: the
    app only uses standard HTTPS), so builds don't stop at the encryption question.
  - **iPad:** the project targets iPhone and iPad (`TARGETED_DEVICE_FAMILY = "1,2"` in
    `project.pbxproj`), so Apple asks for iPad screenshots and reviews the app on an iPad. **Open
    decision:** keep iPad (and check the phone frame there) or ship iPhone-only (`"1"`).
  - **Listing:** a support URL (`https://YOUR-DOMAIN/support`), screenshots, and a demo account
    for the reviewer.
- **Rules Apple checks:**
  - Covered: Sign in with Apple, and in-app account deletion (Settings → Your data).
  - **To do:** deleting an account doesn't yet revoke the person's Sign in with Apple tokens.
    Apple expects it to (its REST API's `revoke` endpoint, with the Sign in with Apple key, called
    from the server during deletion).
- **Payments.** If the paid Practice plan is sold inside the iOS app, Apple requires its in-app
  purchase system for it. Payments aren't live yet, so plan this before turning them on.
- **Google Play Console:**
  - The Data safety form (same answers as the App Store), the content rating questionnaire, the
    target audience (13 and over), and Play App Signing. `android/variables.gradle` targets API 36.
  - **Account deletion link.** Play requires a public web page where people can ask for their account
    and data to be deleted without the app. It is `https://YOUR-DOMAIN/delete-account`
    (`src/routes/delete-account.tsx`, linked from Help and support): the steps (Profile → Settings →
    Your data → Delete my account, in the app or on the website), what deleting removes and what is
    kept, and the contact email for anyone who can't sign in. Put that URL in the Data safety form.
    Fill in `CONTACT_EMAIL` in `src/lib/legal-config.ts` first: until then the page shows the
    placeholder instead of an address.
  - **Closed test first.** A new personal developer account can't publish to production until a
    closed test has run with at least 12 testers who stay opted in for 14 days in a row. Start it
    early.
- **Version numbers.** Every upload needs a higher build number: run
  `npm run release:bump -- <version>` before each one (see
  [Version numbers for a release](#version-numbers-for-a-release)).
- **AI provider terms (open decision for the owner).** Google's Gemini API terms appear to require
  users to be 18 or over and to bar apps directed at, or likely to be used by, people under 18.
  Lamppost accounts start at 13. Check the current terms, and if they still say this, choose a
  provider whose terms allow teen users (`AI_BASE_URL` and `src/lib/ai-models.ts` switch it; the
  privacy policy names the provider). This is a decision, not a code change.

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
