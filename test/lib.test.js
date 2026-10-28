const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

const L = load(['Config.gs', 'Lib.gs']);
const bars = { intern: 30, ft: 100000 };

test('pay parsing: hourly, ranges, k, salary, stipend, monthly', () => {
  let p = L.parsePay('$35/hr', { type: 'Internship' });
  assert.equal(p.max, 35); assert.equal(p.label, '$35/hr');
  p = L.parsePay('$28 - $45 per hour', { type: 'Internship' });
  assert.equal(p.min, 28); assert.equal(p.max, 45);
  p = L.parsePay('$85k–$100k', { type: 'Full-time' });
  assert.equal(p.min, 85000); assert.equal(p.max, 100000); assert.equal(p.label, '$85k–100k/yr');
  p = L.parsePay('$120,000 - $150,000 annually', { type: 'Full-time' });
  assert.equal(p.max, 150000);
  p = L.parsePay('Stipend $8,000 for 10 weeks', { type: 'Internship' });
  assert.equal(p.max, 20); // 8000 / 10 / 40
  p = L.parsePay('$6,000/month', { type: 'Internship' });
  assert.ok(Math.abs(p.max - 34.62) < 0.01);
  p = L.parsePay('$45/hr', { type: 'Full-time' });
  assert.equal(p.max, 93600);
  assert.equal(L.parsePay('', {}), null);
  assert.equal(L.parsePay('Unknown', {}), null);
  assert.equal(L.parsePay('Competitive', {}), null);
  p = L.parsePay('£30,000 per year', { type: 'Full-time' });
  assert.equal(p.currency, 'GBP');
});

test('pay bar: Yes / No / Exception / Unknown', () => {
  const P = L.CFG.PRESTIGE;
  const pay = (s, t) => L.parsePay(s, { type: t });
  assert.equal(L.meetsPayBar('Internship', pay('$35/hr', 'Internship'), 'Acme', P, bars), 'Yes');
  assert.equal(L.meetsPayBar('Internship', pay('$22/hr', 'Internship'), 'Acme', P, bars), 'No');
  assert.equal(L.meetsPayBar('Internship', pay('$22/hr', 'Internship'), 'Pfizer Inc.', P, bars), 'Exception');
  assert.equal(L.meetsPayBar('Internship', null, 'Acme', P, bars), 'Unknown');
  assert.equal(L.meetsPayBar('Full-time', pay('$90k-110k', 'Full-time'), 'Acme', P, bars), 'Yes');
  assert.equal(L.meetsPayBar('Full-time', pay('$80,000', 'Full-time'), 'Bain & Company', P, bars), 'Exception');
});

test('prestige uses whole words (ARCH != ARCHIMED)', () => {
  const P = L.CFG.PRESTIGE;
  assert.equal(L.isPrestige('ARCHIMED', P), false);
  assert.equal(L.isPrestige('ARCH Venture Partners', P), true);
  assert.equal(L.isPrestige('Citizens Bank', P), false);
  assert.equal(L.isPrestige('Johnson & Johnson', P), true);
  assert.equal(L.isPrestige('ZS Associates', P), true);
  assert.equal(L.isPrestige('Genentech, Inc.', P), true);
});

test('furthest stage never goes backwards', () => {
  assert.equal(L.ratchetFurthest('Interview R1', 'Rejected'), 'Interview R1');
  assert.equal(L.ratchetFurthest('Applied', 'Interview R1'), 'Interview R1');
  assert.equal(L.ratchetFurthest('Interview R2', 'Applied'), 'Interview R2');
  assert.equal(L.ratchetFurthest('', 'Applied'), 'Applied');
  assert.equal(L.ratchetFurthest('', 'Ghosted'), '');
});

test('urgency buckets', () => {
  const today = new Date(2026, 9, 27);
  assert.equal(L.urgencyOf('', today), 'Rolling');
  assert.equal(L.urgencyOf('Rolling', today), 'Rolling');
  assert.equal(L.urgencyOf(new Date(2026, 9, 20), today), 'Overdue');
  assert.equal(L.urgencyOf(new Date(2026, 10, 2), today), 'This week');
  assert.equal(L.urgencyOf(new Date(2026, 10, 8), today), '2 weeks');
  assert.equal(L.urgencyOf('2026-12-31', today), 'Later');
});

