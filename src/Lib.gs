/**
 * Lib.gs — pure logic, no Google services. Unit-tested in Node (test/).
 */

var GENERIC_COMPANY_WORDS = ['inc', 'incorporated', 'llc', 'ltd', 'limited', 'corp',
  'corporation', 'co', 'company', 'group', 'holdings', 'lp', 'llp', 'plc', 'the',
  'usa', 'us', 'partners', 'gmbh', 'ag', 'sa', 'nv', 'na'];

function normCompany(s) {
  if (!s) return '';
  var t = String(s).toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(function (w) { return w && GENERIC_COMPANY_WORDS.indexOf(w) === -1; });
  // "j and j" -> "jandj" style collapse only for very short names
  return t.join(' ').trim();
}

/** 0..1 similarity between two company names. */
function companySim(a, b) {
  var x = normCompany(a), y = normCompany(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  var xs = x.replace(/ /g, ''), ys = y.replace(/ /g, '');
  if (xs === ys) return 1;
  var shorter = xs.length <= ys.length ? xs : ys;
  var longer = xs.length <= ys.length ? ys : xs;
  if (shorter.length >= 4 && longer.indexOf(shorter) === 0) return 0.9;
  // whole-word containment ("bessemer" in "bessemer venture")
  var sw = (x.length <= y.length ? x : y), lw = (x.length <= y.length ? y : x);
  if (sw.length >= 3 && (' ' + lw + ' ').indexOf(' ' + sw + ' ') !== -1) return 0.85;
  if (shorter.length >= 5 && longer.indexOf(shorter) !== -1) return 0.75;
  return 0;
}

/** True if company is on the prestige list (whole-word match, so ARCH != ARCHIMED). */
function isPrestige(company, list) {
  var c = ' ' + normCompany(company) + ' ';
  if (c.trim() === '') return false;
  for (var i = 0; i < list.length; i++) {
    var p = normCompany(list[i]);
    if (p && c.indexOf(' ' + p + ' ') !== -1) return true;
    // also compare with spaces removed ("j and j" vs "jandj")
    if (p && c.replace(/ /g, '') === p.replace(/ /g, '')) return true;
  }
  return false;
}

var ROLE_STOP = ['the', 'a', 'an', 'of', 'and', 'for', 'to', 'in', 'at', 'with',
  'your', 'our', 'application', 'applying', 'thank', 'you', 'position', 'role',
  'job', 'opportunity', 'update', 'regarding', 're', 'fw', 'fwd', 'team', 'from',
  'we', 'have', 'received', 'program', 'is', 'on', 'us', 'this', 'that', 'been',
  'next', 'steps', 'interest'];

function roleTokens(s) {
  if (!s) return [];
  var out = [];
  String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).forEach(function (w) {
    if (!w || ROLE_STOP.indexOf(w) !== -1) return;
    if (w === 'internship') w = 'intern';
    if (out.indexOf(w) === -1) out.push(w);
  });
  return out;
}

/** Share of the row's role tokens that appear in the email text. */
function roleSim(rowRole, emailText) {
  var r = roleTokens(rowRole);
  if (!r.length) return 0;
  var e = ' ' + roleTokens(emailText).join(' ') + ' ';
  var hit = 0;
  r.forEach(function (w) { if (e.indexOf(' ' + w + ' ') !== -1) hit++; });
  return hit / r.length;
}

function stageRank(status) {
  return CFG.STAGES.indexOf(status); // -1 for closed/unknown
}

/** Furthest stage never goes backwards. */
function ratchetFurthest(prevFurthest, newStatus) {
  var a = stageRank(prevFurthest), b = stageRank(newStatus);
  if (b > a) return newStatus;
  return prevFurthest || (b >= 0 ? newStatus : '');
}

// ---------------------------------------------------------------- dates

function toDate(v) {
  if (v instanceof Date && !isNaN(v)) return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)) {
    var p = v.match(/(\d{4})-(\d{2})-(\d{2})/);
    return new Date(+p[1], +p[2] - 1, +p[3]);
  }
  if (typeof v === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v.trim())) {
    var q = v.trim().split('/');
    return new Date(+q[2], +q[0] - 1, +q[1]);
  }
  return null;
}

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

