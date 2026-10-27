/**
 * Gmail.gs — READ-ONLY scan of job emails.
 * Uses the Gmail advanced service under the gmail.readonly scope only, so this
 * script physically cannot send, delete, archive or label mail.
 */

var SCAN_BUDGET_MS = 4.5 * 60 * 1000;   // Apps Script hard limit is 6 min
var BACKFILL_WINDOW_DAYS = 7;
var MIN_CLASS_CONF = 0.6;
var MIN_MATCH_CONF = 0.75;

/** Menu: start (or restart) the Aug 1 → today backfill. */
function startBackfill() {
  var p = PropertiesService.getScriptProperties();
  p.setProperty('BACKFILL_CURSOR', CFG.BACKFILL_START);
  p.deleteProperty('BACKFILL_DONE');
  backfill();
}

/** Processes one week at a time, oldest first, and re-schedules itself until caught up. */
function backfill() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try { backfillLocked_(); } finally { lock.releaseLock(); }
}

function backfillLocked_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('BACKFILL_DONE')) return;
  var cursor = p.getProperty('BACKFILL_CURSOR') || CFG.BACKFILL_START;
  var started = Date.now(), ctx = scanContext_();
  var today = new Date();
  while (Date.now() - started < SCAN_BUDGET_MS) {
    var from = parseGmailDate_(cursor);
    if (from > today) {
      p.setProperty('BACKFILL_DONE', '1');
      p.setProperty('LAST_SCAN', String(Date.now()));
      finishContext_(ctx);
      clearBackfillTriggers_();
      markGhosted();
      safeToast_('Backfill finished: ' + ctx.stats.processed + ' emails this run.');
      return;
    }
    var to = new Date(from.getTime() + BACKFILL_WINDOW_DAYS * 86400000);
    var ok = scanWindow_(gmailDate_(from), gmailDate_(to), ctx, started);
    if (!ok) break; // out of time mid-window; redo this window next run (dupes are skipped)
    cursor = gmailDate_(to);
    p.setProperty('BACKFILL_CURSOR', cursor);
  }
  finishContext_(ctx);
  // not done yet: continue in a minute
  clearBackfillTriggers_();
  ScriptApp.newTrigger('backfill').timeBased().after(60 * 1000).create();
  safeToast_('Backfill in progress (now at ' + cursor + '). It continues on its own.');
}

/** Every-4-hours trigger: look at the last few days and skip anything already logged. */
function processNewEmails() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return null;   // a backfill run is busy; next trigger will catch up
  try { return processNewEmailsLocked_(); } finally { lock.releaseLock(); }
}

function processNewEmailsLocked_() {
  var p = PropertiesService.getScriptProperties();
  var last = Number(p.getProperty('LAST_SCAN')) || parseGmailDate_(CFG.BACKFILL_START).getTime();
  var since = new Date(last - 2 * 86400000);   // 2-day overlap, de-duped by Message ID
  var ctx = scanContext_();
  var started = Date.now();
  var ok = scanWindow_(gmailDate_(since), '', ctx, started);
  finishContext_(ctx);
  if (ok) p.setProperty('LAST_SCAN', String(started));
  return ctx.stats;
}

function clearBackfillTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'backfill') ScriptApp.deleteTrigger(t);
  });
}

