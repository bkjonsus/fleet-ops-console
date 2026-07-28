# Fleet Ops Console — Setup Guide

This is a real multi-user web app: staff log in with their own email/password, and what they
can see and edit depends on their role (Admin, Dispatch, Fleet Manager, Accounting, Ops Viewer).

You'll need three free accounts: **Supabase** (database + logins), **GitHub** (stores the code),
and **Vercel** (hosts the live site). Total setup time: ~30–45 minutes, no coding required —
just following these steps in order.

---

## Step 1 — Create your Supabase project (the database + login system)

1. Go to https://supabase.com → Sign up (free) → **New project**.
2. Pick a name (e.g. "fleet-ops"), set a database password (save it somewhere), choose the
   region closest to you, click **Create new project**. Wait ~2 minutes for it to spin up.
3. In the left sidebar, click **SQL Editor** → **New query**.
4. Open the file `supabase/schema.sql` from this project, copy its entire contents, paste into
   the SQL editor, and click **Run**. This creates all your tables and security rules.
5. In the left sidebar, click **Project Settings** → **API**. Copy two values — you'll need them
   in Step 3:
   - **Project URL**
   - **anon public** key

---

## Step 2 — Create your own (admin) login

1. In Supabase, left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter your email and a password. Leave "Auto Confirm User" checked. Click **Create user**.
3. Left sidebar → **Table Editor** → open the **profiles** table. You'll see one row (you).
4. Click into the `role` cell for your row and change it from `dispatch` to `admin`. Save.

You're now the only admin. From here on, you create every other staff account **directly from
inside the app's Team page** (Step 5.5 below) — no more manual Supabase dashboard work needed
for day-to-day team management.

---

## Step 2.5 — Deploy the "create staff account" function

This is what lets the Team page create real logins with a password you set, without exposing
any sensitive keys to the browser. It runs on Supabase's servers, not in the app itself.

1. Install the Supabase CLI on your Mac (Terminal):
   ```bash
   brew install supabase/tap/supabase
   ```
   (If you don't have Homebrew, install it first from https://brew.sh — Terminal will guide you.)
2. From inside this project folder in Terminal:
   ```bash
   cd path/to/this/trucking-app/folder
   supabase login
   ```
   This opens your browser to authorize the CLI — approve it.
3. Link the CLI to your Supabase project:
   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   ```
   Your project ref is the part of your Project URL before `.supabase.co`, e.g. for
   `https://abcdefgh.supabase.co` it's `abcdefgh`. Find it in Supabase → Project Settings → API.
4. Deploy the function:
   ```bash
   supabase functions deploy create-user
   ```
   That's it — Supabase automatically gives this function the keys it needs (`SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) without you setting anything manually.

---

## Step 3 — Put your Supabase keys into the project

1. In this project folder, find the file `.env.example`. Make a copy of it named exactly `.env`.
2. Open `.env` and paste in the values from Step 1.5:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Save the file. (This `.env` file is only for testing on your own computer — see Step 5 for
   how the live deployed site gets these values.)

---

## Step 4 — Put the code on GitHub

1. Go to https://github.com → Sign up (free) if you don't have an account.
2. Click **New repository**. Name it `fleet-ops-console`, keep it Private, click **Create repository**.
3. On your Mac, open **Terminal**, then:
   ```bash
   cd path/to/this/trucking-app/folder
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/fleet-ops-console.git
   git push -u origin main
   ```
   (GitHub will show you this exact command with your username after you create the repo —
   use theirs if it differs slightly.)

   If you don't have `git` installed, running any `git` command in Terminal will prompt macOS
   to install the Xcode Command Line Tools — accept that, then try again.

---

## Step 5 — Deploy to Vercel (this makes it a live website)

1. Go to https://vercel.com → Sign up (free) using your GitHub account.
2. Click **Add New** → **Project** → select your `fleet-ops-console` repo → **Import**.
3. Before clicking Deploy, expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = (same value as in your `.env`)
   - `VITE_SUPABASE_ANON_KEY` = (same value as in your `.env`)
4. Click **Deploy**. Wait ~1–2 minutes.
5. You'll get a live URL like `fleet-ops-console.vercel.app` — this is the link your whole team
   will use. Bookmark it / share it with staff.

Any time you want to update the app later, changing the code and running `git push` will
automatically redeploy the live site.

---

## Step 6 — Add your staff and assign roles

1. Open your live app URL → sign in as admin → go to the **Team** tab.
2. Click **New Staff Account**. Fill in their name, email, pick (or generate) a temporary
   password, and choose their role:
   - **Dispatch** — can only see and manage Loads
   - **Fleet Manager** — can only see and manage Drivers/Trucks/Trailers
   - **Accounting** — can only see and manage Invoices/Expenses/Driver Statements
   - **Ops Viewer** — can see everything and edit Loads/Fleet, but can't touch money
   - **Admin** — full access to everything, including this Team page
3. Click **Create Account**. The email + password will be shown once on screen — copy them and
   share directly with that staff member (text, in person, etc.). There's no email sent
   automatically.
4. They log in at your Vercel URL with that email/password. They can change their password
   later from Supabase Auth if needed (a self-service "forgot password" flow isn't included in
   this first version — you'd reset it for them from Supabase → Authentication → Users if they
   forget it).

You can still create accounts manually from Supabase → Authentication → Users if you ever
prefer that route — the Team page is just the faster way for everyday use.

---

## Step 7 (optional) — Install it like an app on phones (free, no App Store)

This project already includes everything needed for your team to install it as an app icon on
their home screen — no App Store or Play Store required, and it works the moment you deploy.

**Before you deploy, replace the placeholder icon** (currently just "FO" on a dark background)
with your real logo:
1. Make a square logo image, ideally 512x512px or larger.
2. Go to https://realfavicongenerator.net, upload it, and download the generated icon set.
3. Replace these 4 files in the `public/` folder with the generated ones (keep the same names):
   `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.ico`.
4. Commit and push (`git add . && git commit -m "Add real logo" && git push`) — Vercel redeploys
   automatically.

**How your team installs it:**
- **iPhone (Safari):** open your app's URL → tap the Share icon → **Add to Home Screen**.
- **Android (Chrome):** open your app's URL → tap the ⋮ menu → **Install app** (or you may see an
  automatic "Add Fleet Ops to Home screen" banner).