/** Same buckets as the sheet's Urgency formula. */
function urgencyOf(deadline, today) {
  var d = toDate(deadline);
  if (!d) return 'Rolling';
  var n = daysBetween(today, d);
  if (n < 0) return 'Overdue';
  if (n <= 7) return 'This week';
  if (n <= 14) return '2 weeks';
  return 'Later';
}

/** Applied with no news for `days` days -> Ghosted. */
function shouldGhost(status, dateApplied, lastUpdate, today, days) {
  if (status !== 'Applied') return false;
  var ref = toDate(lastUpdate) || toDate(dateApplied);
  if (!ref) return false;
  return daysBetween(ref, today) >= days;
}

// ---------------------------------------------------------------- pay

/**
 * Parse a pay string. Returns null when there is no usable number.
 * {min, max, unit:'hr'|'yr', currency, label}
 * Amounts are expressed in the requested unit (hourly for internships,
 * annual for full-time). opts: {type, hoursPerWeek}
 */
function parsePay(text, opts) {
  if (text === null || text === undefined || text === '') return null;
  opts = opts || {};
  var hpw = opts.hoursPerWeek || 40;
  var s = String(text).replace(/–|—/g, '-');
  var lower = s.toLowerCase();
  if (/^\s*(unknown|n\/a|not listed|unpaid\?)\s*$/.test(lower)) return null;

  var currency = /£|gbp/i.test(s) ? 'GBP' : /€|eur\b/i.test(s) ? 'EUR'
    : /a\$|aud/i.test(s) ? 'AUD' : /c\$|cad/i.test(s) ? 'CAD' : 'USD';

  var nums = [];
  var re = /(?:\$|£|€|usd\s?|aud\s?|gbp\s?)?\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s?(k\b|K\b)?/g;
  var m;
  while ((m = re.exec(s)) !== null) {
    var raw = m[0];
    var hasSymbol = /\$|£|€|usd|aud|gbp/i.test(raw);
    var n = parseFloat(m[1].replace(/,/g, ''));
    if (m[2]) n *= 1000;
    // skip things like "10 weeks", "2027", "40 hours" unless it carries a currency symbol
    var after = s.slice(m.index + raw.length, m.index + raw.length + 8).toLowerCase();
    if (!hasSymbol && /^\s*(weeks?|wks?|hours?|hrs?\b|months?|days?|-?\s*week)/.test(after)) continue;
    if (!hasSymbol && n >= 1900 && n <= 2100 && !m[2]) continue;
    if (!hasSymbol && nums.length === 0 && !/\d\s*-\s*$/.test(s.slice(0, m.index + 1))) {
      // bare number with no currency and nothing before it: accept only if a unit word is present
      if (!/(hour|hr|year|annual|salary|stipend|month|base|\/)/.test(lower)) continue;
    }
    nums.push(n);
  }
  if (!nums.length) return null;

  var unit = null;
  if (/(per\s+hour|\/\s?hr|\/\s?hour|hourly|\bhr\b|\/h\b|an hour)/.test(lower)) unit = 'hr';
  else if (/(per\s+month|\/\s?mo|monthly|a month)/.test(lower)) unit = 'mo';
  else if (/(per\s+week|\/\s?wk|\/\s?week|weekly|a week)/.test(lower)) unit = 'wk';
  else if (/(per\s+year|\/\s?yr|\/\s?year|annual|annually|salary|per annum|base|a year)/.test(lower)) unit = 'yr';
  else if (/stipend/.test(lower)) unit = 'total';

  var lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums);
  if (!unit) {
    if (hi < 300) unit = 'hr';
    else if (lo >= 20000) unit = 'yr';
    else return null;
  }

  var toHourly;
  if (unit === 'hr') toHourly = function (x) { return x; };
  else if (unit === 'wk') toHourly = function (x) { return x / hpw; };
  else if (unit === 'mo') toHourly = function (x) { return x * 12 / 52 / hpw; };
  else if (unit === 'yr') toHourly = function (x) { return x / 52 / hpw; };
  else { // total stipend
    var w = lower.match(/(\d+)\s*-?\s*(?:weeks?|wks?)/);
    var mo = lower.match(/(\d+)\s*-?\s*months?/);
    var weeks = w ? +w[1] : mo ? +mo[1] * 4.33 : 10;
    // the week count was captured by the number regex only if it had a symbol; it didn't
    toHourly = function (x) { return x / weeks / hpw; };
  }

  var wantAnnual = opts.type === 'Full-time';
  var conv = wantAnnual
    ? function (x) { return toHourly(x) * hpw * 52; }
    : toHourly;
  var rnd = wantAnnual ? function (x) { return Math.round(x); }
    : function (x) { return Math.round(x * 100) / 100; };
  var a = rnd(conv(lo)), b = rnd(conv(hi));
  return {
    min: a, max: b, unit: wantAnnual ? 'yr' : 'hr', currency: currency,
    label: formatPay(a, b, wantAnnual ? 'yr' : 'hr', currency)
  };
}

