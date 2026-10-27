// End-to-end run of setup → Gmail backfill → ghosting → digest → edits → web app,
// against the in-memory mocks.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');
const { makeEnv } = require('./mock');

const FILES = ['Config.gs', 'Lib.gs', 'Sheets.gs', 'Setup.gs', 'Gmail.gs', 'Jobs.gs', 'WebApp.gs'];
const D = (m, d) => new Date(2026, m - 1, d, 10, 0, 0);
const GH = 'no-reply@us.greenhouse-mail.io';

const SEED = [
  { Company: 'Bessemer Venture Partners', Role: '2027 Summer Analyst', Type: 'Internship', Status: 'Applied', Source: 'My link' },
  { Company: 'Merck', Role: '2027 Future Talent Program – GPAM Intern', Type: 'Internship', Status: 'Applied', Source: 'My link' },
  { Company: 'StepStone Group', Role: '2027 VC & Growth Equity Investor Relations Summer Analyst', Type: 'Internship', Status: 'In progress', Source: 'My link', Location: 'Baltimore, MD' },
  { Company: 'StepStone Group', Role: 'Private Equity Summer Analyst', Type: 'Internship', Status: 'To apply', Source: 'My link' },
  { Company: '1752vc', Role: 'Venture Fellows', Type: 'Internship', Status: 'Applied', 'Date applied': '2026-09-10', Source: 'My link' },
  { Company: 'Neuralink', Role: 'Intern', Type: 'Internship', Status: 'To apply', 'Pay (as listed)': '$25 - $45/hr', Deadline: '2026-10-30', Source: 'My link' }
];

const MESSAGES = [
  { id: 'm1', date: D(9, 5), from: `Bessemer Venture Partners <${GH}>`, subject: 'Thank you for applying to Bessemer Venture Partners - Analyst Program', body: 'Hi Jean, thank you for applying. We will review your application.' },
  { id: 'm2', date: D(9, 20), from: `Bessemer Venture Partners <${GH}>`, subject: 'Bessemer Venture Partners - Interview Invitation', body: 'We would like to invite you to a first round interview. Please select a time.' },
  { id: 'm3', date: D(10, 10), from: GH, subject: 'Update from Bessemer', body: 'Thank you for your time. Unfortunately, we have decided to move forward with other candidates for the second round.' },
  { id: 'm4', date: D(10, 8), from: 'Merck Careers <merck@myworkday.com>', subject: 'Merck Future Talent Program - Interview Confirmation', body: 'Your interview for the GPAM Intern role is confirmed for October 15.' },
  { id: 'm5', date: D(9, 1), from: 'StepStone Group <no-reply@stepstonegroup.com>', subject: 'Thank you for applying to StepStone Group', body: 'Thank you for applying for the 2027 VC & Growth Equity Investor Relations Summer Analyst position.' },
  { id: 'm6', date: D(9, 3), from: 'StepStone Group <no-reply@stepstonegroup.com>', subject: 'Thank you for applying to StepStone Group', body: 'We received your application.' },
  { id: 'm7', date: D(10, 2), from: `Coinbase <no-reply@coinbase.com>`, subject: 'Thank you for applying to Coinbase', body: 'Thanks for applying for the Associate Product Manager Intern position.' },
  { id: 'm8', date: D(10, 3), from: 'LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>', subject: 'Jobs you may be interested in: Pfizer is hiring', body: '30 new jobs' },
  { id: 'm9', date: D(10, 20), from: 'Bessemer Venture Partners <' + GH + '>', subject: 'Thank you for applying to Bessemer Venture Partners - Analyst Program', body: 'duplicate confirmation sent late' }
];

function boot() {
  const env = makeEnv({ messages: MESSAGES });
  const ctx = load(FILES, env);
  ctx.SEED_ROWS = SEED;
  ctx.WATCHLIST = [['Neuralink', 'greenhouse', 'neuralink']];
  return { env, ctx, ss: env._ss };
}

