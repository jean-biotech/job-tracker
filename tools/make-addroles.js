// Builds dist/AddRoles.gs: a paste-in file that adds researched roles straight to Applications.
// Usage: node tools/make-addroles.js roles.json
// It only uses functions already in JobTracker.gs, so it works with an older paste too.
const fs = require('fs');
const path = require('path');
const roles = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const stamp = new Date().toISOString().slice(0, 10);
const out = `/**
 * AddRoles.gs — ${roles.length} open roles researched on ${stamp}.
 * HOW: paste this as a NEW file next to your main code (Files → + → Script),
 * pick "addRoles" in the Run dropdown, click Run. Safe to run twice: duplicates are skipped.
 */
var NEW_ROLES = ${JSON.stringify(roles, null, 1)};

function addRoles() {
  var st = getSettings_();
  var existing = readRows_(CFG.SHEET.APPS).concat(readRows_(CFG.SHEET.DISC)).map(function (r) {
    return { company: r['Company'], role: r['Role'], link: r['Link'] };
  });
  var sorted = NEW_ROLES.slice().sort(function (a, b) {
    var da = toDate(a.deadline), db = toDate(b.deadline);
    if (da && db) return da - db;
    if (da) return -1;
    if (db) return 1;
    return (b.fit || 0) - (a.fit || 0);
  });
  var added = 0, skipped = 0;
  sorted.forEach(function (j) {
    if (isDuplicate(j, existing)) { skipped++; return; }
    var o = {
      'Company': j.company, 'Role': j.role, 'Type': j.type, 'Category': j.category,
      'Location': j.location, 'Remote?': j.remote || 'Unknown', 'Pay (as listed)': j.pay || 'Not listed',
      'Fit score': j.fit, 'Link': j.link, 'Source': 'Discovered',
      'Deadline': toDate(j.deadline) || 'Rolling', 'Status': 'To apply',
      'Furthest stage reached': 'To apply', 'Resume version': j.resume,
      'Next action': 'Verify posting is open, then apply', 'Last update': new Date(),
      'Notes': 'Why: ' + j.why + (j.notes ? '\\n' + j.notes : '') +
        '\\n[Found by Claude ${stamp} from search results — open the link to confirm before applying.]',
      'Needs review': false, 'Row ID': newRowId_()
    };
    enrichPay_(o, st);
    appendRow_(CFG.SHEET.APPS, o);
    existing.push({ company: j.company, role: j.role, link: j.link });
    logHistory_(o['Row ID'], j.company, j.role, '', 'To apply', 'Claude research');
    added++;
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('Added ' + added + ' roles (' + skipped + ' duplicates skipped).', 'Job Tracker', 10);
  Logger.log('Added ' + added + ', skipped ' + skipped);
}
`;
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'AddRoles.gs'), out);
console.log('wrote dist/AddRoles.gs with ' + roles.length + ' roles');
