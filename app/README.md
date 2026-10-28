# Golf Go iPhone app

A thin iPhone app around the web game (Capacitor). It exists to test one thing: whether the game runs smoother as an app.
On ProMotion iPhones (13 Pro and later Pro models) the app asks for the screen's full 120 Hz, where Safari and the home-screen
app hold web pages to 60 fps. Nothing about the game changes.

- The app opens the live game (`server.url` in `capacitor.config.json`), so every update to the site reaches it without a rebuild.
- Its saves and name are its own, separate from Safari's and the home-screen app's (like those two are from each other).
- Its rounds show up in `perf_stats` with `GolfGoApp` at the end of the device's user agent, so app fps can be compared with Safari.

## TestFlight (no Mac needed)

GitHub builds the app on one of its Macs and uploads it (`.github/workflows/testflight.yml`, "iPhone app to TestFlight").
One-time setup, all in the Apple and GitHub websites:

1. Join the Apple Developer Program ($99/yr, developer.apple.com/programs). Approval can take a day or two.
2. developer.apple.com → Account → Certificates, IDs & Profiles → Identifiers → **+** → App IDs → App:
   description "Golf Go", Bundle ID (explicit) `io.github.hartwigcam98.golfgo`.
3. appstoreconnect.apple.com → Apps → **+** → New App: iOS, name "Golf Go" (or any free name), language English,
   bundle ID `io.github.hartwigcam98.golfgo`, SKU `golfgo`.
4. App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → **+**: name "GitHub", access
   **Admin** (needed so Xcode can create the signing certificate). Download the .p8 file (it can be downloaded only once) and note
   the **Key ID** and the **Issuer ID** shown above the list.
5. developer.apple.com → Account → Membership details: note the **Team ID**.
6. github.com/hartwigcam98-star/golf-go → Settings → Secrets and variables → Actions → New repository secret, four times:
   `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_KEY_P8` (open the .p8 in a text editor and paste all of it).
   Never paste these into a chat.

Then: Actions → "iPhone app to TestFlight" → Run workflow. When the build has been processed (5-30 min), App Store Connect →
the app → TestFlight lists it; add yourself under Internal Testing, install the **TestFlight** app on the iPhone and accept the
invite. Other players: add them as App Store Connect users (internal, no review) or as external testers (a short Apple review
of the first build). Each run uploads a new build; the app itself loads the live site, so a new build is only needed for changes
to the app shell.

## Put it on your iPhone (needs a Mac)

1. Install Xcode from the Mac App Store, and Node.js (nodejs.org, LTS).
2. In Terminal:
   ```sh
   git clone https://github.com/hartwigcam98-star/golf-go.git
   cd golf-go/app
   npm install
   npm run sync
   npm run open
   ```
3. Xcode opens. Click **App** in the left column, then the **Signing & Capabilities** tab: sign in with your Apple ID under
   **Team** (a free Apple ID works). If it complains about the bundle identifier, change it to something unique, e.g.
   `io.github.yourname.golfgo`.
4. Plug in the iPhone (or pick it over Wi-Fi), choose it at the top of the window, press ▶.
5. First time only, on the iPhone: Settings → General → VPN & Device Management → trust your Apple ID. On iOS 16+ also turn on
   Settings → Privacy & Security → Developer Mode.

With a free Apple ID the app stops opening after 7 days; press ▶ in Xcode again to renew it. A paid Apple Developer account
($99/yr) gives a year, TestFlight for other players, and the App Store.

## Notes

- 120 Hz: `CADisableMinimumFrameDurationOnPhone` in `Info.plist`, plus `GameViewController` (in `SceneDelegate.swift`) turning
  off WebKit's "prefer page updates near 60 fps". That second switch is WebKit-internal; fine for testing, but the App Store may
  object to it, so revisit before submitting.
- To carry the game inside the app instead (works offline, only changes when rebuilt), delete the `server` block from
  `capacitor.config.json` and run `npm run sync` again. Sharing a daily result would then need the site's address written in.