test('setup builds all tabs, formulas, filter views, triggers, seed rows', () => {
  const { env, ctx, ss } = boot();
  const res = ctx.setup();
  assert.equal(res.seeded, SEED.length);
  for (const n of ['Applications', 'Discovered', 'Email Log', 'Settings', 'Dashboard', 'History'])
    assert.ok(ss.getSheetByName(n), n);
  const apps = ss.getSheetByName('Applications');
  assert.equal(apps.data[0].length, 27);
  assert.match(apps.formulas['1,14'], /ARRAYFORMULA/);   // Days left
  assert.match(apps.formulas['1,15'], /Overdue/);        // Urgency
  const rows = apps.rowsAsObjects();
  assert.equal(rows.length, SEED.length);
  assert.ok(rows.every(r => /^R[0-9a-f]{8}$/.test(r['Row ID'])));
  assert.equal(rows[5]['Meets pay bar'], 'Yes');          // Neuralink $25-45/hr, top >= 30
  assert.equal(rows[0]['Meets pay bar'], 'Unknown');
  assert.equal(rows[0]['Furthest stage reached'], 'Applied');
  // formula columns must not have been overwritten by data writes
  assert.equal(apps.get(2, 14), '');
  const fv = env._batch[0].requests.map(r => r.addFilterView && r.addFilterView.filter.title).filter(Boolean);
  assert.deepEqual([...fv], ['Urgent', 'Active pipeline', 'Closed']);
  assert.deepEqual(env._triggers.map(t => t.fn).sort(), ['dailyDigest', 'markGhosted', 'processNewEmails']);
  assert.ok(env._props.WEBAPP_TOKEN.length >= 32);
  // re-running setup must not duplicate rows
  ctx.setup();
  assert.equal(ss.getSheetByName('Applications').rowsAsObjects().length, SEED.length);
  // Settings read-back
  const st = ctx.getSettings_();
  assert.equal(st.bars.intern, 30); assert.equal(st.bars.ft, 100000);
  assert.ok(st.prestige.includes('Bessemer'));
  assert.equal(st.watchlist[0].slug, 'neuralink');
});

test('backfill updates rows from email, never goes backwards, flags ambiguity', () => {
  const { env, ctx, ss } = boot();
  ctx.setup();
  ctx.startBackfill();
  assert.ok(env._props.BACKFILL_DONE, 'backfill finished');
  assert.ok(env._queries.every(q => q.includes('-to:jhfang@sas.upenn.edu')), 'ignores other inbox');
  assert.ok(env._queries[0].startsWith('after:2026/08/01'));
  const rows = ss.getSheetByName('Applications').rowsAsObjects();
  const by = (co, role) => rows.find(r => r.Company === co && (!role || r.Role.includes(role)));

  const bvp = by('Bessemer Venture Partners');
  assert.equal(bvp.Status, 'Rejected');
  assert.equal(bvp['Furthest stage reached'], 'Interview R1');
  assert.equal(bvp['Date applied'].getTime(), D(9, 5).getTime());
  assert.equal(bvp['Last email subject'], 'Thank you for applying to Bessemer Venture Partners - Analyst Program'); // m9 is latest

  const merck = by('Merck');
  assert.equal(merck.Status, 'Interview R1');

  const ir = by('StepStone Group', 'Investor Relations');
  assert.equal(ir.Status, 'Ghosted');   // applied Sep 1, nothing since → 30-day rule
  assert.equal(ir['Furthest stage reached'], 'Applied');
  assert.equal(ir['Date applied'].getTime(), D(9, 1).getTime());
  const pe = by('StepStone Group', 'Private Equity');
  assert.equal(pe.Status, 'To apply', 'ambiguous email must not change status');
  // the ambiguous m6 flagged one of the StepStone rows for review
  assert.ok(rows.filter(r => r.Company === 'StepStone Group').some(r => r['Needs review'] === true));

  const cb = by('Coinbase');
  assert.ok(cb, 'unknown company confirmation creates a row');
  assert.equal(cb.Status, 'Applied'); assert.equal(cb.Source, 'Gmail');
  assert.match(cb.Role, /Associate Product Manager Intern/);

  // 30-day ghosting ran at the end of backfill
  assert.equal(by('1752vc').Status, 'Ghosted');

  const log = ss.getSheetByName('Email Log').rowsAsObjects();
  assert.ok(!log.some(l => /Job Alerts/.test(l.Sender)), 'job alerts not logged');
  assert.equal(new Set(log.map(l => l['Message ID'])).size, log.length);
  const m6 = log.find(l => l['Message ID'] === 'm6');
  assert.match(m6.Action, /Needs review/); assert.ok(m6.Confidence < 0.75);

  // incremental scan afterwards processes nothing new
  const before = log.length;
  const stats = ctx.processNewEmails();
  assert.equal(stats.processed, 0);
  assert.equal(ss.getSheetByName('Email Log').rowsAsObjects().length, before);

  // History recorded the changes for the digest
  const hist = ss.getSheetByName('History').rowsAsObjects();
  assert.ok(hist.some(h => h.Company === 'Bessemer Venture Partners' && h.To === 'Rejected'));
});

test('a later email overrides Ghosted', () => {
  const env = makeEnv({ messages: [
    { id: 'g1', date: new Date(Date.now() - 3600e3), from: '1752vc <team@1752.vc>', subject: '1752vc Venture Fellows - interview invitation', body: 'We would like to invite you to interview. Please book a time.' }
  ] });
  const ctx = load(FILES, env);
  ctx.SEED_ROWS = [{ Company: '1752vc', Role: 'Venture Fellows', Type: 'Internship', Status: 'Ghosted', 'Date applied': '2026-09-10' }];
  ctx.setup();
  env._props.LAST_SCAN = String(Date.now() - 86400e3);
  ctx.processNewEmails();
  const r = env._ss.getSheetByName('Applications').rowsAsObjects()[0];
  assert.equal(r.Status, 'Interview R1');
});