function formatPay(a, b, unit, currency) {
  var sym = currency === 'GBP' ? '£' : currency === 'EUR' ? '€'
    : currency === 'AUD' ? 'A$' : currency === 'CAD' ? 'C$' : '$';
  function f(x) {
    if (unit === 'yr') return sym + Math.round(x / 1000) + 'k';
    return sym + (Math.round(x * 100) / 100).toFixed(x % 1 === 0 ? 0 : 2).replace(/\.00$/, '');
  }
  var body = Math.abs(a - b) < 0.01 ? f(a) : f(a) + '–' + f(b).replace(sym, '');
  return body + '/' + unit + (currency !== 'USD' ? ' (' + currency + ')' : '');
}

/**
 * Yes / No / Exception / Unknown.
 * bars: {intern: 30, ft: 100000}. Uses the top of a range.
 * Non-USD pay is compared at face value but flagged in the label by parsePay.
 */
function meetsPayBar(type, pay, company, prestige, bars) {
  if (!pay) return 'Unknown';
  var bar = type === 'Full-time' ? bars.ft : bars.intern;
  if (pay.max >= bar - 1e-9) return 'Yes';
  if (isPrestige(company, prestige)) return 'Exception';
  return 'No';
}

// ---------------------------------------------------------------- email classification

var WEAK = {
  Rejection: ['unfortunately', 'regret to inform'],
  Interview: ['next steps in the process', 'availability for', 'interview with'],
  Confirmation: ['thank you for your interest', 'your application to', 'your application for'],
  Assessment: ['video interview'],
  Offer: []
};

function countHits(text, phrases, weakList) {
  var score = 0, hits = [];
  phrases.forEach(function (p) {
    if (p && text.indexOf(p) !== -1) {
      var w = weakList.indexOf(p) !== -1 ? 1 : 3;
      score += w;
      hits.push(p);
    }
  });
  return { score: score, hits: hits };
}

/**
 * Classify an email. Returns {label, confidence (0..1), hits}.
 * label: Offer | Rejection | Interview | Assessment | Confirmation | Other
 */
function classifyEmail(subject, body, fromAddr, kw, atsDomains) {
  kw = kw || CFG.KEYWORDS;
  atsDomains = atsDomains || CFG.ATS_DOMAINS;
  var subj = String(subject || '').toLowerCase();
  var text = (subj + '\n' + String(body || '').toLowerCase().slice(0, 6000))
    .replace(/\s+/g, ' ');
  var fromAts = isAtsSender(fromAddr, atsDomains);

  var r = {};
  ['Offer', 'Rejection', 'Interview', 'Assessment', 'Confirmation'].forEach(function (k) {
    r[k] = countHits(text, kw[k] || [], WEAK[k] || []);
  });
  var subjHas = function (k) { return countHits(subj, kw[k] || [], []).score > 0; };
  var conditional = /\bif (your|you are|you're|we|there is|there's|selected)\b|should (your|you|we)\b/.test(text);
  var junk = /(job alert|jobs you may|recommended jobs|new jobs for you|webinar|newsletter|unsubscribe from job alerts|is hiring)/.test(subj);

  function out(label, conf) {
    return { label: label, confidence: conf, hits: (r[label] || { hits: [] }).hits };
  }

  if (junk && !subjHas('Rejection') && !subjHas('Interview')) return out('Other', 0.2);
  if (r.Offer.score >= 3 && !(conditional && r.Confirmation.score >= 3)) return out('Offer', 0.85);
  if (r.Rejection.score >= 3) {
    return out('Rejection', r.Rejection.hits.length > 1 || r.Rejection.score >= 4 ? 0.95 : 0.85);
  }
  if (subjHas('Assessment')) return out('Assessment', 0.9);
  if (subjHas('Interview')) return out('Interview', 0.9);
  if (/\binterview/.test(subj) && !subjHas('Confirmation')) return out('Interview', 0.75);
  if (subjHas('Confirmation') && r.Interview.score < 6 && r.Assessment.score < 3) {
    return out('Confirmation', 0.9);
  }
  var inter = r.Interview.score, assess = r.Assessment.score, conf = r.Confirmation.score;
  if ((inter >= 3 || assess >= 3) && !(conditional && conf >= 3)) {
    if (assess >= inter) return out('Assessment', assess >= 6 ? 0.85 : 0.7);
    return out('Interview', inter >= 6 ? 0.85 : 0.7);
  }
  if (conf >= 3) return out('Confirmation', 0.85);
  if (r.Rejection.score > 0) return out('Rejection', 0.5);   // only "unfortunately"
  if (inter > 0) return out('Interview', 0.4);
  if (conf > 0) return out('Confirmation', fromAts ? 0.6 : 0.4);
  if (fromAts) return out('Confirmation', 0.35);
  return out('Other', 0);
}