test('ghosting after 30 days at Applied only', () => {
  const today = new Date(2026, 9, 27);
  assert.equal(L.shouldGhost('Applied', new Date(2026, 8, 20), '', today, 30), true);
  assert.equal(L.shouldGhost('Applied', new Date(2026, 8, 20), new Date(2026, 9, 10), today, 30), false);
  assert.equal(L.shouldGhost('Interview R1', new Date(2026, 7, 1), '', today, 30), false);
});

const C = (subject, body, from) => L.classifyEmail(subject, body || '', from || 'no-reply@us.greenhouse-mail.io');

test('classifier: confirmations', () => {
  assert.equal(C('Thank you for applying to Bessemer Venture Partners - Analyst Program').label, 'Confirmation');
  assert.equal(C('Perpay | Thank you for applying, Jean!').label, 'Confirmation');
  assert.equal(C('Application received', 'We have received your application for Summer Analyst. If your qualifications match, we will reach out to schedule an interview.').label, 'Confirmation');
  assert.equal(C('Your application to StepStone Group', 'Thank you for your application. Our team will review it.', 'no-reply@stepstonegroup.com').label, 'Confirmation');
});

test('classifier: rejections beat confirmation phrases', () => {
  const r = C('Update from Bessemer', 'Thank you for applying. Unfortunately, we have decided to move forward with other candidates for the second round.');
  assert.equal(r.label, 'Rejection');
  assert.ok(r.confidence >= 0.9);
  assert.equal(C('Your application to Merck', 'After careful consideration we will not be moving forward with your application.').label, 'Rejection');
  const weak = C('Interview time change', 'Unfortunately the interviewer is out sick, so we need a new time.');
  assert.notEqual(weak.label, 'Rejection'); // subject says interview
});

test('classifier: interviews and assessments', () => {
  assert.equal(C('Invitation to interview - Bessemer', 'We would like to invite you to a first round interview. Please select a time.').label, 'Interview');
  assert.equal(C('Next steps: HireVue assessment', 'Please complete your HireVue video interview within 5 days.').label, 'Assessment');
  assert.equal(C('Merck Future Talent Program', 'Please complete the online assessment by Friday.', 'merck@myworkday.com').label, 'Assessment');
  assert.equal(C('Schedule your Superday', 'Congratulations, you have been invited to the final round.').label, 'Interview');
  assert.equal(C('Following up', 'We would like to schedule a call to discuss next steps.', 'sarah.lee@stepstonegroup.com').label, 'Interview');
});

test('classifier: offers and junk', () => {
  assert.equal(C('Offer letter', 'We are pleased to offer you the position of Summer Analyst.').label, 'Offer');
  assert.equal(C('Jobs you may be interested in', 'Pfizer is hiring', 'jobalerts-noreply@linkedin.com').label, 'Other');
  assert.equal(C('Your weekly newsletter', 'stuff', 'news@substack.com').label, 'Other');
});

test('company candidates from subject / sender', () => {
  let c = L.companyCandidates('Thank you for applying to Bessemer Venture Partners - Analyst Program', '', 'Bessemer Venture Partners <no-reply@us.greenhouse-mail.io>');
  assert.equal(c[0], 'Bessemer Venture Partners');
  c = L.companyCandidates('Perpay | Thank you for applying, Jean!', '', 'no-reply@us.greenhouse-mail.io');
  assert.equal(c[0], 'Perpay');
  c = L.companyCandidates('Update from Bessemer', '', 'no-reply@us.greenhouse-mail.io');
  assert.equal(c[0], 'Bessemer');
  c = L.companyCandidates('Thank you for applying to StepStone Group', '', 'no-reply@stepstonegroup.com');
  assert.ok(c.includes('StepStone Group')); assert.ok(c.includes('stepstonegroup'));
  c = L.companyCandidates('Your application', '', 'pfizer@myworkday.com');
  assert.ok(c.includes('pfizer'));
  c = L.companyCandidates('Quick question', '', 'Sarah Lee <sarah.lee@merck.com>');
  assert.equal(JSON.stringify(c), '["merck"]');
});

