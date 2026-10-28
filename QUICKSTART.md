# Quick setup: about 5 minutes, all in the browser

No installs, no terminal. Use any computer, signed in to Chrome as **jennifertranpk@gmail.com**.

1. **Make the Sheet.** Go to **https://sheets.new**. Click "Untitled spreadsheet" at the top left and rename it **Job Tracker**.
2. **Open the script editor.** In the menu, click **Extensions → Apps Script**. A new tab opens.
3. **Paste the code.**
   1. In the new tab, click inside the code area, press **Ctrl+A**, then **Delete**.
   2. Open [`dist/JobTracker.gs`](dist/JobTracker.gs) on GitHub and click **Raw**.
   3. Press **Ctrl+A** then **Ctrl+C**, go back to the editor, and press **Ctrl+V**.
4. **Paste the settings file.**
   1. Click the **⚙️ gear (Project Settings)** on the left.
   2. Tick **"Show 'appsscript.json' manifest file in editor"**.
   3. Click **< > Editor** on the left, then click **appsscript.json**.
   4. Select everything, then paste the contents of [`dist/appsscript.json`](dist/appsscript.json).
5. **Save and run.**
   1. Press **Ctrl+S**.
   2. Click **Code.gs**. In the dropdown next to **▶ Run**, pick **setup**, then click **▶ Run**.
6. **Approve permissions.** This is the one step nobody else can do for you, because it's your Gmail.
   1. Click **Review permissions** and pick your account.
   2. Google warns **"Google hasn't verified this app"**. That's normal for your own script. Click **Advanced → Go to Job Tracker (unsafe)**, then **Allow**.
   3. Gmail access is **read-only**: the script can't send, delete or label anything. It sends one email a day, your digest, to you.
7. **Load your history.** Go back to the Sheet tab and refresh the page. A **Job Tracker** menu appears. Click **Job Tracker → Backfill Gmail from Aug 1, 2026**.

Done. From now on it runs by itself, even with your laptop closed:
- It scans Gmail every 4 hours.
- It emails you a digest every morning at 7am.
- It marks a role Ghosted after 30 days with no reply.

On your phone, install the **Google Sheets** app and open "Job Tracker".

*Optional, later:* to let `/find-jobs` write new roles straight into the Sheet, follow step 8 of [SETUP.md](SETUP.md). Until then, `/find-jobs` gives you the list in chat.