function emailAddress(from) {
  var m = String(from || '').match(/<([^>]+)>/);
  return (m ? m[1] : String(from || '')).trim().toLowerCase();
}

function displayName(from) {
  var m = String(from || '').match(/^\s*"?([^"<]*?)"?\s*</);
  return m ? m[1].trim() : '';
}

function domainOf(from) {
  var a = emailAddress(from);
  return a.indexOf('@') === -1 ? '' : a.split('@')[1];
}

function isAtsSender(from, atsDomains) {
  var d = domainOf(from);
  if (!d) return false;
  return (atsDomains || CFG.ATS_DOMAINS).some(function (x) {
    return d === x || d.slice(-(x.length + 1)) === '.' + x;
  });
}

function isPersonSender(from) {
  var a = emailAddress(from);
  if (!a) return false;
  if (/(no-?reply|donotreply|do-not-reply|notifications?|careers|recruiting|talent|jobs|hr@|workday|greenhouse|lever|ashby|icims|mailer|support|info@|hello@|team@)/.test(a)) return false;
  return true;
}

var FREE_MAIL = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com',
  'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'zoom.us', 'calendly.com',
  'google.com', 'linkedin.com', 'handshake.com', 'joinhandshake.com', 'mail.com'];

var NAME_NOISE = /\b(hiring team|recruiting team|recruitment team|talent acquisition|talent team|university recruiting|campus recruiting|early careers?|careers?|recruiting|recruitment|recruiter|hiring|talent|team|hr|people|via [a-z]+|notifications?|no-?reply|do not reply|jobs)\b/gi;

