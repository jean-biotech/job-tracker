/**
 * Jobs.gs — ghosting, the morning digest, and edit handling.
 */

function markGhosted() {
  var st = getSettings_(), today = new Date(), n = 0;
  readRows_(CFG.SHEET.APPS).forEach(function (r) {
    if (shouldGhost(r['Status'], r['Date applied'], r['Last update'], today, st.ghostDays)) {
      writeRow_(CFG.SHEET.APPS, r._row, {
        'Status': 'Ghosted',
        'Next action': 'Optional: one polite follow-up',
        'Notes': appendNote_(r['Notes'], 'Marked Ghosted ' + fmt_(today) + ' (no reply in ' +
          st.ghostDays + ' days). A new email will override this.')
      }, true);
      logHistory_(r['Row ID'], r['Company'], r['Role'], 'Applied', 'Ghosted', 'Auto (30 days)');
      n++;
    }
  });
  return n;
}

/** Morning email to yourself. The ONLY email this project ever sends. */
function dailyDigest() {
  var d = buildDigest_(new Date());
  var st = getSettings_();
  var to = String(st.scalars['Digest to'] || '').trim() || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({ to: to, subject: d.subject, htmlBody: d.html, body: d.text,
    name: 'Job Tracker' });
  return d;
}

function buildDigest_(now) {
  var rows = readRows_(CFG.SHEET.APPS);
  var isOpen = function (r) { return CFG.CLOSED.indexOf(r['Status']) === -1; };
  var daysTo = function (v) { var x = toDate(v); return x ? daysBetween(now, x) : null; };

  var deadlines = rows.filter(function (r) {
    var n = daysTo(r['Deadline']);
    return isOpen(r) && n !== null && n >= 0 && n <= 7;
  }).sort(function (a, b) { return toDate(a['Deadline']) - toDate(b['Deadline']); });

  var urgentToApply = rows.filter(function (r) {
    if (r['Status'] !== 'To apply' && r['Status'] !== 'In progress') return false;
    var u = urgencyOf(r['Deadline'], now);
    return u === 'Overdue' || u === 'This week' || u === '2 weeks';
  }).sort(function (a, b) { return toDate(a['Deadline']) - toDate(b['Deadline']); });

  var followUps = rows.filter(function (r) {
    var n = daysTo(r['Next action date']);
    return isOpen(r) && r['Next action'] && n !== null && n <= 0;
  });

  var review = rows.filter(function (r) { return r['Needs review'] === true; });

  var changes = [];
  var hs = ss_().getSheetByName(CFG.SHEET.HISTORY);
  if (hs && hs.getLastRow() > 1) {
    var since = now.getTime() - 24 * 3600 * 1000;
    hs.getRange(2, 1, hs.getLastRow() - 1, CFG.HISTORY_COLS.length).getValues().forEach(function (h) {
      var t = toDate(h[0]);
      if (t && t.getTime() >= since) changes.push(h);
    });
  }

  function line(r, extra) {
    var link = r['Link'] ? ' <a href="' + r['Link'] + '">link</a>' : '';
    return '<li><b>' + esc_(r['Company']) + '</b> — ' + esc_(r['Role']) + (extra ? ' · ' + extra : '') + link + '</li>';
  }
  function dl(r) {
    var n = daysTo(r['Deadline']);
    return n === 0 ? 'due <b>today</b>' : n < 0 ? '<b>overdue</b>' : 'due in ' + n + 'd (' + fmt_(toDate(r['Deadline'])) + ')';
  }
  var sections = [
    ['Deadlines in the next 7 days', deadlines.map(function (r) { return line(r, dl(r) + ' · ' + r['Status']); })],
    ['Urgent: still "To apply"', urgentToApply.map(function (r) { return line(r, dl(r)); })],
    ['Follow-ups due', followUps.map(function (r) { return line(r, esc_(r['Next action'])); })],
    ['Status changes since yesterday', changes.map(function (h) {
      return '<li><b>' + esc_(h[2]) + '</b> — ' + esc_(h[3]) + ': ' + esc_(h[4] || 'new') + ' → <b>' +
        esc_(h[5]) + '</b> <span style="color:#888">(' + esc_(h[6]) + ')</span></li>';
    })],
    ['Needs your review (email matching was unsure)', review.map(function (r) { return line(r, ''); })]
  ];
  var url = ss_().getUrl();
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px">' +
    sections.map(function (s) {
      return '<h3 style="margin:16px 0 4px">' + s[0] + ' (' + s[1].length + ')</h3>' +
        (s[1].length ? '<ul>' + s[1].join('') + '</ul>' : '<p style="color:#888;margin:0">Nothing.</p>');
    }).join('') +
    '<p style="margin-top:20px"><a href="' + url + '">Open the tracker</a></p></div>';
  var text = sections.map(function (s) {
    return s[0] + ' (' + s[1].length + ')\n' + s[1].map(function (l) {
      return '- ' + l.replace(/<[^>]+>/g, '');
    }).join('\n');
  }).join('\n\n') + '\n\n' + url;
  var subject = 'Job digest ' + fmt_(now) + ': ' + deadlines.length + ' due this week, ' +
    changes.length + ' update' + (changes.length === 1 ? '' : 's');
  return { subject: subject, html: html, text: text,
    counts: { deadlines: deadlines.length, urgent: urgentToApply.length, followUps: followUps.length,
      changes: changes.length, review: review.length } };
}