function gmailDate_(d) {
  return Utilities.formatDate(d, CFG.TZ, 'yyyy/MM/dd');
}
function parseGmailDate_(s) {
  var p = String(s).split('/');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

function buildQuery_(after, before, st) {
  var ats = st.ats.map(function (d) { return 'from:' + d; }).join(' OR ');
  var phrases = ['"thank you for applying"', '"thanks for applying"', '"your application"',
    '"application received"', '"other candidates"', '"moving forward"', '"move forward"',
    'interview', 'assessment', 'hirevue', '"next steps"', '"offer letter"', 'candidacy',
    '"application status"', '"your candidacy"', 'superday'];
  var q = 'after:' + after + (before ? ' before:' + before : '') +
    ' {' + ats + ' ' + phrases.join(' ') + '}' +
    ' -in:sent -in:chats -in:drafts -category:promotions -category:social';
  var only = String(st.scalars['Only emails to (optional)'] || '').trim();
  if (only) q += ' to:' + only;
  String(st.scalars['Ignore emails to'] || '').split(/[,\s]+/).forEach(function (x) {
    if (x) q += ' -to:' + x;
  });
  return q;
}

function scanContext_() {
  var st = getSettings_();
  var logSh = sheet_(CFG.SHEET.LOG);
  var lc = colMap_(logSh), seen = {};
  var n = lastDataRow_(logSh);
  if (n >= 2) {
    logSh.getRange(2, lc['Message ID'], n - 1, 1).getValues().forEach(function (r) {
      if (r[0]) seen[r[0]] = true;
    });
  }
  return {
    st: st, seen: seen, rows: readRows_(CFG.SHEET.APPS), dirty: {}, newRows: [], log: [],
    stats: { processed: 0, updated: 0, created: 0, review: 0, skipped: 0 }
  };
}

/** Returns false if it ran out of time before finishing the window. */
function scanWindow_(after, before, ctx, started) {
  var q = buildQuery_(after, before, ctx.st);
  var ids = [], token;
  do {
    var res = Gmail.Users.Messages.list('me', { q: q, maxResults: 100, pageToken: token });
    (res.messages || []).forEach(function (m) { ids.push(m.id); });
    token = res.nextPageToken;
  } while (token);
  var msgs = [];
  for (var i = 0; i < ids.length; i++) {
    if (ctx.seen[ids[i]]) { ctx.stats.skipped++; continue; }
    if (Date.now() - started > SCAN_BUDGET_MS) return false;
    msgs.push(fetchMessage_(ids[i]));
  }
  msgs.sort(function (a, b) { return a.date - b.date; });   // oldest first so statuses move forward
  msgs.forEach(function (m) { processMessage_(m, ctx); });
  return true;
}

function fetchMessage_(id) {
  var m = Gmail.Users.Messages.get('me', id, { format: 'full' });
  var h = {};
  ((m.payload && m.payload.headers) || []).forEach(function (x) { h[x.name.toLowerCase()] = x.value; });
  return {
    id: m.id, threadId: m.threadId,
    date: new Date(Number(m.internalDate)),
    from: h['from'] || '', to: h['to'] || '', subject: h['subject'] || '',
    body: extractBody_(m.payload)
  };
}

function decode_(data) {
  try {
    return Utilities.newBlob(Utilities.base64DecodeWebSafe(data)).getDataAsString('UTF-8');
  } catch (e) { return ''; }
}

function extractBody_(payload) {
  var plain = '', html = '';
  (function walk(p) {
    if (!p) return;
    if (p.mimeType === 'text/plain' && p.body && p.body.data && !plain) plain = decode_(p.body.data);
    else if (p.mimeType === 'text/html' && p.body && p.body.data && !html) html = decode_(p.body.data);
    (p.parts || []).forEach(walk);
  })(payload);
  if (plain) return plain;
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"').replace(/[ \t]+/g, ' ');
}

/** Core: classify one email, match it to a row, update or log. */
function processMessage_(msg, ctx) {
  ctx.seen[msg.id] = true;
  ctx.stats.processed++;
  var st = ctx.st;
  var cls = classifyEmail(msg.subject, msg.body, msg.from, st.keywords, st.ats);
  var cands = companyCandidates(msg.subject, msg.body, msg.from, st.ats);
  var text = msg.subject + ' ' + msg.body.slice(0, 2500);
  var all = ctx.rows.concat(ctx.newRows);
  var match = matchEmailToRow(cands, text, all.map(function (r) {
    return { company: r['Company'], role: r['Role'], status: r['Status'] };
  }));
  var conf = Math.min(cls.confidence, match.index >= 0 ? match.confidence : 1);
  var action = '', rowId = '';

  if (cls.label === 'Other') {
    if (match.index < 0 || match.confidence < MIN_MATCH_CONF) return; // not a job email
    action = 'Other (no change)';
    rowId = all[match.index]['Row ID'];
  } else if (match.index >= 0 && match.confidence >= MIN_MATCH_CONF && cls.confidence >= MIN_CLASS_CONF) {
    var row = all[match.index];
    action = applyEmailToRow_(row, msg, cls, ctx);
    rowId = row['Row ID'];
  } else if (match.index >= 0) {
    var r2 = all[match.index];
    r2['Needs review'] = true;
    r2['Notes'] = appendNote_(r2['Notes'], 'Check email "' + msg.subject + '" (' +
      fmt_(msg.date) + '): looked like ' + cls.label + ', ' + match.reason);
    markDirty_(r2, ctx);
    action = 'Needs review — ' + match.reason + (cls.confidence < MIN_CLASS_CONF ? ', unclear type' : '');
    rowId = r2['Row ID'];
    ctx.stats.review++;
  } else if (cands.length && cls.confidence >= MIN_CLASS_CONF) {
    var created = createRowFromEmail_(msg, cls, cands, ctx);
    action = 'Created row (' + created['Status'] + ')';
    rowId = created['Row ID'];
    conf = Math.min(conf, 0.7);
  } else {
    action = 'Not matched — no company found';
    conf = Math.min(conf, 0.3);
  }
  ctx.log.push([msg.date, msg.from, msg.subject, match.company || cands[0] || '', cls.label,
    Math.round(conf * 100) / 100, action, rowId, msg.id]);
}

function applyEmailToRow_(row, msg, cls, ctx) {
  var round = cls.label === 'Interview' ? detectRound(msg.subject + ' ' + msg.body.slice(0, 3000)) : '';
  var ns = nextStatus(row['Status'], cls.label, round);
  var before = row['Status'];
  var lu = toDate(row['Last update']);
  if (!lu || msg.date >= lu) {
    row['Last update'] = msg.date;
    row['Last email subject'] = msg.subject;
  }
  if (cls.label === 'Confirmation' && !row['Date applied']) row['Date applied'] = msg.date;
  if (!row['Recruiter / contact'] && isPersonSender(msg.from)) row['Recruiter / contact'] = msg.from;
  if (ns.changed) {
    row['Status'] = ns.status;
    row['Furthest stage reached'] = ratchetFurthest(row['Furthest stage reached'], ns.status);
    if (!row['Date applied'] && stageRank(ns.status) >= stageRank('Applied')) row['Date applied'] = msg.date;
    setNextAction_(row, ns.status, msg.date);
    logHistory_(row['Row ID'], row['Company'], row['Role'], before, ns.status, 'Gmail');
    ctx.stats.updated++;
  }
  if (ns.review) {
    row['Needs review'] = true;
    row['Notes'] = appendNote_(row['Notes'], ns.note + ' (' + fmt_(msg.date) + ')');
    ctx.stats.review++;
  }
  markDirty_(row, ctx);
  return ns.changed ? before + ' → ' + ns.status : 'Logged (status stays ' + row['Status'] + ')' +
    (ns.note ? ' — ' + ns.note : '');
}

function setNextAction_(row, status, when) {
  var plus = function (d) { return new Date(when.getTime() + d * 86400000); };
  var map = {
    'Assessment': ['Complete assessment', 3],
    'Interview R1': ['Schedule + prep first round', 2],
    'Interview R2': ['Schedule + prep second round', 2],
    'Final round': ['Prep final round', 2],
    'Offer': ['Review offer / negotiate', 3],
    'Applied': ['Follow up if no reply', 21],
    'Rejected': ['', 0]
  };
  if (!map[status]) return;
  row['Next action'] = map[status][0];
  row['Next action date'] = map[status][1] ? plus(map[status][1]) : '';
}

function createRowFromEmail_(msg, cls, cands, ctx) {
  var ns = nextStatus('', cls.label, cls.label === 'Interview' ? detectRound(msg.subject + ' ' + msg.body) : '');
  var role = roleFromEmail(msg.subject, msg.body);
  var company = prettyCompany_(cands[0]);
  var o = {
    'Company': company, 'Role': role || '(role not in email — fill in)',
    'Type': guessType(msg.subject + ' ' + role + ' ' + msg.body.slice(0, 1500)),
    'Source': 'Gmail', 'Status': ns.status,
    'Furthest stage reached': ratchetFurthest('', ns.status),
    'Date applied': stageRank(ns.status) >= stageRank('Applied') || ns.status === 'Rejected' ? msg.date : '',
    'Last update': msg.date, 'Last email subject': msg.subject,
    'Recruiter / contact': isPersonSender(msg.from) ? msg.from : '',
    'Needs review': !role || company !== cands[0] || cls.label !== 'Confirmation',
    'Notes': 'Auto-created from Gmail (' + cls.label + ').' +
      (cls.label === 'Rejection' ? ' First email seen was a rejection — earlier stages unknown.' : ''),
    'Row ID': newRowId_(), _new: true
  };
  setNextAction_(o, ns.status, msg.date);
  enrichPay_(o, ctx.st);
  ctx.newRows.push(o);
  logHistory_(o['Row ID'], company, o['Role'], '', ns.status, 'Gmail (new)');
  ctx.stats.created++;
  return o;
}

/** "stepstonegroup" -> "Stepstonegroup"; leaves proper names alone. */
function prettyCompany_(s) {
  if (s !== s.toLowerCase()) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function appendNote_(notes, add) {
  notes = String(notes || '');
  if (notes.indexOf(add) !== -1) return notes;
  return notes ? notes + '\n' + add : add;
}

function fmt_(d) { return Utilities.formatDate(d, CFG.TZ, 'MMM d'); }

function markDirty_(row, ctx) { if (!row._new) ctx.dirty[row._row] = row; }

var EMAIL_WRITE_COLS = ['Status', 'Furthest stage reached', 'Date applied', 'Last update',
  'Last email subject', 'Recruiter / contact', 'Next action', 'Next action date', 'Notes',
  'Needs review'];

function finishContext_(ctx) {
  Object.keys(ctx.dirty).forEach(function (k) {
    var r = ctx.dirty[k], o = {};
    EMAIL_WRITE_COLS.forEach(function (h) { o[h] = r[h] === undefined ? '' : r[h]; });
    writeRow_(CFG.SHEET.APPS, Number(k), o, true);
  });
  ctx.newRows.forEach(function (o) {
    delete o._new;
    appendRow_(CFG.SHEET.APPS, o);
  });
  if (ctx.log.length) {
    var sh = sheet_(CFG.SHEET.LOG), start = lastDataRow_(sh) + 1;
    sh.getRange(start, 1, ctx.log.length, CFG.LOG_COLS.length).setValues(ctx.log);
  }
  ctx.dirty = {}; ctx.newRows = []; ctx.log = [];
  ctx.rows = readRows_(CFG.SHEET.APPS);
}

function safeToast_(msg) {
  try { ss_().toast(msg, 'Job Tracker', 6); } catch (e) { Logger.log(msg); }
}
