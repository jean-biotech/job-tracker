// Loads .gs files into one shared sandbox, the way Apps Script concatenates them.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(files, extraGlobals) {
  const ctx = Object.assign({ console, Date, Math, JSON }, extraGlobals || {});
  vm.createContext(ctx);
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
    vm.runInContext(src, ctx, { filename: f });
  }
  return ctx;
}

module.exports = { load };
