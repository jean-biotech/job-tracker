// Merge researched role JSON files (args) into one deduped, deadline-sorted array on stdout.
const fs = require('fs');
const { load } = require('../test/load');
const L = load(['Config.gs', 'Lib.gs']);
let all = [];
for (const f of process.argv.slice(2)) all = all.concat(JSON.parse(fs.readFileSync(f, 'utf8')));
const out = [];
for (const j of all) {
  if (!j.company || !j.role || L.isDuplicate(j, out)) continue;
  if (!L.CFG.CATEGORIES.includes(j.category)) j.category = 'Other';
  out.push(j);
}
out.sort((a, b) => {
  const da = L.toDate(a.deadline), db = L.toDate(b.deadline);
  if (da && db) return da - db;
  if (da) return -1;
  if (db) return 1;
  return (b.fit || 0) - (a.fit || 0);
});
process.stdout.write(JSON.stringify(out, null, 1));
