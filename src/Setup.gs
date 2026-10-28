/**
 * Setup.gs — builds every tab, format, dropdown, formula, filter view and trigger.
 * Safe to re-run: it never deletes your rows.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Job Tracker')
    .addItem('Run setup (safe to re-run)', 'setup')
    .addSeparator()
    .addItem('Scan Gmail now', 'processNewEmails')
    .addItem('Backfill Gmail from Aug 1, 2026', 'startBackfill')
    .addItem('Mark ghosted now', 'markGhosted')
    .addItem('Recompute pay bars', 'recomputePay')
    .addItem('Send digest now', 'dailyDigest')
    .addSeparator()
    .addItem('Show /find-jobs web app token', 'showToken')
    .addToUi();
}

function setup() {
  var ss = ss_();
  ss.setSpreadsheetTimeZone(CFG.TZ);
  setupApplications_(ss);
  setupDiscovered_(ss);
  setupSimpleTab_(ss, CFG.SHEET.LOG, CFG.LOG_COLS, [95, 220, 360, 160, 110, 90, 260, 90, 150]);
  setupSimpleTab_(ss, CFG.SHEET.HISTORY, CFG.HISTORY_COLS, [140, 90, 160, 220, 110, 110, 90]);
  ss.getSheetByName(CFG.SHEET.HISTORY).hideSheet();
  setupSettings_(ss);
  setupDashboard_(ss);
  var seeded = seedIfEmpty_();
  try {
    if (typeof Sheets === 'undefined') throw new Error('Sheets service not enabled');
    setupFilterViews_(ss);
  } catch (e) {
    Logger.log('Filter views unavailable (' + e + '); using view tabs instead');
    setupViewTabs_(ss);
  }
  installTriggers_();
  ensureToken_();
  // tab order
  [CFG.SHEET.DASH, CFG.SHEET.APPS, CFG.SHEET.DISC, CFG.SHEET.LOG, CFG.SHEET.SETTINGS]
    .forEach(function (n, i) {
      var sh = ss.getSheetByName(n);
      ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1);
    });
  ss.setActiveSheet(ss.getSheetByName(CFG.SHEET.APPS));
  ss.toast('Setup done' + (seeded ? ' — added ' + seeded + ' seed rows' : '') +
    '. Next: Job Tracker → Backfill Gmail.', 'Job Tracker', 8);
  return { seeded: seeded };
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var existing = headers_(sh);
  if (!existing.length || existing.every(function (h) { return !h; })) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    // add any missing headers at the end, never reorder user data
    headers.forEach(function (h) {
      if (existing.indexOf(h) === -1) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
        existing.push(h);
      }
    });
  }
  sh.getRange(1, 1, 1, sh.getLastColumn())
    .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff').setWrap(true);
  sh.setFrozenRows(1);
  return sh;
}

function colLetter_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function listRule_(values) {
  return SpreadsheetApp.newDataValidation().requireValueInList(values, true)
    .setAllowInvalid(false).build();
}

function setupApplications_(ss) {
  var sh = ensureSheet_(ss, CFG.SHEET.APPS, CFG.APP_COLS);
  var c = colMap_(sh), max = Math.max(sh.getMaxRows(), 1000);
  if (sh.getMaxRows() < 1000) sh.insertRowsAfter(sh.getMaxRows(), 1000 - sh.getMaxRows());
  var L = function (h) { return colLetter_(c[h]); };
  var n = max - 1;
  function col(h) { return sh.getRange(2, c[h], n, 1); }

  // formulas (header-row ARRAYFORMULAs so they follow sorting and new rows)
  var A = L('Company'), M = L('Deadline');
  sh.getRange(1, c['Days left']).setFormula(
    '={"Days left";ARRAYFORMULA(IF(' + A + '2:' + A + '="","",IF(ISNUMBER(' + M + '2:' + M +
    '),' + M + '2:' + M + '-TODAY(),"")))}');
  sh.getRange(1, c['Urgency']).setFormula(
    '={"Urgency";ARRAYFORMULA(IF(' + A + '2:' + A + '="","",IF(NOT(ISNUMBER(' + M + '2:' + M +
    ')),"Rolling",IF(' + M + '2:' + M + '<TODAY(),"Overdue",IF(' + M + '2:' + M +
    '-TODAY()<=7,"This week",IF(' + M + '2:' + M + '-TODAY()<=14,"2 weeks","Later"))))))}');

  // dropdowns
  col('Type').setDataValidation(listRule_(CFG.TYPES));
  col('Category').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(CFG.CATEGORIES, true).setAllowInvalid(true).build());
  col('Remote?').setDataValidation(listRule_(['On-site', 'Hybrid', 'Remote', 'Unknown']));
  col('Meets pay bar').setDataValidation(listRule_(['Yes', 'No', 'Exception', 'Unknown']));
  col('Fit score').setDataValidation(listRule_(['1', '2', '3', '4', '5']));
  col('Source').setDataValidation(listRule_(CFG.SOURCES));
  col('Status').setDataValidation(listRule_(CFG.STATUSES));
  col('Furthest stage reached').setDataValidation(listRule_(CFG.STAGES));
  col('Resume version').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(CFG.RESUMES, true).setAllowInvalid(true).build());
  col('Needs review').insertCheckboxes();
  ['Deadline', 'Date applied', 'Last update', 'Next action date'].forEach(function (h) {
    col(h).setNumberFormat('mmm d, yyyy');
  });

  // conditional formatting (order matters: first match wins)
  var all = sh.getRange(2, 1, n, CFG.APP_COLS.length);
  var P = L('Status'), Z = L('Needs review');
  var rules = [
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$' + P + '2="Offer"')
      .setBackground('#b7e1cd').setFontColor('#0b5132').setRanges([all]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=OR($' + P + '2="Rejected",$' + P + '2="Withdrawn")')
      .setBackground('#eeeeee').setFontColor('#9e9e9e').setRanges([all]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND(ISNUMBER($' + M + '2),$' + M + '2<TODAY(),OR($' + P +
        '2="To apply",$' + P + '2="In progress"))')
      .setBackground('#e06666').setFontColor('#ffffff').setRanges([all]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND(ISNUMBER($' + M + '2),$' + M + '2>=TODAY(),$' + M +
        '2-TODAY()<=7,$' + P + '2<>"Ghosted")')
      .setBackground('#f4cccc').setRanges([all]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$' + Z + '2=TRUE')
      .setBackground('#fff2cc').setRanges([sh.getRange(2, c['Needs review'], n, 1)]).build()
  ];
  sh.setConditionalFormatRules(rules);

  sh.setFrozenColumns(2);
  var widths = { 'Company': 170, 'Role': 260, 'Type': 90, 'Category': 170, 'Location': 140,
    'Remote?': 80, 'Pay (as listed)': 150, 'Pay normalized': 110, 'Meets pay bar': 90,
    'Fit score': 60, 'Link': 120, 'Source': 85, 'Deadline': 100, 'Days left': 70,
    'Urgency': 85, 'Status': 105, 'Furthest stage reached': 110, 'Date applied': 100,
    'Last update': 100, 'Last email subject': 240, 'Recruiter / contact': 160,
    'Next action': 200, 'Next action date': 100, 'Resume version': 140, 'Notes': 320,
    'Needs review': 70, 'Row ID': 85 };
  Object.keys(widths).forEach(function (h) { if (c[h]) sh.setColumnWidth(c[h], widths[h]); });
  sh.getRange(2, c['Notes'], n, 1).setWrap(true);
}

function setupDiscovered_(ss) {
  var sh = ensureSheet_(ss, CFG.SHEET.DISC, CFG.DISC_COLS);
  var c = colMap_(sh), n = Math.max(sh.getMaxRows(), 500) - 1;
  sh.getRange(2, c['Move to Applications'], n, 1).insertCheckboxes();
  sh.getRange(2, c['Type'], n, 1).setDataValidation(listRule_(CFG.TYPES));
  sh.getRange(2, c['Deadline'], n, 1).setNumberFormat('mmm d, yyyy');
  sh.getRange(2, c['Date found'], n, 1).setNumberFormat('mmm d, yyyy');
  sh.setFrozenColumns(2);
  [['Company', 170], ['Role', 260], ['Why it fits', 340], ['Notes', 240], ['Link', 120],
   ['Move to Applications', 110]].forEach(function (w) { sh.setColumnWidth(c[w[0]], w[1]); });
  sh.getRange(2, c['Why it fits'], n, 1).setWrap(true);
}

function setupSimpleTab_(ss, name, headers, widths) {
  var sh = ensureSheet_(ss, name, headers);
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  return sh;
}

function setupSettings_(ss) {
  var sh = ss.getSheetByName(CFG.SHEET.SETTINGS);
  if (sh && sh.getLastRow() > 1) return; // already filled — keep user edits
  if (!sh) sh = ss.insertSheet(CFG.SHEET.SETTINGS);
  var cols = [
    ['Setting', 'Value'], null,
    ['Prestige exceptions'], null,
    ['Watchlist company', 'Board type', 'Board slug or careers URL'], null,
    ['Locations – tier 1'], ['Locations – tier 2'], null,
    ['Confirmation phrases'], ['Rejection phrases'], ['Assessment phrases'],
    ['Interview phrases'], ['Offer phrases'], ['ATS sender domains']
  ];
  var hdr = [];
  cols.forEach(function (g) { if (g) hdr = hdr.concat(g); else hdr.push(''); });
  sh.getRange(1, 1, 1, hdr.length).setValues([hdr]);
  sh.getRange(1, 1, 1, hdr.length).setFontWeight('bold').setBackground('#1f3a5f')
    .setFontColor('#ffffff').setWrap(true);
  sh.setFrozenRows(1);
  var c = colMap_(sh);

  var scal = Object.keys(CFG.DEFAULT_SETTINGS).map(function (k) { return [k, CFG.DEFAULT_SETTINGS[k]]; });
  sh.getRange(2, 1, scal.length, 2).setValues(scal);
  function list(h, arr) {
    if (!arr.length) return;
    sh.getRange(2, c[h], arr.length, 1).setValues(arr.map(function (x) { return [x]; }));
  }
  list('Prestige exceptions', CFG.PRESTIGE);
  list('Locations – tier 1', CFG.LOCATIONS_TIER1);
  list('Locations – tier 2', CFG.LOCATIONS_TIER2);
  list('Confirmation phrases', CFG.KEYWORDS.Confirmation);
  list('Rejection phrases', CFG.KEYWORDS.Rejection);
  list('Assessment phrases', CFG.KEYWORDS.Assessment);
  list('Interview phrases', CFG.KEYWORDS.Interview);
  list('Offer phrases', CFG.KEYWORDS.Offer);
  list('ATS sender domains', CFG.ATS_DOMAINS);
  if (typeof WATCHLIST !== 'undefined' && WATCHLIST.length) {
    sh.getRange(2, c['Watchlist company'], WATCHLIST.length, 3).setValues(
      WATCHLIST.map(function (w) { return [w[0], w[1], w[2]]; }));
  }
  sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 170);
  sh.setColumnWidth(c['Prestige exceptions'], 190);
  sh.setColumnWidth(c['Watchlist company'], 170);
  sh.setColumnWidth(c['Board slug or careers URL'], 260);
  sh.getRange(CFG.PRESTIGE.length - 7, c['Prestige exceptions'], 9, 1)
    .setNote('Added by Claude (not on your original list). Delete any you don\'t want.');
}

function setupDashboard_(ss) {
  var sh = ss.getSheetByName(CFG.SHEET.DASH) || ss.insertSheet(CFG.SHEET.DASH);
  sh.clear();
  sh.getCharts().forEach(function (ch) { sh.removeChart(ch); });
  var A = "'" + CFG.SHEET.APPS + "'!";
  sh.getRange('A1').setValue('Job Tracker — Dashboard').setFontSize(16).setFontWeight('bold');

  // counts by status
  sh.getRange(3, 1, 1, 2).setValues([['Status', 'Count']]);
  CFG.STATUSES.forEach(function (s, i) {
    sh.getRange(4 + i, 1).setValue(s);
    sh.getRange(4 + i, 2).setFormula('=COUNTIF(' + A + 'P2:P,A' + (4 + i) + ')');
  });
  var tot = 4 + CFG.STATUSES.length;
  sh.getRange(tot, 1).setValue('Total');
  sh.getRange(tot, 2).setFormula('=SUM(B4:B' + (tot - 1) + ')');

  // metrics
  var stages = '{"Assessment","Interview R1","Interview R2","Final round","Offer"}';
  var metrics = [
    ['Applied (has a date)', '=COUNT(' + A + 'R2:R)'],
    ['Got any response', '=SUMPRODUCT((' + A + 'R2:R<>"")*(((' + A + 'P2:P="Rejected")+ISNUMBER(MATCH(' +
      A + 'Q2:Q,' + stages + ',0)))>0))'],
    ['Response rate', '=IFERROR(E5/E4,0)'],
    ['Reached an interview', '=SUMPRODUCT(--ISNUMBER(MATCH(' + A +
      'Q2:Q,{"Interview R1","Interview R2","Final round","Offer"},0)))'],
    ['Interview rate', '=IFERROR(E7/E4,0)'],
    ['Ghosted', '=COUNTIF(' + A + 'P2:P,"Ghosted")'],
    ['Needs review (emails)', '=COUNTIF(' + A + 'Z2:Z,TRUE)'],
    ['Due in next 7 days (open)', '=SUMPRODUCT((' + A + 'N2:N<>"")*(' + A + 'N2:N>=0)*(' + A +
      'N2:N<=7)*((' + A + 'P2:P="To apply")+(' + A + 'P2:P="In progress")))'],
    ['Waiting in Discovered', "=COUNTA('" + CFG.SHEET.DISC + "'!A2:A)"]
  ];
  sh.getRange(3, 4, 1, 2).setValues([['Metric', 'Value']]);
  metrics.forEach(function (m, i) {
    sh.getRange(4 + i, 4).setValue(m[0]);
    sh.getRange(4 + i, 5).setFormula(m[1]);
  });
  sh.getRange('E6').setNumberFormat('0%');
  sh.getRange('E8').setNumberFormat('0%');

  // applications per week (last 12 weeks, weeks start Monday)
  sh.getRange(3, 7, 1, 2).setValues([['Week of', 'Applications']]);
  for (var i = 0; i < 12; i++) {
    var r = 4 + i;
    sh.getRange(r, 7).setFormula('=TODAY()-WEEKDAY(TODAY(),3)-7*' + (11 - i));
    sh.getRange(r, 8).setFormula('=COUNTIFS(' + A + 'R2:R,">="&G' + r + ',' + A + 'R2:R,"<"&G' + r + '+7)');
  }
  sh.getRange('G4:G15').setNumberFormat('mmm d');
  [sh.getRange('A3:B3'), sh.getRange('D3:E3'), sh.getRange('G3:H3')].forEach(function (r) {
    r.setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  });
  sh.setColumnWidth(1, 120); sh.setColumnWidth(4, 200); sh.setColumnWidth(7, 90);

  sh.insertChart(sh.newChart().setChartType(Charts.ChartType.COLUMN)
    .addRange(sh.getRange('G3:H15')).setPosition(18, 1, 0, 0)
    .setOption('title', 'Applications per week').setOption('legend', { position: 'none' })
    .build());
  sh.insertChart(sh.newChart().setChartType(Charts.ChartType.BAR)
    .addRange(sh.getRange('A3:B' + (tot - 1))).setPosition(18, 6, 0, 0)
    .setOption('title', 'Roles by status').setOption('legend', { position: 'none' })
    .build());
}

/** Filter views need the Sheets advanced service. */
function setupFilterViews_(ss) {
  var id = ss.getId();
  var sh = ss.getSheetByName(CFG.SHEET.APPS), sid = sh.getSheetId();
  var c = colMap_(sh);
  var titles = ['Urgent', 'Active pipeline', 'Closed'];
  var meta = Sheets.Spreadsheets.get(id, { fields: 'sheets(properties.sheetId,filterViews(filterViewId,title))' });
  var reqs = [];
  (meta.sheets || []).forEach(function (s) {
    (s.filterViews || []).forEach(function (fv) {
      if (titles.indexOf(fv.title) !== -1) reqs.push({ deleteFilterView: { filterId: fv.filterViewId } });
    });
  });
  function hideAllBut(keep) {
    return CFG.STATUSES.filter(function (s) { return keep.indexOf(s) === -1; }).concat(['']);
  }
  var range = { sheetId: sid, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: CFG.APP_COLS.length };
  function fv(title, specs, sortCol) {
    return { addFilterView: { filter: {
      title: title, range: range, filterSpecs: specs,
      sortSpecs: [{ dimensionIndex: c[sortCol] - 1, sortOrder: 'ASCENDING' }] } } };
  }
  var st = c['Status'] - 1, ur = c['Urgency'] - 1;
  reqs.push(fv('Urgent', [
    { columnIndex: st, filterCriteria: { hiddenValues: hideAllBut(['To apply', 'In progress']) } },
    { columnIndex: ur, filterCriteria: { hiddenValues: ['Later', 'Rolling', ''] } }
  ], 'Deadline'));
  reqs.push(fv('Active pipeline', [
    { columnIndex: st, filterCriteria: { hiddenValues: hideAllBut(
      ['Applied', 'Assessment', 'Interview R1', 'Interview R2', 'Final round', 'Offer']) } }
  ], 'Status'));
  reqs.push(fv('Closed', [
    { columnIndex: st, filterCriteria: { hiddenValues: hideAllBut(['Rejected', 'Ghosted', 'Withdrawn']) } }
  ], 'Company'));
  Sheets.Spreadsheets.batchUpdate({ requests: reqs }, id);
}