/** Candidate company names for an email, best first. */
function companyCandidates(subject, body, from, atsDomains) {
  var out = [];
  function add(x) {
    if (!x) return;
    x = String(x).replace(/\s+/g, ' ').replace(/^[\s"'\-–|:]+|[\s"'\-–|:!.,]+$/g, '').trim();
    if (x.length < 2 || x.length > 60) return;
    if (/^(the|our|your|this|an?|us|you)$/i.test(x)) return;
    if (out.map(function (o) { return o.toLowerCase(); }).indexOf(x.toLowerCase()) === -1) out.push(x);
  }
  var subj = String(subject || '');
  var pats = [
    /(?:applying|applied|application|apply|interest)\s+(?:to|at|with|in)\s+(?:the\s+)?(.+?)(?=\s*(?:[!|:,–]|\s-\s|\s+for\s+|\s+-\s+|\.\s|$))/i,
    /^(?:re:\s*|fwd?:\s*)?(.+?)\s*(?:\||–|\s-\s|:)\s*(?:thank|your|application|update|next|interview|invitation)/i,
    /update from\s+(.+?)(?=\s*[!|:,.]|$)/i,
    /(?:position|role|opportunity|candidacy)\s+(?:at|with)\s+(.+?)(?=\s*(?:[!|:,.–]|\s-\s|$))/i,
    /interview(?: invitation)?\s+(?:with|at)\s+(.+?)(?=\s*(?:[!|:,.–]|\s-\s|\s+for\s+|$))/i,
    /^welcome to\s+(.+?)(?=\s*[!|:,.]|$)/i
  ];
  pats.forEach(function (p) { var m = subj.match(p); if (m) add(m[1]); });

  var dn = displayName(from).replace(NAME_NOISE, ' ').replace(/[@|,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (dn && !isPersonName(displayName(from))) add(dn);

  var d = domainOf(from), local = emailAddress(from).split('@')[0];
  if (d && /myworkday|workday/.test(d) && local && !/no-?reply/.test(local)) add(local);
  if (d && !isAtsSender(from, atsDomains) && FREE_MAIL.indexOf(d) === -1) {
    var parts = d.split('.');
    var core = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    if (/^(co|com|org|ac)$/.test(core) && parts.length >= 3) core = parts[parts.length - 3];
    add(core);
  }
  var b = String(body || '').slice(0, 3000);
  var bm = b.match(/(?:applying|application|interest)\s+(?:to|at|with)\s+(?:the\s+)?([A-Z][A-Za-z0-9&.\- ]{1,40}?)(?=\s*(?:[!,.]|\s+for\s+|\s+and\s+|$))/);
  if (bm) add(bm[1]);
  var bm2 = b.match(/(?:team|recruiting team|talent team)\s+at\s+([A-Z][A-Za-z0-9&.\- ]{1,40}?)(?=[!,.\n]|$)/);
  if (bm2) add(bm2[1]);
  return out;
}

function isPersonName(n) {
  // "Sarah Lee" style: 2-3 capitalized words, none of them company-ish
  if (!n) return false;
  if (/(inc|llc|group|partners|capital|ventures|careers|recruit|talent|team|hiring|pharma|bio|health|therapeutics|labs?|\bco\b)/i.test(n)) return false;
  return /^[A-Z][a-z'\-]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z'\-]+){1,2}$/.test(n.trim());
}

/** Which interview round an email refers to, or '' if not stated. */
function detectRound(text, hints) {
  hints = hints || CFG.ROUND_HINTS;
  var t = String(text || '').toLowerCase();
  var order = ['Final round', 'Interview R2', 'Interview R1'];
  for (var i = 0; i < order.length; i++) {
    var list = hints[order[i]] || [];
    for (var j = 0; j < list.length; j++) if (t.indexOf(list[j]) !== -1) return order[i];
  }
  return '';
}

/**
 * Given a row's current status and a classified email, decide the new status.
 * Returns {status, changed, review, note}.
 */
function nextStatus(current, label, round) {
  current = current || '';
  var cr = stageRank(current);
  var closedOrGhost = current === 'Ghosted' || current === '';
  var closed = current === 'Rejected' || current === 'Withdrawn';
  function res(s, review, note) {
    return { status: s, changed: s !== current, review: !!review, note: note || '' };
  }
  switch (label) {
    case 'Offer': return res('Offer');
    case 'Rejection':
      if (current === 'Withdrawn') return res(current, false, 'Rejection after withdrawal');
      return res('Rejected');
    case 'Interview':
      if (closed) return res(current, true, 'Interview email after ' + current + ' — different role? check');
      if (round) {
        if (stageRank(round) > cr || closedOrGhost) return res(round);
        return res(current, false, 'Interview email for ' + round + ' (already at ' + current + ')');
      }
      if (cr < stageRank('Interview R1') || closedOrGhost) return res('Interview R1');
      return res(current, true, 'Another interview email — which round? Update Status by hand');
    case 'Assessment':
      if (closed) return res(current, true, 'Assessment email after ' + current + ' — different role? check');
      if (cr < stageRank('Assessment') || closedOrGhost) return res('Assessment');
      return res(current);
    case 'Confirmation':
      if (closed) return res(current);   // late/duplicate confirmation never reopens a closed row
      if (cr < stageRank('Applied') || closedOrGhost) return res('Applied');
      return res(current);
    default:
      return res(current);
  }
}

/**
 * Find which row an email belongs to.
 * rows: [{company, role, status}], candidates: company names from the email.
 * Returns {index (-1 none), confidence, reason, company}.
 */
function matchEmailToRow(candidates, emailText, rows) {
  var scored = [];
  rows.forEach(function (row, i) {
    var best = 0;
    candidates.forEach(function (c, ci) {
      var s = companySim(c, row.company) * (ci === 0 ? 1 : 0.97);
      if (s > best) best = s;
    });
    if (best > 0) scored.push({ i: i, c: best, r: roleSim(row.role, emailText), row: row });
  });
  if (!scored.length) {
    return { index: -1, confidence: 0, reason: 'no matching company',
      company: candidates[0] || '' };
  }
  scored.sort(function (a, b) { return (b.c + b.r * 0.5) - (a.c + a.r * 0.5); });
  var top = scored[0];
  var sameCo = scored.filter(function (s) { return s.c >= 0.75; });
  if (sameCo.length <= 1) {
    var conf = top.c >= 0.85 ? 0.9 : 0.6;
    return { index: top.i, confidence: conf, reason: 'company match', company: top.row.company };
  }
  // several roles at the same company: score only the words that tell them apart
  var e = ' ' + roleTokens(emailText).join(' ') + ' ';
  sameCo.forEach(function (s) {
    var others = [];
    sameCo.forEach(function (o) { if (o !== s) others = others.concat(roleTokens(o.row.role)); });
    var distinct = roleTokens(s.row.role).filter(function (w) { return others.indexOf(w) === -1; });
    s.d = distinct.filter(function (w) { return e.indexOf(' ' + w + ' ') !== -1; }).length;
  });
  sameCo.sort(function (a, b) { return b.d - a.d || b.c - a.c; });
  top = sameCo[0];
  var second = sameCo[1];
  if (top.d > 0 && second.d === 0) {
    return { index: top.i, confidence: 0.85, reason: 'company + role match', company: top.row.company };
  }
  var open = sameCo.filter(function (s) { return CFG.CLOSED.indexOf(s.row.status) === -1; });
  if (open.length === 1 && top.r < 0.25 && second.r < 0.25) {
    return { index: open[0].i, confidence: 0.6, reason: 'only open row at company (role unclear)',
      company: open[0].row.company };
  }
  return { index: top.i, confidence: 0.4, reason: sameCo.length + ' rows at this company, role unclear',
    company: top.row.company };
}

/** Pull a role title out of an email if one is stated. */
function roleFromEmail(subject, body) {
  var t = String(subject || '') + '\n' + String(body || '').slice(0, 2000);
  var pats = [
    /(?:for|to)\s+the\s+(.{3,80}?)\s+(?:position|role|opportunity|program)\b/i,
    /(?:position|role|job)\s*(?:of|:)\s*(.{3,80}?)(?=[.\n,(]|\s+at\s|$)/i,
    /application\s+for\s+(?:the\s+)?(.{3,80}?)(?=[.\n,(!]|\s+at\s|\s+with\s|\s+-\s|$)/i,
    /applying\s+for\s+(?:the\s+)?(.{3,80}?)(?=[.\n,(!]|\s+at\s|\s+with\s|\s+-\s|$)/i
  ];
  for (var i = 0; i < pats.length; i++) {
    var m = t.match(pats[i]);
    if (m && !/^(this|that|a|an|our|your)\b/i.test(m[1].trim())) return m[1].trim();
  }
  return '';
}

function guessType(text) {
  var t = String(text || '').toLowerCase();
  if (/(intern|internship|summer analyst|summer associate|co-?op|fellow|student researcher)/.test(t)) return 'Internship';
  if (/(full[- ]time|new grad|analyst program|associate|manager|rotational)/.test(t)) return 'Full-time';
  return '';
}

function dedupeKey(company, role) {
  return normCompany(company) + '|' + roleTokens(role).sort().join(' ');
}

function normalizeUrl(u) {
  if (!u) return '';
  return String(u).trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '')
    .replace(/[?#].*$/, '').replace(/\/+$/, '');
}

/** True if (company, role, link) already exists in any of the given row lists. */
function isDuplicate(job, existing) {
  var k = dedupeKey(job.company, job.role), u = normalizeUrl(job.link);
  return existing.some(function (e) {
    if (u && normalizeUrl(e.link) === u) return true;
    if (dedupeKey(e.company, e.role) === k) return true;
    return companySim(e.company, job.company) >= 0.85 && roleSim(e.role, job.role) >= 0.8 &&
      roleSim(job.role, e.role) >= 0.8;
  });
}

/** Location tier: 1 = NYC/SF Bay, 2 = Boston/remote/abroad/Philly, 3 = other. */
function locationTier(loc, tier1, tier2) {
  var l = String(loc || '').toLowerCase();
  if (!l) return 3;
  function any(list) {
    return list.some(function (x) { return new RegExp('\\b' + x.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(l); });
  }
  if (any(tier1 || CFG.LOCATIONS_TIER1)) return 1;
  if (any(tier2 || CFG.LOCATIONS_TIER2)) return 2;
  return 3;
}

// Node export (ignored by Apps Script)
if (typeof module !== 'undefined') module.exports = {};
