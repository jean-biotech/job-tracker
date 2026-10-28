# Setup in 3 steps (about 3 minutes, browser only)

Use Chrome signed in as **jennifertranpk@gmail.com**.

1. **Open the script editor.** Go to **https://sheets.new**. Then click **Extensions → Apps Script**.
2. **Paste the code.** In the editor, press **Ctrl+A** and **Delete**. Then paste everything from [`dist/JobTracker.gs`](dist/JobTracker.gs): on GitHub, click **Raw**, then **Ctrl+A**, **Ctrl+C**, and back in the editor **Ctrl+V**. Press **Ctrl+S** to save.
3. **Run setup.** Make sure the dropdown next to **▶ Run** says **setup**, then click **▶ Run**.
   1. Click **Review permissions** and pick your account.
   2. When it says "Google hasn't verified this app", click **Advanced → Go to … (unsafe) → Allow**.

Then go back to the Sheet tab and refresh. A **Job Tracker** menu appears. Click **Job Tracker → Backfill Gmail from Aug 1, 2026** once.

**That's it. From now on it runs by itself:**
- It scans Gmail every 4 hours.
- It emails you a digest every morning at 7am.
- It marks a role Ghosted after 30 days with no reply.

**About the permission screen:** Google will say the script can "read, compose, send and permanently delete" email. That's Google's standard wording for any script that reads Gmail. This code only reads, and it sends exactly one email, the digest to you. Want Google to enforce read-only instead? Use [SETUP.md](SETUP.md).

On your phone, open "Job Tracker" in the **Google Sheets** app.
