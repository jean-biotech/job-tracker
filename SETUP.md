# Setup: about 20 minutes, done once on your laptop

Do every Google step signed in as **jennifertranpk@gmail.com**. That's the inbox your applications go to, and the script can only read the account it runs in.

## 1. Install the tools (Mac; on Windows use the same commands in PowerShell)
1. Install **Node.js LTS** from https://nodejs.org. Check it worked by opening Terminal and running `node -v`. It should print v20 or newer.
2. Install clasp, Google's command-line tool for Apps Script:
   ```bash
   npm install -g @google/clasp
   ```
3. Download this project:
   ```bash
   git clone https://github.com/jean-biotech/job-tracker.git
   cd job-tracker
   npm test            # should end with "# fail 0"
   ```

## 2. Turn on the Apps Script API
1. Go to https://script.google.com/home/usersettings
2. Switch **Google Apps Script API** to **On**.

clasp can't push code until this is on.

## 3. Log clasp in to your Google account
```bash
clasp login
```
1. A browser tab opens. Choose **jennifertranpk@gmail.com** and click **Allow**.
2. clasp saves its login token in `~/.clasprc.json`. That file is in your home folder, not in this project. Never copy it into the project or share it.

## 4. Create the Sheet + script
```bash
clasp create --type sheets --title "Job Tracker" --rootDir src
git checkout src/appsscript.json        # clasp overwrites our manifest; restore it
clasp push                              # answer "y" if it asks to overwrite the manifest
```
- `clasp create` prints two links. The **docs.google.com/spreadsheets/...** link is **your tracker**: bookmark it, and it also shows up in the Google Sheets app on your phone.
- If your clasp version says `create` is unknown, use `clasp create-script` with the same flags.
- `.clasp.json` (just the script ID) is created here. It's fine to commit.

## 5. Run setup and approve permissions
1. Open the Sheet, then go to **Extensions → Apps Script**.
2. In the function dropdown at the top, pick **`setup`** and click **Run**.
3. Google asks for permission:
   1. Click **Review permissions** and choose your account.
   2. You'll see **"Google hasn't verified this app."** That's normal for a script you wrote yourself. Click **Advanced → Go to Job Tracker (unsafe)**.
   3. Review the list and click **Allow**.

What each permission is for:

| Google's wording | Why |
|---|---|
| *View your email messages and settings* | **Read-only** Gmail. It cannot send, delete, archive or label mail. |
| *See, edit, create… your spreadsheets* | Writes to the tracker. Needed by the filter-view API. |
| *Send email as you* | Only for the morning digest, sent to yourself. |
| *Allow this application to run when you are not present* | The every-4-hours and daily schedules. |
| *Display and run third-party web content in prompts and sidebars* | The token pop-up. |
| *See your primary email address* | So the digest knows where to go. |

4. Go back to the Sheet and reload it. A **Job Tracker** menu appears. Setup has built all the tabs, the formatting, the filter views and the schedules, and added the seed rows.

## 6. Backfill your Gmail (Aug 1, 2026 → now)
1. Click **Job Tracker → Backfill Gmail from Aug 1, 2026**. It works through one week at a time and keeps going in the background, about 1 minute per chunk, until it catches up.
2. Then check the **Email Log** tab. Every email it classified is listed there, with its confidence and what it did.
3. Rows with **Needs review** ticked are ones where it wasn't sure which role an email belonged to. Fix those by hand.
4. The seed rows (Bessemer, Merck, StepStone…) were entered from memory. The backfill corrects their dates and statuses from your real emails. Each seed row has a note saying what to double-check.

## 7. Phone
Install the **Google Sheets** app and open "Job Tracker". To use a filter view on the phone, tap the filter icon, then **Urgent**, **Active pipeline** or **Closed**.

## 8. Connect /find-jobs (the web app)
1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. The secret token is what protects it. Without the token the web app refuses every request, and even with it, it can only list roles and add rows to Discovered.
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. In the Sheet, click **Job Tracker → Show /find-jobs web app token** and copy it.
6. In this project folder, create a file named `.env`. Git ignores it, so it's never committed.
   ```
   TRACKER_URL=https://script.google.com/macros/s/XXXX/exec
   TRACKER_TOKEN=paste-token-here
   ```
7. Test it:
   ```bash
   set -a; . ./.env; set +a; curl -sL "$TRACKER_URL?token=$TRACKER_TOKEN" | head -c 200
   ```
   You should see `{"ok":true,...`.

## 9. Weekly: run /find-jobs
```bash
cd job-tracker
claude
> /find-jobs
```
The results go to the **Discovered** tab. Tick **Move to Applications** on the ones you like.

## Changing the code later
```bash
npm test && clasp push
```
`clasp push` updates the code. If you changed `WebApp.gs`, also redeploy: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. The URL stays the same.

## Troubleshooting
- **"User has not enabled the Apps Script API"**: redo step 2, then wait 2 minutes.
- **The menu doesn't show up**: reload the Sheet, or run `onOpen` once from the editor.
- **Too many or too few emails picked up**: edit the phrase lists and sender domains on the **Settings** tab. No code change needed.
- **Something broke**: open the editor and look under **Executions**, which shows every scheduled run and any errors.
- **Stop all automation**: open the editor, go to **Triggers** (the alarm-clock icon), and delete them. To bring them back, run `setup` again.
