# Creed — platform

Public site, rep area and owner dashboard for Creed Marketing.
Built with Next.js 14 + Supabase. Black and gold, per the Creed Marketing design system.

| Who | Sees |
| --- | --- |
| Anyone (logged out) | Public site + rep calculator preview + application form |
| **Rep** (anyone who signs up) | **My Plan**: Rep Growth Plan (saved to their account), their own sales, weekly pillar check-in |
| **Owner** (Braden, Peter) | Everything: Overview, Reps, Pipeline, Markets, **Margin plan** (Owner Plan), Settings |

---

## Setup (about 20 minutes, one time)

### 1. Create the database
1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine). Save the database password somewhere.
2. Open **SQL Editor → New query**.
3. Open `supabase/schema.sql`. **Change the two emails near the top** to your real login emails:
   ```sql
   insert into owner_emails (email) values
     ('braden@example.com'),   -- ← your email, lowercase
     ('peter@example.com');    -- ← Peter's email, lowercase
   ```
4. Paste the whole file and click **Run**.
5. New query → paste all of `supabase/seed.sql` → **Run**. This loads the real markets and pay rules plus some **sample** reps and recruits (marked "sample"; remove them anytime from Settings).

### 2. Set up email login
In Supabase: **Authentication → URL Configuration**
- **Site URL**: your live address (e.g. `https://creedmarketing.com`); use `http://localhost:3000` while testing.
- **Redirect URLs**: add `https://YOUR-DOMAIN/auth/callback` and `http://localhost:3000/auth/callback`.

"Confirm email" is on by default (new users click a link in their inbox before they can log in). Supabase's built-in email sender is rate-limited, so before launch connect your own SMTP under **Authentication → Emails → SMTP** (Resend or Postmark both work).

### 3. Run it on your computer
Install [Node.js 20+](https://nodejs.org), then in this folder:
```bash
cp .env.example .env.local      # then fill in the 3 values (Supabase → Project Settings → API)
npm install
npm run dev
```
Open http://localhost:3000, click **Log in → Sign up** with your owner email, confirm the email, and you'll land on the owner dashboard.

### 4. Put it online
1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Add the same 3 environment variables (set `NEXT_PUBLIC_SITE_URL` to the real domain) → **Deploy**.
4. Add your domain in Vercel, then update the Site URL / Redirect URLs in Supabase step 2.

---

## How owner access works (and why reps can't see margins)
- Role is decided **only** by the `owner_emails` allowlist in the database. Typing a name at sign-up does nothing.
- Full contract pay lives in its own table (`market_rates`) that the database refuses to return to anyone who isn't an owner (row-level security). Rep pages never even ask for it, so it never reaches a rep's browser, page source or network traffic.
- Add or remove owners later in **Dashboard → Settings**. You can't remove your own owner role (so you can't lock yourself out).

## Things to fill in
| Where | What |
| --- | --- |
| `lib/content.ts` → `payStacks` | Payout stacks by monthly volume (shows on The Money) |
| `lib/content.ts` → `pillars` | The `[fill in]` lines: team workouts, faith, books/trainings, financial habits |
| `lib/content.ts` → `repsInGroup` | Number for the hero stat strip |
| Dashboard → Markets | Arizona leads, Wyoming details, any rate changes |
| `components/site/` / photo slots | Real team photos (replace the "Team photo" placeholders) |

**Public pay numbers:** each market's "Pay line on public card" is what the public sees. It's seeded with the contract rates you listed. If you'd rather show rep pay publicly, or nothing, change it per market in Dashboard → Markets (leave it blank to hide).

## Daily use
- **Log numbers:** Reps → click a rep → *Log numbers*, or **Import CSV** with `rep,date,sales,installs`.
- **Link a rep to their login:** put the same email on their rep record that they signed up with. Then they see their own stats and their pillar check-ins show on your dashboard.
- **Pipeline:** drag cards between stages (or use the stage dropdown on the card). Click a card for the notes thread. Each note records who wrote it. When someone hits **Signed**, you'll be offered a one-click "create rep".
- **Application form** on the public site drops new people into the pipeline as *New lead*.

## Project map
```
app/page.tsx              Public one-pager
app/login, app/auth       Sign up / log in / reset password
app/plan                  Rep area (My Plan)
app/dashboard/*           Owner dashboard (all owner-only)
app/dashboard/actions.ts  Owner server actions (each re-checks the role)
components/PayCalculator  Growth Plan + Owner Plan calculator (same math as the originals)
lib/content.ts            Public-site copy: edit words here
supabase/schema.sql       Tables + security rules
supabase/seed.sql         Markets, pay rules, sample data
```
