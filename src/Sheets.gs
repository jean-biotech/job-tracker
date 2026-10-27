/**
 * Sheets.gs — small helpers for reading/writing tabs by header name.
 */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Missing tab "' + name + '". Run Job Tracker → Run setup.');
  return sh;
}

function headers_(sh) {
  var lc = sh.getLastColumn();
  if (lc < 1) return [];
  return sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
}

/** {header: 1-based column} */
function colMap_(sh) {
  var m = {};
  headers_(sh).forEach(function (h, i) { if (h) m[h] = i + 1; });
  return m;
}

/** Last row with something in column A (ARRAYFORMULA columns make getLastRow unreliable). */
function lastDataRow_(sh) {
  var n = sh.getLastRow();
  if (n < 2) return 1;
  var a = sh.getRange(1, 1, n, 1).getValues();
  for (var i = a.length - 1; i >= 1; i--) if (a[i][0] !== '' && a[i][0] !== null) return i + 1;
  return 1;
}

/** Rows as objects keyed by header, plus _row (sheet row number). */
function readRows_(name) {
  var sh = sheet_(name);
  var hs = headers_(sh), last = lastDataRow_(sh);
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, hs.length).getValues();
  return vals.map(function (r, i) {
    var o = { _row: i + 2 };
    hs.forEach(function (h, j) { if (h) o[h] = r[j]; });
    return o;
  });
}

function formulaCols_(name) {
  return name === CFG.SHEET.APPS ? CFG.APP_FORMULA_COLS : [];
}

/** Write obj into a row, skipping formula columns and keys not in the header. */
function writeRow_(name, rowNum, obj, onlyGiven) {
  var sh = sheet_(name);
  var hs = headers_(sh), skip = formulaCols_(name);
  if (onlyGiven) {
    hs.forEach(function (h, j) {
      if (h && obj.hasOwnProperty(h) && skip.indexOf(h) === -1) {
        sh.getRange(rowNum, j + 1).setValue(obj[h] === undefined ? '' : obj[h]);
      }
    });
    return;
  }
  // contiguous segments between formula columns
  var seg = [], start = null;
  function flush(endCol) {
    if (start === null) return;
    sh.getRange(rowNum, start, 1, seg.length).setValues([seg]);
    seg = []; start = null;
  }
  hs.forEach(function (h, j) {
    if (skip.indexOf(h) !== -1) { flush(); return; }
    if (start === null) start = j + 1;
    var v = obj[h];
    seg.push(v === undefined || v === null ? '' : v);
  });
  flush();
}

function appendRow_(name, obj) {
  var sh = sheet_(name);
  var r = lastDataRow_(sh) + 1;
  writeRow_(name, r, obj, false);
  return r;
}

function newRowId_() {
  return 'R' + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

// ---------------------------------------------------------------- settings

function readColumnList_(sh, header) {
  var m = colMap_(sh), c = m[header];
  if (!c) return null;
  var n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, c, n - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (x) { return x; });
}

var SETTINGS_LISTS = {
  'Prestige exceptions': 'prestige',
  'Locations – tier 1': 'tier1',
  'Locations – tier 2': 'tier2',
  'ATS sender domains': 'ats',
  'Confirmation phrases': 'kw_Confirmation',
  'Rejection phrases': 'kw_Rejection',
  'Assessment phrases': 'kw_Assessment',
  'Interview phrases': 'kw_Interview',
  'Offer phrases': 'kw_Offer'
};

/** Settings tab -> object, falling back to Config defaults. */
function getSettings_() {
  var sh = ss_().getSheetByName(CFG.SHEET.SETTINGS);
  var scal = {};
  Object.keys(CFG.DEFAULT_SETTINGS).forEach(function (k) { scal[k] = CFG.DEFAULT_SETTINGS[k]; });
  var lists = {
    prestige: CFG.PRESTIGE, tier1: CFG.LOCATIONS_TIER1, tier2: CFG.LOCATIONS_TIER2,
    ats: CFG.ATS_DOMAINS
  };
  var kw = {};
  Object.keys(CFG.KEYWORDS).forEach(function (k) { kw[k] = CFG.KEYWORDS[k]; });
  var watch = [];
  if (sh) {
    var n = sh.getLastRow();
    if (n >= 2) {
      sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) {
        if (String(r[0]).trim()) scal[String(r[0]).trim()] = r[1];
      });
    }
    Object.keys(SETTINGS_LISTS).forEach(function (h) {
      var l = readColumnList_(sh, h);
      if (l && l.length) {
        var key = SETTINGS_LISTS[h];
        if (key.indexOf('kw_') === 0) kw[key.slice(3)] = l.map(function (x) { return x.toLowerCase(); });
        else lists[key] = l;
      }
    });
    var m = colMap_(sh);
    if (m['Watchlist company'] && n >= 2) {
      sh.getRange(2, m['Watchlist company'], n - 1, 3).getValues().forEach(function (r) {
        if (String(r[0]).trim()) watch.push({ company: r[0], board: r[1], slug: r[2] });
      });
    }
  }
  return {
    scalars: scal,
    bars: { intern: Number(scal['Internship min ($/hr)']) || 30,
            ft: Number(scal['Full-time min ($/yr)']) || 100000 },
    hpw: Number(scal['Hours per week (stipend math)']) || 40,
    ghostDays: Number(scal['Ghost after (days)']) || 30,
    prestige: lists.prestige, tier1: lists.tier1, tier2: lists.tier2, ats: lists.ats,
    keywords: kw, watchlist: watch
  };
}

/** Fill Pay normalized + Meets pay bar on a row object. */
function enrichPay_(obj, st) {
  var pay = parsePay(obj['Pay (as listed)'], { type: obj['Type'], hoursPerWeek: st.hpw });
  obj['Pay normalized'] = pay ? pay.label : 'Unknown';
  obj['Meets pay bar'] = meetsPayBar(obj['Type'], pay, obj['Company'], st.prestige, st.bars);
  return obj;
}

function logHistory_(rowId, company, role, from, to, source) {
  var sh = ss_().getSheetByName(CFG.SHEET.HISTORY);
  if (!sh) return;
  sh.appendRow([new Date(), rowId, company, role, from, to, source]);
}

function asDate_(v) {
  if (v instanceof Date) return v;
  var d = toDate(v);
  return d || v;
}
