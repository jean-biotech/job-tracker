// Writes dist/ROLES.md: a readable table of researched roles, soonest deadline first.
const fs = require('fs');
const path = require('path');
const roles = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const esc = s => String(s || '').replace(/\|/g, '/').replace(/\n/g, ' ');
const rows = roles.map(j => `| ${j.deadline || 'Rolling'} | ${esc(j.company)} | ${j.link ? `[${esc(j.role)}](${j.link})` : esc(j.role)} | ${esc(j.type)} | ${esc(j.location)} | ${esc(j.pay) || '—'} | ${j.fit} | ${esc(j.why)} |`);
const md = `# Open roles — researched ${new Date().toISOString().slice(0, 10)} (${roles.length})

Sorted by deadline, then fit (5 = best). Found via web search: **open each link to confirm it's live before applying.**
Full eligibility notes are in each row's Notes column in the Sheet.

| Deadline | Company | Role | Type | Location | Pay | Fit | Why it fits |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'ROLES.md'), md);
console.log('wrote dist/ROLES.md');
