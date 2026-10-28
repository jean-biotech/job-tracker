# Job Tracker

A personal job and internship tracker: a **Google Sheet** that updates itself from Gmail (read-only), plus a weekly **`/find-jobs`** Claude Code command that discovers new roles.

**First time: follow [QUICKSTART.md](QUICKSTART.md)** (3 steps, browser only). [SETUP.md](SETUP.md) is the developer route (clasp + git).

## Weekly routine
1. **Monday:** run `/find-jobs` in Claude Code from this folder. On the **Discovered** tab, tick **Move to Applications** on the roles you want.
2. **Every morning:** read the digest email. Apply to anything in "Urgent", and clear the **Needs review** rows.
3. **After you apply or interview:** set **Status** (on your phone is fine). Gmail usually does it for you within 4 hours.

## What's automated vs. what you do

| Automated (runs inside Google; your laptop can be off) | You do |
|---|---|
| Every 4 h: read new job emails and update Status / Last update / Last email subject / Date applied | Apply. **Nothing ever applies or fills in forms for you.** |
| Create rows for applications it finds in Gmail but you never added | Fix rows flagged **Needs review** (email matching was unsure) |
| Log every classified email to **Email Log** for auditing | Run `/find-jobs` weekly and approve roles in Discovered |
| Keep **Furthest stage reached** from going backwards | Fill in role details Gmail can't know (pay, deadline, link) for Gmail-created rows |
| Mark **Ghosted** after 30 days at Applied with no reply (a later email overrides it) | Choose the resume version and edit Next action |
| 7am digest to you: deadlines this week, urgent To-apply, follow-ups due, yesterday's changes | Edit Settings: pay bars, prestige list, locations, keywords |
| Pay normalization + pay-bar check (Yes / No / Exception / Unknown) | Move rows to Withdrawn when you drop them |
| Days left / Urgency formulas, red/gray/green highlighting, Dashboard | |
| Discovered → Applications move when you tick the checkbox | |

## How it decides things
- **Pay bar:**
  - Internships need ≥ $30/hr; full-time needs ≥ $100k base. A range passes if its top end clears the bar.
  - Stipends are converted at 40 hrs/week (editable in Settings).
  - Prestige-list companies below the bar are marked **Exception**. Pay that isn't listed is marked **Unknown** and never excluded.
- **Email → status:**
  - Confirmation → Applied
  - Assessment / HireVue → Assessment
  - Interview invite → Interview R1. "Second round", "final round" and "superday" move it further.
  - Rejection → Rejected
  - Offer → Offer
- **Never downgrades.** A late duplicate confirmation never reopens a Rejected row.
- **Matching:** emails are matched to rows by company (subject, sender name and domain), then role words.
  - When it isn't sure (for example, two open roles at the same company), it changes nothing, logs the email with low confidence, and ticks **Needs review**.
- **Read-only Gmail:** the script only has the `gmail.readonly` permission. It can't send, delete, archive or label mail. The single email it sends is your digest, through a separate send-only permission.

## Files
| Path | What |
|---|---|
| `src/Config.gs` | Columns, statuses, default settings (prestige list, keywords, ATS domains) |
| `src/Lib.gs` | Pure logic: pay parsing, classifier, matching, stage rules (unit-tested) |
| `src/Setup.gs` | Builds the tabs, formatting, filter views, dashboard and triggers |
| `src/Gmail.gs` | Backfill + 4-hourly scan |
| `src/Jobs.gs` | Ghosting, digest, onEdit (checkbox move, ratchet) |
| `src/WebApp.gs` | Token-protected API used by `/find-jobs` |
| `src/Seed.gs` | Your initial pipeline + researched links |
| `.claude/commands/find-jobs.md` | The weekly discovery command |
| `profile.md` | What `/find-jobs` scores fit against. Update it when your resume changes. |
| `resumes/` | Put your resume PDFs here. Git ignores this folder. |
| `test/` | `npm test`: unit tests + a full simulated run against fake Google services |

Secrets stay out of git (`.gitignore`): `.env` (web app token), `.clasprc.json` (clasp login), `resumes/`.