/**
 * Fallback for the copy-paste setup (no Sheets API): three read-only tabs that always show
 * the Urgent / Active pipeline / Closed rows. Edit rows on Applications, not here.
 */
function setupViewTabs_(ss) {
  var apps = "'" + CFG.SHEET.APPS + "'!";
  var last = colLetter_(CFG.APP_COLS.length);
  var P = apps + 'P2:P', M = apps + 'M2:M', data = apps + 'A2:' + last;
  var views = [
    ['Urgent', 'SORT(FILTER(' + data + ',((' + P + '="To apply")+(' + P + '="In progress")),ISNUMBER(' + M +
      '),' + M + '-TODAY()<=14),13,TRUE)'],
    ['Active pipeline', 'FILTER(' + data + ',ISNUMBER(MATCH(' + P +
      ',{"Applied","Assessment","Interview R1","Interview R2","Final round","Offer"},0)))'],
    ['Closed', 'FILTER(' + data + ',ISNUMBER(MATCH(' + P + ',{"Rejected","Ghosted","Withdrawn"},0)))']
  ];
  views.forEach(function (v) {
    var sh = ss.getSheetByName(v[0]) || ss.insertSheet(v[0]);
    sh.clear();
    sh.getRange(1, 1, 1, CFG.APP_COLS.length).setValues([CFG.APP_COLS])
      .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
    sh.getRange(2, 1).setFormula('=IFERROR(' + v[1] + ',"(nothing here right now)")');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(2);
    sh.getRange('M2:M').setNumberFormat('mmm d, yyyy');
    sh.getRange('R2:S').setNumberFormat('mmm d, yyyy');
    sh.setTabColor('#999999');
  });
}