It'll then open full-screen with its own icon, exactly like a downloaded app.

---

## Step 8 (optional) — Publish to the Apple App Store / Google Play

Worth knowing before you invest time here: for a small internal team tool, Step 8 above gets you
most of the "app" experience for free with no review process. This step makes sense if you want
it discoverable in store search, need deep native features (push notifications, camera access,
offline-first), or want the polish of a real store listing.

**Costs and requirements:**
| | Apple App Store | Google Play |
|---|---|---|
| Account cost | $99/year | $25 one-time |
| Hardware needed | A Mac (Xcode requires macOS) | Any computer |
| Review time | Usually 1\u20133 days | Usually a few hours to ~1 day |
| Risk | Apple can reject simple "wrapped website" apps under their Minimum Functionality rule (4.2) \u2014 the closer this feels to a real app (see native touches below), the safer | Generally more lenient of web-wrapped apps |

**The tool for this: Capacitor** (by Ionic) wraps this existing React app in a native shell you
can submit to both stores without rewriting the app.

1. Install Capacitor in this project:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init "Fleet Ops Console" "com.yourcompany.fleetops" --web-dir=dist
   ```
2. Build the web app and add the native platforms:
   ```bash
   npm run build
   npx cap add ios
   npx cap add android
   ```
3. To reduce Apple's rejection risk, add at least one native-feeling feature before submitting \u2014
   for example `@capacitor/push-notifications` (alert staff of new loads) or
   `@capacitor/camera` (native camera capture for the document uploads in the Fleet tab, instead
   of the browser file picker). This is optional but meaningfully lowers rejection risk.
4. Open and build each platform's project:
   ```bash
   npx cap open ios       # opens Xcode \u2014 requires a Mac
   npx cap open android   # opens Android Studio
   ```
5. From there, follow Apple's and Google's standard submission flow: create your developer
   account, fill in the App Store Connect / Play Console listing (screenshots, description,
   privacy policy \u2014 required by both stores), then submit for review.

This part genuinely requires hands-on work in Xcode/Android Studio that can't be fully scripted
in advance \u2014 happy to help troubleshoot specific errors if you hit them once you're in there.

---

## Step 9 (optional) — Put it on your own domain

Right now your live URL looks like `fleet-ops-console.vercel.app`. If you'd rather your team go
to something like `ops.yourcompany.com`, this is free and doesn't touch your existing website's
code at all — it's a completely separate app living on a subdomain.

1. In Vercel, open your project → **Settings** → **Domains** → **Add**.
2. Type the subdomain you want, e.g. `ops.yourcompany.com` → **Add**.
3. Vercel will show you a DNS record to create — usually something like:
   ```
   Type: CNAME
   Name: ops
   Value: cname.vercel-dns.com
   ```
4. Go to wherever your domain's DNS is managed — this is your domain registrar or DNS host
   (GoDaddy, Namecheap, Cloudflare, Google Domains, etc. — whoever you or your web developer
   bought/manage `yourcompany.com` through). Add that exact CNAME record there.
5. Wait a few minutes (sometimes up to a few hours) for it to take effect. Vercel will
   automatically issue an SSL certificate — no extra step needed. Once it shows "Valid
   Configuration" in Vercel, `ops.yourcompany.com` is live.
6. (Optional) Add a button or link on your existing website's navigation — "Team Login" or
   similar — pointing to `https://ops.yourcompany.com`. Since your site is custom-built, this is
   just a normal link/button added to your site's existing code, same as any other link on the
   page. It doesn't require embedding or integrating the app itself.

If you're not sure who manages your domain's DNS, check where you renew `yourcompany.com` each
year — that's almost always the same place.

---



**Included:** real logins, enforced role-based permissions (enforced at the database level, not
just hidden in the UI — so it's not just "security by obscurity"), all the same features as your
original dashboard (loads, fleet, invoices, expenses, driver statements with auto-calculated pay).

**Not included (you'd add later if needed):** self-service password reset, email invitations,
audit logs / activity history, file attachments (e.g. BOLs, photos), mobile push notifications,
data export/backup tooling. All of these are realistic follow-on projects once the core app is
running.

## If something breaks

- **Blank page / login doesn't work:** double check the `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` values in Vercel's Environment Variables match Supabase exactly, then
  redeploy.
- **"row-level security" errors when saving:** means a staff member's role doesn't have
  permission for that action — check their role in the Team page.
- **A staff member sees a blank/empty tab:** their role doesn't grant access to that section —
  this is expected behavior, not a bug.
