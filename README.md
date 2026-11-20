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
| Team lead (emails in `lead_emails`) | Same as a rep, plus **Recruiting pipeline** in their account menu: every lead, notes, stages and follow-ups. Can add leads and update them; can't delete leads or create rep records, and never sees rates, margins or rep numbers. |
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

## Team leads

**1. Database (once).** Supabase → SQL Editor → run `supabase/team-leads.sql`. Safe to re-run.

**2. Make someone a team lead.** Owner dashboard → **Settings** → **Team leads** → type their
email → **Add**. If they already have an account it switches right away; if not, they become a
team lead when they sign up with that email. Remove the email and they go back to a rep.
You can also switch anyone's role from the dropdown in the **Everyone with a login** table.

Team leads open the pipeline from their account menu (**Recruiting pipeline**). The database
enforces all of this, so a team lead can't reach rates, reps or settings even by typing the URL.

## Team lead overviews

**1. Database (once).** Supabase → SQL Editor → run `supabase/team-overview.sql`. Safe to re-run.

**2. Put reps under a team lead.** Owner dashboard → **Reps** → a rep → **Edit** → **Team lead**.

**3. Turn a team lead's Overview on.** Owner dashboard → **Settings** → **Team overview** → **Overview on**.

That team lead then gets an **Overview** tab (sales, installs, connect rate, the weekly chart and a
leaderboard) for only the reps under them. Read-only: they can't edit reps or log numbers, and never
see contract rates, margins, override money, rep notes or anyone else's reps. Turning it off, or
removing them as a team lead, takes it away immediately. The database enforces all of this.

## Door tracker

**1. Database (once).** Supabase → SQL Editor → run `supabase/door-tracker.sql`. Safe to re-run.

**2. Reps.** Add each rep in **Reps** with the email they log in with. On their phone they log in,
open **Door tracker** from the account menu (or go straight to `creedmarketing.org/#/track`,
worth saving to their home screen) and tap as they go:
- **Door** at every door they knock
- the **objection** they got (Not interested, Price, Already has one, Spouse / not the decider,
  Renting, Bad timing, Other)
- **Sale** when they close
- **Undo** takes back their last tap

**3. Who sees it.** Owners see everyone on the **Overview** (doors, objections, tracked sales, close
rate, per-rep table and what objections the group is hearing), using the same filters. Team leads with
Overview on see the same for the reps under them. Reps only see their own numbers. Taps go through the
database's `track()` function, which works out which rep you are from your login, so nobody can log
numbers for someone else or change past days. "Sales (tracked)" is what reps tapped; the official
sales/installs you log in Reps stay separate.

## Apply

Every application lands in the owner dashboard's **Pipeline** as a *New lead*, emails
Braden and Peter, and sends the applicant to book an interview.

**1. Database (once).** Supabase → SQL Editor → run `supabase/apply.sql`. It adds
start date, car and license to the pipeline. (Fresh installs: `schema.sql` already has them.)

**2. Booking page.** Make an interview event in Calendly (or Cal.com / Google booking
pages) and put its link in `.env` as `VITE_BOOKING_URL`. Name and email pre-fill on
Calendly and Cal.com. Leave it blank and applicants just see a thank-you message.

**3. Email alerts (Resend — free up to 3,000 emails a month, 100 a day).** Set up Nov 2026.
- Resend: `creedmarketing.org` is verified, so alerts can go to anyone.
- Supabase → Edge Functions: `new-applicant-email` (code in `supabase/functions/`),
  with **Verify JWT off**. Secrets: `RESEND_API_KEY`, `ALERT_FROM`
  (`Creed Applications <apply@creedmarketing.org>`), `ALERT_TO` (comma-separated emails),
  `DASHBOARD_URL`.
- Supabase → Database → Webhooks: `new-applicant-email` on `recruits` **Insert** →
  Supabase Edge Function `new-applicant-email`.
- The function only trusts the database: it emails a real application once, within
  15 minutes of it arriving, and stamps `notified_at`. Change who gets alerts by editing
  the `ALERT_TO` secret. Check spam the first time and mark it "Not spam".

Spam protection: a hidden honeypot field, and the database only lets the public
*add* a new lead — no one but owners can read, edit or delete applications.

## Still to do
- Calculator inputs are saved per browser, not per account.
- The Contact form doesn't send anywhere yet.