var TRIGGER_FNS = ['processNewEmails', 'dailyDigest', 'markGhosted', 'backfill'];

function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGER_FNS.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  var st = getSettings_();
  var hour = Number(st.scalars['Digest hour (ET, 0-23)']);
  if (isNaN(hour)) hour = 7;
  ScriptApp.newTrigger('processNewEmails').timeBased().everyHours(4).inTimezone(CFG.TZ).create();
  ScriptApp.newTrigger('markGhosted').timeBased().everyDays(1).atHour(Math.max(0, hour - 1)).inTimezone(CFG.TZ).create();
  ScriptApp.newTrigger('dailyDigest').timeBased().everyDays(1).atHour(hour).inTimezone(CFG.TZ).create();
}

function seedIfEmpty_() {
  if (typeof SEED_ROWS === 'undefined') return 0;
  if (lastDataRow_(sheet_(CFG.SHEET.APPS)) > 1) return 0;
  var st = getSettings_(), n = 0;
  SEED_ROWS.forEach(function (r) {
    var o = {};
    Object.keys(r).forEach(function (k) { o[k] = r[k]; });
    ['Deadline', 'Date applied', 'Last update', 'Next action date'].forEach(function (k) {
      if (o[k] && /^\d{4}-\d{2}-\d{2}$/.test(o[k])) o[k] = toDate(o[k]);
    });
    if (!o['Furthest stage reached']) o['Furthest stage reached'] = ratchetFurthest('', o['Status']);
    o['Row ID'] = newRowId_();
    o['Needs review'] = !!o['Needs review'];
    enrichPay_(o, st);
    appendRow_(CFG.SHEET.APPS, o);
    n++;
  });
  return n;
}

function recomputePay() {
  var st = getSettings_();
  [CFG.SHEET.APPS, CFG.SHEET.DISC].forEach(function (name) {
    readRows_(name).forEach(function (r) {
      var before = r['Pay normalized'] + '|' + r['Meets pay bar'];
      enrichPay_(r, st);
      if (before !== r['Pay normalized'] + '|' + r['Meets pay bar']) {
        writeRow_(name, r._row, { 'Pay normalized': r['Pay normalized'], 'Meets pay bar': r['Meets pay bar'] }, true);
      }
    });
  });
}

function ensureToken_() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('WEBAPP_TOKEN')) {
    p.setProperty('WEBAPP_TOKEN', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8));
  }
  return p.getProperty('WEBAPP_TOKEN');
}

function showToken() {
  var t = ensureToken_();
  var html = HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif">Put this in your local <code>.env</code> as ' +
    '<code>TRACKER_TOKEN</code>. Treat it like a password.</p>' +
    '<textarea style="width:100%;font-family:monospace" rows="2" readonly>' + t + '</textarea>')
    .setWidth(420).setHeight(160);
  SpreadsheetApp.getUi().showModalDialog(html, '/find-jobs token');
}