test('digest lists deadlines, urgent to-apply and changes; sends only to me', () => {
  const { env, ctx } = boot();
  ctx.setup();
  ctx.startBackfill();
  const d = ctx.buildDigest_(new Date(2026, 9, 27, 7));
  assert.equal(d.counts.deadlines, 1);   // Neuralink Oct 30
  assert.equal(d.counts.urgent, 1);
  assert.ok(d.html.includes('Neuralink'));
  ctx.dailyDigest();
  assert.equal(env._mails.length, 1);
  assert.equal(env._mails[0].to, 'jennifertranpk@gmail.com');
});

test('onEdit: status ratchet, furthest never backwards, Discovered checkbox moves row', () => {
  const { env, ctx, ss } = boot();
  ctx.setup();
  const apps = ss.getSheetByName('Applications');
  const c = ctx.colMap_(apps);
  // Merck (row 3) → Interview R2 then Rejected
  const edit = (sheet, r, col, v, old) => {
    sheet.set(r, col, v);
    ctx.onEdit({ range: sheet.getRange(r, col), oldValue: old, value: v });
  };
  edit(apps, 3, c['Status'], 'Interview R2', 'Applied');
  edit(apps, 3, c['Status'], 'Rejected', 'Interview R2');
  let merck = apps.rowsAsObjects()[1];
  assert.equal(merck.Status, 'Rejected');
  assert.equal(merck['Furthest stage reached'], 'Interview R2');
  edit(apps, 3, c['Furthest stage reached'], 'Applied', 'Interview R2');
  merck = apps.rowsAsObjects()[1];
  assert.equal(merck['Furthest stage reached'], 'Interview R2');

  // pay recompute on edit
  edit(apps, 2, c['Pay (as listed)'], '$20/hr', '');
  assert.equal(apps.rowsAsObjects()[0]['Meets pay bar'], 'Exception'); // Bessemer is prestige

  // Discovered → Applications
  const res = ctx.addDiscovered_([
    { company: 'Moderna', role: 'Regulatory Affairs Intern', type: 'Internship', pay: '$28/hr', link: 'https://x.com/1', why: 'Pfizer GRS experience', deadline: '2026-11-15' },
    { company: 'Neuralink', role: 'Intern', link: '' },   // duplicate of an Applications row
    { company: 'Moderna', role: 'Regulatory Affairs Intern', link: 'https://x.com/1' }  // duplicate within batch
  ]);
  assert.equal(res.added.length, 1);
  assert.equal(res.skipped.length, 2);
  assert.equal(res.added[0].payBar, 'Exception');
  const disc = ss.getSheetByName('Discovered');
  const dc = ctx.colMap_(disc);
  edit(disc, 2, dc['Move to Applications'], true, false);
  assert.equal(disc.rowsAsObjects().length, 0);
  const moved = apps.rowsAsObjects().find(r => r.Company === 'Moderna');
  assert.equal(moved.Status, 'To apply');
  assert.equal(moved.Source, 'Discovered');
  assert.match(moved.Notes, /Pfizer GRS/);
  assert.ok(moved.Deadline instanceof Date);
});

test('web app rejects bad tokens and returns existing roles', () => {
  const { env, ctx } = boot();
  ctx.setup();
  const bad = JSON.parse(ctx.doGet({ parameter: { token: 'nope' } }).body);
  assert.equal(bad.ok, false);
  const good = JSON.parse(ctx.doGet({ parameter: { token: env._props.WEBAPP_TOKEN } }).body);
  assert.equal(good.ok, true);
  assert.equal(good.existing.length, SEED.length);
  const post = JSON.parse(ctx.doPost({ parameter: { token: env._props.WEBAPP_TOKEN },
    postData: { contents: JSON.stringify({ rows: [{ company: 'Acme Bio', role: 'BD Intern' }] }) } }).body);
  assert.equal(post.added.length, 1);
  const noTok = JSON.parse(ctx.doPost({ parameter: {}, postData: { contents: '{"rows":[]}' } }).body);
  assert.equal(noTok.ok, false);

  const wl = JSON.parse(ctx.doPost({ parameter: { token: env._props.WEBAPP_TOKEN },
    postData: { contents: JSON.stringify({ action: 'watchlist', updates: [
      { company: 'Neuralink', board: 'greenhouse', slug: 'neuralink' },
      { company: 'Anthropic', board: 'greenhouse', slug: 'anthropic' }] }) } }).body);
  assert.equal(wl.updated.length, 2);
  const w = ctx.getSettings_().watchlist;
  assert.equal(w.length, 2);
  assert.equal(w[1].company, 'Anthropic'); assert.equal(w[1].slug, 'anthropic');
});
