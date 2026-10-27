/**
 * WebApp.gs — tiny JSON API used by the /find-jobs Claude Code command.
 * Every request must carry the secret token (Job Tracker → Show token).
 *
 *   GET  ?token=…                 → existing roles (both tabs) + settings, for dedupe and pay rules
 *   POST ?token=…  {rows:[…]}     → append new roles to Discovered (duplicates skipped)
 *
 * It can only read the tracker and append to Discovered. It cannot touch Gmail.
 */

function authorized_(e, body) {
  var want = PropertiesService.getScriptProperties().getProperty('WEBAPP_TOKEN');
  var got = (e && e.parameter && e.parameter.token) || (body && body.token) || '';
  return !!want && got === want;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function existingRoles_() {
  var pick = function (tab) {
    return readRows_(tab).map(function (r) {
      return { tab: tab, company: r['Company'], role: r['Role'], link: r['Link'],
        status: r['Status'] || '', deadline: r['Deadline'] instanceof Date ?
          Utilities.formatDate(r['Deadline'], CFG.TZ, 'yyyy-MM-dd') : r['Deadline'] };
    });
  };
  return pick(CFG.SHEET.APPS).concat(pick(CFG.SHEET.DISC));
}

function doGet(e) {
  if (!authorized_(e)) return json_({ ok: false, error: 'bad token' });
  var st = getSettings_();
  return json_({
    ok: true,
    existing: existingRoles_(),
    settings: { bars: st.bars, prestige: st.prestige, tier1: st.tier1, tier2: st.tier2,
      watchlist: st.watchlist }
  });
}

var POST_FIELDS = {
  company: 'Company', role: 'Role', type: 'Type', category: 'Category', location: 'Location',
  remote: 'Remote?', pay: 'Pay (as listed)', fit: 'Fit score', link: 'Link',
  deadline: 'Deadline', why: 'Why it fits', resume: 'Resume version', notes: 'Notes'
};

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) {
    return json_({ ok: false, error: 'invalid JSON' });
  }
  if (!authorized_(e, body)) return json_({ ok: false, error: 'bad token' });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return json_(addDiscovered_(body.rows || [])); } finally { lock.releaseLock(); }
}

function addDiscovered_(rows) {
  var st = getSettings_();
  var existing = existingRoles_();
  var added = [], skipped = [];
  rows.forEach(function (j) {
    if (!j || !j.company || !j.role) { skipped.push({ job: j, why: 'missing company/role' }); return; }
    if (isDuplicate(j, existing)) { skipped.push({ company: j.company, role: j.role, why: 'duplicate' }); return; }
    var o = { 'Source': 'Discovered', 'Date found': new Date(), 'Move to Applications': false };
    Object.keys(POST_FIELDS).forEach(function (k) { if (j[k] !== undefined) o[POST_FIELDS[k]] = j[k]; });
    if (o['Deadline'] && /^\d{4}-\d{2}-\d{2}$/.test(o['Deadline'])) o['Deadline'] = toDate(o['Deadline']);
    if (!o['Deadline']) o['Deadline'] = 'Rolling';
    enrichPay_(o, st);
    appendRow_(CFG.SHEET.DISC, o);
    existing.push({ company: j.company, role: j.role, link: j.link });
    added.push({ company: j.company, role: j.role, payBar: o['Meets pay bar'] });
  });
  return { ok: true, added: added, skipped: skipped };
}
