// Concatenates src/*.gs into dist/JobTracker.gs for copy-paste setup (no clasp needed).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const order = ['Config', 'Lib', 'Sheets', 'Setup', 'Gmail', 'Jobs', 'WebApp', 'Seed'];
let out = '/**\n * Job Tracker — ALL code in one file, for copy-paste into the Apps Script editor.\n' +
  " * Generated from src/*.gs by 'npm run bundle'. Don't edit here; edit src/ and re-bundle.\n */\n";
for (const f of order) {
  out += `\n// ===================================================================== ${f}.gs\n`;
  out += fs.readFileSync(path.join(root, 'src', f + '.gs'), 'utf8');
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'JobTracker.gs'), out);
fs.copyFileSync(path.join(root, 'src', 'appsscript.json'), path.join(root, 'dist', 'appsscript.json'));
console.log('wrote dist/JobTracker.gs (' + out.length + ' chars)');
