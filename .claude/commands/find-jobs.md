---
description: Find new Summer 2027 internships and new-grad roles that fit Jean, then add them to the Discovered tab
argument-hint: "[optional focus, e.g. 'VC only' or 'London' or 'dry run']"
---

You're running Jean's weekly job search. Today's date is in your environment. The focus for this run is: **$ARGUMENTS**. If that's empty, cover everything.

## Hard rules
- **Never** submit an application, fill in a form, create an account, or log in anywhere.
- **Never** fetch LinkedIn, Handshake, Indeed, Glassdoor, WayUp or any page behind a login.
  - If a web search result points to one of these, look for the same posting on the company's own site or ATS instead.
  - If you can't find it there, skip it.
- Only add postings you actually opened and confirmed are live. Never invent a deadline or a pay figure.
- Read `.env` only to get `TRACKER_URL` and `TRACKER_TOKEN`. Never print the token or write it anywhere.

## Step 1: load context
1. Read `profile.md`, the source of truth for fit scoring. If `resumes/` has PDFs, skim them too.
2. Load `.env`. If `TRACKER_URL` and `TRACKER_TOKEN` are set, fetch the tracker:
   ```bash
   set -a; . ./.env; set +a
   curl -sL "$TRACKER_URL?token=$TRACKER_TOKEN" > /tmp/tracker.json
   ```
   This returns `existing` (every role already in Applications + Discovered) and `settings`: pay bars, prestige list, location tiers and watchlist.
   - If `.env` is missing or the call fails, switch to **dry-run mode**: do the search anyway, but write the results to `discovered-YYYY-MM-DD.json` in this folder instead of posting. Tell Jean the web app isn't connected yet (see SETUP.md, step 8).

## Step 2: watchlist job boards
For each watchlist company in `settings.watchlist`:
- **board = greenhouse**: `https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true`
- **board = lever**: `https://api.lever.co/v0/postings/<slug>?mode=json`
- **board = ashby**: `https://api.ashbyhq.com/posting-api/job-board/<slug>?includeCompensation=true`
- **board = careers page / url**: open the careers URL and look for student/early-career listings.
- **Board blank**: try likely slugs on greenhouse → lever → ashby (lowercase name, no spaces, plus common variants). If one returns jobs, save it:
  ```bash
  curl -sL -X POST "$TRACKER_URL?token=$TRACKER_TOKEN" -H 'Content-Type: text/plain' \
    -d '{"action":"watchlist","updates":[{"company":"Neuralink","board":"greenhouse","slug":"neuralink"}]}'
  ```
  If none works, find the company's careers page and save it with board `url`.

Keep titles that match early-career patterns: intern, internship, summer analyst/associate, co-op, fellow/fellowship, new grad, graduate, entry level, analyst (not senior), associate (consulting/finance), rotational/development program, 2027.
Drop senior/staff/principal/director/manager-level roles, unless the posting is explicitly new-grad.

## Step 3: web search
Run focused searches; adjust to the focus argument. Suggested set:
- Venture capital summer analyst 2027 · VC fellowship 2027 · venture capital analyst new grad 2027 biotech
- investor relations summer analyst 2027 private markets · private equity summer analyst 2027 healthcare
- pharma regulatory affairs intern summer 2027 · biotech business development intern 2027 · alliance management intern pharma 2027
- pharma rotational development program 2027 new grad (commercial, strategy, regulatory)
- life sciences consulting summer associate 2027 · healthcare consulting analyst new grad 2027 (ZS, L.E.K., ClearView, Blue Matter, Trinity, Putnam, Health Advances, Simon-Kucher, IQVIA, Huron)
- biotech equity research summer analyst 2027 · hedge fund healthcare analyst intern 2027
- product manager intern 2027 health tech / AI · associate product manager new grad 2027
- AI biotech intern 2027 · science communication / content marketing intern biotech 2027
- Also London and Sydney variants for the strongest categories.

Prefer company career sites and ATS pages (greenhouse.io, lever.co, ashbyhq.com, myworkdayjobs.com, icims.com, smartrecruiters.com) over aggregators.

## Step 4: vet each candidate
For every posting you keep, **open it** and record:
- **company, role, type** (Internship | Full-time), **category**, **location**, **remote** (On-site | Hybrid | Remote | Unknown)
  - category is one of the Categories in `src/Config.gs`
- **live**: confirm it's still accepting applications.
- **deadline**: YYYY-MM-DD if stated, else "Rolling".
- **pay**: exactly as listed, or omit it if not listed. Pay that isn't listed is fine; the sheet will mark it Unknown.
- **requirements vs profile**: degree/graduation window (she graduates May 2027), years of experience, work authorization, location.
- **fit**: 1–5, using the rubric in `profile.md`.
- **resume**: one of `General`, `Product (Anthropic)`, `Consulting (BlueMatter)`, `Finance (Jefferies)`, `Harlem`.
- **why**: ONE line saying why it fits her specifically. Cite her real experience, e.g. "Pfizer GRS regtech eval maps to their regulatory intelligence work".

Drop a posting if:
- **Pay** is stated **below the bar** (internship < $30/hr, full-time < $100k base) **and** the company isn't on the prestige list.
  - Mark prestige companies below the bar as fine; the sheet labels them "Exception".
- **Fit** is ≤ 2.
- **Location** is outside the tiers and the role isn't remote.

## Step 5: dedupe and add
- Dedupe against `existing` by link, or by company + similar role title. Also dedupe within this run.
- Post the survivors in one call (the web app also dedupes):
  ```bash
  curl -sL -X POST "$TRACKER_URL?token=$TRACKER_TOKEN" -H 'Content-Type: text/plain' --data-binary @/tmp/new_roles.json
  ```
  `/tmp/new_roles.json` = `{"rows":[{"company":"…","role":"…","type":"Internship","category":"…","location":"…","remote":"On-site","pay":"$40/hr","link":"https://…","deadline":"2026-11-30","fit":4,"resume":"General","why":"…","notes":"…"}]}`
  (Use `Content-Type: text/plain`, since Apps Script web apps reject preflighted JSON from some clients. The body is still JSON.)

## Step 6: report to Jean
Show a table sorted by deadline (soonest first), then fit:
`Deadline | Company | Role | Location | Pay | Fit | Why`

After the table, give:
- a count: added / skipped as duplicates / dropped for pay or fit
- any watchlist boards you discovered or that broke
- a reminder that rows are waiting in **Discovered**: tick "Move to Applications" on the good ones.