test('matching rows by company + role', () => {
  const rows = [
    { company: 'Bessemer Venture Partners', role: '2027 Summer Analyst', status: 'Applied' },
    { company: 'Merck', role: 'Future Talent Program – GPAM Intern', status: 'Interview R1' },
    { company: 'IBM', role: 'IBM Ventures Portfolio Development Intern', status: 'To apply' },
    { company: 'StepStone Group', role: 'VC & Growth Equity Investor Relations Summer Analyst', status: 'Applied' },
    { company: 'StepStone Group', role: 'Private Equity Summer Analyst', status: 'Applied' }
  ];
  let m = L.matchEmailToRow(['Bessemer'], 'update from bessemer', rows);
  assert.equal(m.index, 0); assert.ok(m.confidence >= 0.75);
  m = L.matchEmailToRow(['merck'], 'gpam', rows);
  assert.equal(m.index, 1); assert.ok(m.confidence >= 0.75);
  m = L.matchEmailToRow(['stepstonegroup'], 'investor relations summer analyst', rows);
  assert.equal(m.index, 3); assert.ok(m.confidence >= 0.75);
  m = L.matchEmailToRow(['StepStone Group'], 'thank you for applying', rows);
  assert.ok(m.confidence < 0.75, 'ambiguous between two StepStone rows');
  m = L.matchEmailToRow(['Coinbase'], '', rows);
  assert.equal(m.index, -1);
});

test('status transitions', () => {
  assert.equal(L.nextStatus('To apply', 'Confirmation').status, 'Applied');
  assert.equal(L.nextStatus('Interview R1', 'Confirmation').status, 'Interview R1');
  assert.equal(L.nextStatus('Applied', 'Interview', '').status, 'Interview R1');
  assert.equal(L.nextStatus('Interview R1', 'Interview', 'Interview R2').status, 'Interview R2');
  const again = L.nextStatus('Interview R1', 'Interview', '');
  assert.equal(again.status, 'Interview R1'); assert.equal(again.review, true);
  assert.equal(L.nextStatus('Interview R1', 'Rejection').status, 'Rejected');
  assert.equal(L.nextStatus('Ghosted', 'Interview', '').status, 'Interview R1'); // later email overrides
  assert.equal(L.nextStatus('Applied', 'Assessment').status, 'Assessment');
  assert.equal(L.nextStatus('Interview R2', 'Assessment').status, 'Interview R2');
  assert.equal(L.nextStatus('Rejected', 'Confirmation').status, 'Rejected');
  assert.equal(L.nextStatus('Withdrawn', 'Assessment').status, 'Withdrawn');
  assert.equal(L.nextStatus('Rejected', 'Interview', '').review, true);
  assert.equal(L.detectRound('invite you to our superday'), 'Final round');
  assert.equal(L.detectRound('second round interview'), 'Interview R2');
});

test('dedupe by link or company+role', () => {
  const ex = [{ company: 'Neuralink', role: 'Intern', link: 'https://job-boards.greenhouse.io/neuralink/jobs/7483748003?gh_jid=1' }];
  assert.equal(L.isDuplicate({ company: 'Neuralink Corp', role: 'Internship', link: '' }, ex), true);
  assert.equal(L.isDuplicate({ company: 'X', role: 'Y', link: 'https://job-boards.greenhouse.io/neuralink/jobs/7483748003' }, ex), true);
  assert.equal(L.isDuplicate({ company: 'Neuralink', role: 'Software Engineer', link: '' }, ex), false);
  // shared program page, different roles / locations -> not duplicates
  const gs = [{ company: 'Goldman Sachs', role: 'Summer Analyst – Private Investing', location: 'New York, NY', link: 'https://goldmansachs.com/careers/program' }];
  assert.equal(L.isDuplicate({ company: 'Goldman Sachs', role: 'Summer Analyst – Private Investing', location: 'San Francisco, CA', link: 'https://goldmansachs.com/careers/program' }, gs), false);
  const gh = [{ company: 'Guidehouse', role: 'Consulting Analyst - Life Sciences Advisory - Campus 2027' }];
  assert.equal(L.isDuplicate({ company: 'Guidehouse', role: 'Intern - Life Sciences Advisory - Campus 2027' }, gh), false);
});

test('location tiers', () => {
  assert.equal(L.locationTier('South San Francisco, CA'), 1);
  assert.equal(L.locationTier('New York, NY'), 1);
  assert.equal(L.locationTier('London, UK'), 2);
  assert.equal(L.locationTier('Pearl River, NY'), 3);
  assert.equal(L.locationTier('Baltimore, MD'), 3);
});