function esc_(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Simple trigger. Handles:
 *  - Discovered "Move to Applications" checkbox → moves the row.
 *  - Applications Status edits → keeps Furthest stage ratcheted, stamps Last update, logs history.
 *  - Pay / Type / Company edits → recompute pay columns.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet(), name = sh.getName();
  if (e.range.getRow() < 2) return;
  var hs = headers_(sh);
  var top = e.range.getRow(), nrows = e.range.getNumRows();
  var col = e.range.getColumn(), ncols = e.range.getNumColumns();
  var edited = hs.slice(col - 1, col - 1 + ncols);

  if (name === CFG.SHEET.DISC && edited.indexOf('Move to Applications') !== -1) {
    var mc = hs.indexOf('Move to Applications') + 1;
    // bottom-up so deletions don't shift rows we haven't handled
    for (var r = top + nrows - 1; r >= top; r--) {
      if (sh.getRange(r, mc).getValue() === true) moveDiscoveredRow_(r);
    }
    return;
  }
  if (name !== CFG.SHEET.APPS) return;
  var c = colMap_(sh);
  for (var row = top; row < top + nrows; row++) {
    var vals = sh.getRange(row, 1, 1, hs.length).getValues()[0];
    var obj = {};
    hs.forEach(function (h, i) { obj[h] = vals[i]; });
    if (!obj['Company']) continue;
    var upd = {};
    if (!obj['Row ID']) upd['Row ID'] = newRowId_();
    if (edited.indexOf('Status') !== -1) {
      var f = ratchetFurthest(obj['Furthest stage reached'], obj['Status']);
      if (f !== obj['Furthest stage reached']) upd['Furthest stage reached'] = f;
      upd['Last update'] = new Date();
      if (!obj['Date applied'] && stageRank(obj['Status']) >= stageRank('Applied')) upd['Date applied'] = new Date();
      if (obj['Status'] !== 'Rejected' && obj['Needs review'] === true) upd['Needs review'] = false;
      logHistory_(obj['Row ID'] || upd['Row ID'], obj['Company'], obj['Role'],
        nrows === 1 && e.oldValue !== undefined ? e.oldValue : '', obj['Status'], 'Manual');
    }
    if (edited.indexOf('Furthest stage reached') !== -1 && nrows === 1 && e.oldValue &&
        stageRank(obj['Furthest stage reached']) < stageRank(e.oldValue)) {
      upd['Furthest stage reached'] = e.oldValue;   // never backwards
      try { ss_().toast('Furthest stage can only move forward.', 'Job Tracker', 4); } catch (x) {}
    }
    if (edited.some(function (h) { return ['Pay (as listed)', 'Type', 'Company'].indexOf(h) !== -1; })) {
      var st = getSettings_();
      enrichPay_(obj, st);
      upd['Pay normalized'] = obj['Pay normalized'];
      upd['Meets pay bar'] = obj['Meets pay bar'];
    }
    if (!obj['Source']) upd['Source'] = 'My link';
    if (Object.keys(upd).length) writeRow_(CFG.SHEET.APPS, row, upd, true);
  }
}

function moveDiscoveredRow_(r) {
  var dsh = sheet_(CFG.SHEET.DISC);
  var hs = headers_(dsh);
  var vals = dsh.getRange(r, 1, 1, hs.length).getValues()[0];
  var d = {};
  hs.forEach(function (h, i) { d[h] = vals[i]; });
  if (!d['Company']) return;
  var o = {};
  CFG.APP_COLS.forEach(function (h) { if (d.hasOwnProperty(h) && h !== 'Notes') o[h] = d[h]; });
  o['Status'] = 'To apply';
  o['Furthest stage reached'] = 'To apply';
  o['Source'] = 'Discovered';
  o['Notes'] = [d['Why it fits'] ? 'Why: ' + d['Why it fits'] : '', d['Notes'] || '']
    .filter(String).join('\n');
  o['Last update'] = new Date();
  o['Needs review'] = false;
  o['Row ID'] = newRowId_();
  enrichPay_(o, getSettings_());
  appendRow_(CFG.SHEET.APPS, o);
  logHistory_(o['Row ID'], o['Company'], o['Role'], 'Discovered', 'To apply', 'Moved');
  dsh.deleteRow(r);
}
