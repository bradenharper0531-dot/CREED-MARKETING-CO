# Creed — public site

Vite + React + Tailwind. Logins run on Supabase and share the database with the
Creed platform, so one account works everywhere and roles carry over.

## Run it
```bash
cp .env.example .env    # fill in the Supabase keys (below)
npm install
npm run dev             # http://localhost:5173
npm run build           # static site in dist/ — deploy to Vercel / Netlify
```
Without the keys the site still runs; the Log in window just says logins aren't connected.

## Connect logins (one time)
Use **one** Supabase project for this site and the platform.

1. **If you haven't set up the database yet:** Supabase → SQL Editor → run
   `supabase/schema.sql` (change the two owner emails at the top first), then
   `supabase/seed.sql`. Already did this for the platform? Skip it.
2. Supabase → Project Settings → API → copy the **Project URL** and **anon public key**
   into `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   On Vercel/Netlify add the same two as environment variables.
3. Supabase → Authentication → URL Configuration → add this site's address
   (e.g. `https://creedmarketing.com` and `http://localhost:5173`) to **Redirect URLs**.
   That's what makes the confirm-email and reset-password links come back here.

## Who sees what
| | Sees |
| --- | --- |
| Logged out | Whole site; calculator in rep pay |
| Rep (anyone who signs up) | Same, plus their account menu |
| Owner (emails in `owner_emails`) | Calculator gets **Owner view**: full contract pay, rep pay, spread per account / per rep / across the team. "Rep view" previews what reps see. |

Owner status comes only from the `owner_emails` list in the database, never from a
name typed at sign-up. Full contract rates live in the `market_rates` table, which the
database only returns to owners — they never reach a rep's browser.

## Hero logo + gold smoke

**The mark.** On load, `public/creed-intro.mp4` (5 s) plays once: molten gold pours out
from the crossing along all four arms, smoke and embers boil off, and it cools into a heavy,
polished gold band shaped as an infinity sign, like a ring (a real 3D model, rendered with
three.js). Its last frame is the frame right before `public/creed-loop.mp4` (an 8-second
seamless turn) begins, so it hands off with no visible jump; `public/creed-loop.jpg` is the
poster. Both play in `src/components/HeroLoop.tsx`, under the copy. With reduced motion
turned on the intro is skipped and the finished mark holds still.

**The smoke.** `src/components/SmokeField.tsx` drifts warm gold smoke and a few rising
embers across the whole site (not the dashboard). It only ever lightens, so black stays
black and text stays readable. Strength: the `opacity-50` class at the bottom of that
file, and `PUFFS` / `EMBERS` at the top.

To change the videos, edit `tools/hero-loop.html`, then:
```bash
pip install playwright && playwright install chromium   # once; also needs ffmpeg
python3 tools/render-loop.py
```

## Owner dashboard — `/#/dashboard`

Owners only. Open it from the account menu ("Owner dashboard") once you're logged in.

| Tab | What it does |
| --- | --- |
| **Overview** | Sales, installs, connect rate, active reps, applications and signings, each with ▲▼ vs. the previous period; sales by week (fiber vs. pest); recruiting counts by stage; overdue follow-ups; projected override; top-10 leaderboard. Filter by industry, market and Today / Week / Month / Season. |
| **Pipeline** | Every application from the site lands here as a *New lead*. Kanban (drag cards, or use the dropdown on each card) or table view; filter to Braden's or Peter's. Click a card for Call / Text / Email / Instagram buttons, the "where they're at" notes thread (signed with who wrote it), all their answers, and follow-up dates — overdue ones turn red. Move someone to **Signed** and it offers to create their rep record. |
| **Reps** | Sortable, searchable table with today / week / month / season, installs, connect %, 30-day sparkline. Click a rep for history, notes and **Log numbers**; **Import CSV** (`rep,date,sales,installs`) for bulk days. |
| **Contract rates** | Full contract pay per market. Powers the calculator's Owner view and spreads. |
| **Settings** | Everyone with a login and their role (make owner / make rep), the owner-email allowlist, and a button to clear the sample data. |

Security: every table behind the dashboard is locked to owners in the database
(row-level security), so even someone who finds `/#/dashboard` gets nothing back
unless their account is an owner. This replaces the separate Next.js platform —
one site, one login.

## Apply

Every application lands in the owner dashboard's **Pipeline** as a *New lead*, emails
Braden and Peter, and sends the applicant to book an interview.

**1. Database (once).** Supabase → SQL Editor → run `supabase/apply.sql`. It adds
start date, car and license to the pipeline. (Fresh installs: `schema.sql` already has them.)

**2. Booking page.** Make an interview event in Calendly (or Cal.com / Google booking
pages) and put its link in `.env` as `VITE_BOOKING_URL`. Name and email pre-fill on
Calendly and Cal.com. Leave it blank and applicants just see a thank-you message.

**3. Email alerts (Resend — free up to 3,000 emails a month, 100 a day).**
1. Sign up at [resend.com](https://resend.com) and create an API key.
2. Resend → Domains → add the domain the site will live on (e.g. `creedmarketing.com`)
   and add the DNS records it shows you at your domain registrar. Takes a few minutes.
   *Without a verified domain, Resend only delivers to your own account email — so
   Peter wouldn't get alerts until the domain is verified.*
3. Deploy the function (needs the Supabase CLI, `npm i -g supabase`):
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase secrets set RESEND_API_KEY=re_... \
     ALERT_FROM="Creed Applications <apply@creedmarketing.com>" \
     ALERT_TO=you@gmail.com,peter@gmail.com \
     WEBHOOK_SECRET=make-up-a-long-random-string \
     DASHBOARD_URL=https://YOUR-PLATFORM/dashboard/pipeline
   supabase functions deploy new-applicant-email --no-verify-jwt
   ```
4. Supabase → Database → Webhooks → **Create a new hook**:
   table `recruits`, event **Insert**, type **Supabase Edge Functions**,
   function `new-applicant-email`, method POST, and add an HTTP header
   `x-webhook-secret` = the same `WEBHOOK_SECRET`.
5. Submit a test application. You'll both get a black-and-gold email with every
   answer, a **Call** button and an **Open pipeline** button. Hitting Reply answers
   the applicant directly. Check spam the first time and mark it "Not spam".

Spam protection: a hidden honeypot field, and the database only lets the public
*add* a new lead — no one but owners can read, edit or delete applications.

## Still to do
- Calculator inputs are saved per browser, not per account.
- The Contact form doesn't send anywhere yet.
