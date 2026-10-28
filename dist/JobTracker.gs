/**
 * Job Tracker — ALL code in one file, for copy-paste into the Apps Script editor.
 * Generated from src/*.gs by 'npm run bundle'. Don't edit here; edit src/ and re-bundle.
 */

// ===================================================================== Config.gs
/**
 * Config.gs — constants and default settings.
 * Everything here is pure data so it can be loaded by the Node tests too.
 * Editable values live on the Settings tab; these are only the defaults
 * that setup() writes there the first time.
 */

var CFG = {
  TZ: 'America/New_York',
  BACKFILL_START: '2026/08/01',

  SHEET: {
    APPS: 'Applications',
    DISC: 'Discovered',
    LOG: 'Email Log',
    SETTINGS: 'Settings',
    DASH: 'Dashboard',
    HISTORY: 'History'
  },

  // Applications columns, in order. Header text must match exactly.
  APP_COLS: [
    'Company', 'Role', 'Type', 'Category', 'Location', 'Remote?',
    'Pay (as listed)', 'Pay normalized', 'Meets pay bar', 'Fit score', 'Link',
    'Source', 'Deadline', 'Days left', 'Urgency', 'Status',
    'Furthest stage reached', 'Date applied', 'Last update', 'Last email subject',
    'Recruiter / contact', 'Next action', 'Next action date', 'Resume version',
    'Notes', 'Needs review', 'Row ID'
  ],
  // Columns that hold an ARRAYFORMULA in the header row; never write values there.
  APP_FORMULA_COLS: ['Days left', 'Urgency'],

  DISC_COLS: [
    'Company', 'Role', 'Type', 'Category', 'Location', 'Remote?',
    'Pay (as listed)', 'Pay normalized', 'Meets pay bar', 'Fit score', 'Link',
    'Source', 'Deadline', 'Why it fits', 'Resume version', 'Notes', 'Date found',
    'Move to Applications'
  ],

  LOG_COLS: [
    'Date', 'Sender', 'Subject', 'Matched company', 'Classification',
    'Confidence', 'Action', 'Row ID', 'Message ID'
  ],

  HISTORY_COLS: ['Timestamp', 'Row ID', 'Company', 'Role', 'From', 'To', 'Source'],

  STATUSES: [
    'To apply', 'In progress', 'Applied', 'Assessment', 'Interview R1',
    'Interview R2', 'Final round', 'Offer', 'Rejected', 'Ghosted', 'Withdrawn'
  ],
  // Pipeline order for "Furthest stage reached". Closed statuses are not stages.
  STAGES: [
    'To apply', 'In progress', 'Applied', 'Assessment', 'Interview R1',
    'Interview R2', 'Final round', 'Offer'
  ],
  CLOSED: ['Rejected', 'Ghosted', 'Withdrawn'],

  TYPES: ['Internship', 'Full-time'],
  CATEGORIES: [
    'Venture capital / private markets', 'Investor relations',
    'Hedge fund / equity research', 'Investment banking',
    'Biotech/pharma – regulatory', 'Biotech/pharma – BD / alliance / PM',
    'Biotech/pharma – strategy / commercial', 'Biotech/pharma – R&D / lab',
    'Healthcare / life sciences consulting', 'Management consulting',
    'Clinical research / data', 'Product / tech', 'AI / research',
    'Marketing / content / media', 'Other'
  ],
  SOURCES: ['Gmail', 'My link', 'Discovered'],
  RESUMES: ['General', 'Product (Anthropic)', 'Consulting (BlueMatter)',
            'Finance (Jefferies)', 'Harlem'],

  DEFAULT_SETTINGS: {
    'Internship min ($/hr)': 30,
    'Full-time min ($/yr)': 100000,
    'Ghost after (days)': 30,
    'Digest hour (ET, 0-23)': 7,
    'Digest to': '',               // blank = the Google account running the script
    'Only emails to (optional)': '',  // e.g. jennifertranpk@gmail.com if you forward from other inboxes
    'Ignore emails to': 'jhfang@sas.upenn.edu',
    'Hours per week (stipend math)': 40
  },

  PRESTIGE: [
    'Pfizer', 'Merck', 'J&J', 'Johnson & Johnson', 'Genentech', 'Roche',
    'Novartis', 'AstraZeneca', 'Eli Lilly', 'Lilly', 'BMS',
    'Bristol Myers Squibb', 'Amgen', 'Regeneron', 'Moderna', 'Gilead',
    'Bessemer', 'a16z', 'Andreessen Horowitz', 'ARCH', 'ARCH Venture Partners',
    'Flagship', 'Flagship Pioneering', 'General Catalyst', 'McKinsey', 'BCG',
    'Bain', 'ZS', 'L.E.K.', 'Putnam',
    // Added by Claude — delete any you don't want:
    'Goldman Sachs', 'Morgan Stanley', 'J.P. Morgan', 'Jefferies', 'Google',
    'Anthropic', 'Capital Group', 'Citi', 'Biogen'
  ],

  LOCATIONS_TIER1: ['New York', 'NYC', 'Manhattan', 'Brooklyn', 'Jersey City',
    'Hoboken', 'San Francisco', 'South San Francisco', 'SF', 'Bay Area',
    'San Jose', 'Palo Alto', 'Menlo Park', 'Mountain View', 'Sunnyvale',
    'Redwood City', 'San Mateo', 'Oakland', 'Emeryville', 'Foster City',
    'Santa Clara', 'Fremont', 'Stanford'],
  LOCATIONS_TIER2: ['Boston', 'Cambridge', 'Remote', 'London', 'Sydney',
    'Melbourne', 'Australia', 'Philadelphia'],

  // Sender domains of applicant-tracking systems.
  ATS_DOMAINS: ['myworkday.com', 'myworkdayjobs.com', 'workday.com',
    'greenhouse.io', 'greenhouse-mail.io', 'lever.co', 'hire.lever.co',
    'ashbyhq.com', 'icims.com', 'smartrecruiters.com', 'smartrecruiters.net',
    'taleo.net', 'oraclecloud.com', 'successfactors.com', 'successfactors.eu',
    'jobvite.com', 'bamboohr.com', 'hirevue.com', 'codesignal.com',
    'hackerrank.com', 'pymetrics.ai', 'modernhire.com', 'gem.com',
    'avature.net', 'eightfold.ai', 'phenom.com', 'workablemail.com',
    'recruitee.com', 'jazzhr.com', 'paradox.ai', 'goodtime.io', 'rippling.com',
    'dover.com', 'wellfound.com', 'brassring.com', 'kenexa.com'],

  // Phrase lists. Lowercase. Edited on the Settings tab.
  KEYWORDS: {
    Offer: ['pleased to offer', 'offer of employment', 'extend an offer',
      'extend you an offer', 'offer letter', 'congratulations on your offer',
      'we are excited to offer', 'formal offer'],
    Rejection: ['move forward with other candidates',
      'decided to move forward with other', 'decided to pursue other candidates',
      'not be moving forward', 'not moving forward', 'will not be moving forward',
      'unable to offer you', 'not been selected', 'were not selected',
      'have not been selected', 'decided not to proceed', 'other candidates whose',
      'position has been filled', 'no longer under consideration',
      'regret to inform', 'unfortunately', 'not to advance', 'will not be advancing',
      'not able to move forward', 'pursue other applicants',
      'decided to go in a different direction'],
    Interview: ['schedule an interview', 'schedule a call', 'invite you to interview',
      'invitation to interview', 'interview invitation', 'like to interview',
      'like to invite you', 'first round', 'second round', 'final round',
      'superday', 'phone screen', 'availability for', 'book a time',
      'select a time', 'interview with', 'next round', 'move you forward',
      'moving you forward', 'advance to the next', 'next steps in the process',
      'calendly.com', 'goodtime.io', 'interview confirmation', 'virtual interview'],
    Assessment: ['hirevue', 'online assessment', 'assessment invitation',
      'complete the assessment', 'complete an assessment', 'coding challenge',
      'codesignal', 'hackerrank', 'pymetrics', 'video interview', 'one-way interview',
      'case study assignment', 'take-home', 'aptitude test', 'game-based assessment',
      'skills assessment', 'modern hire'],
    Confirmation: ['thank you for applying', 'thanks for applying',
      'application received', 'received your application',
      'we have received your application', 'application has been submitted',
      'successfully submitted', 'thank you for your application',
      'thank you for your interest', 'application confirmation',
      'your application to', 'your application for', 'we received your application',
      'application was sent']
  },

  // Round words in interview emails.
  ROUND_HINTS: {
    'Final round': ['final round', 'superday', 'final interview', 'onsite', 'on-site'],
    'Interview R2': ['second round', '2nd round', 'round 2', 'round two', 'next round'],
    'Interview R1': ['first round', '1st round', 'round 1', 'phone screen',
      'initial interview', 'screening call']
  }
};

// ===================================================================== Lib.gs
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

/**
 * True if (company, role, link) already exists in any of the given row lists.
 * Same link only counts when the roles also look alike (many postings share one program page),
 * and a different location means a different posting.
 */
function isDuplicate(job, existing) {
  var k = dedupeKey(job.company, job.role), u = normalizeUrl(job.link);
  var loc = String(job.location || '').toLowerCase().slice(0, 12);
  // a link with a job ID (5+ digits) is one specific posting
  if (u && /\d{5,}/.test(u) && existing.some(function (e) { return normalizeUrl(e.link) === u; })) return true;
  return existing.some(function (e) {
    var eloc = String(e.location || '').toLowerCase().slice(0, 12);
    if (loc && eloc && loc !== eloc) return false;
    if (dedupeKey(e.company, e.role) === k) return true;
    if (companySim(e.company, job.company) < 0.85) return false;
    var r1 = roleSim(e.role, job.role), r2 = roleSim(job.role, e.role);
    if (u && normalizeUrl(e.link) === u && r1 >= 0.5 && r2 >= 0.5) return true;
    return r1 >= 0.9 && r2 >= 0.9;
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

// ===================================================================== Sheets.gs
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

// ===================================================================== Setup.gs
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

// ===================================================================== Gmail.gs
/**
 * Gmail.gs — READ-ONLY scan of job emails. This code only ever reads mail.
 *
 * Two ways it can run:
 *  - clasp/manifest setup: the Gmail advanced service under the gmail.readonly scope,
 *    so Google itself blocks sending/deleting.
 *  - copy-paste setup (no manifest): GmailApp. Google's consent screen then asks for full
 *    mail access, but nothing here calls send, trash, delete, archive or label.
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
  var msgs = typeof Gmail !== 'undefined'
    ? listViaAdvanced_(q, ctx, started)
    : listViaGmailApp_(q, after, before, ctx, started);
  if (!msgs) return false;
  msgs.sort(function (a, b) { return a.date - b.date; });   // oldest first so statuses move forward
  msgs.forEach(function (m) { processMessage_(m, ctx); });
  return true;
}

function listViaAdvanced_(q, ctx, started) {
  var ids = [], token;
  do {
    var res = Gmail.Users.Messages.list('me', { q: q, maxResults: 100, pageToken: token });
    (res.messages || []).forEach(function (m) { ids.push(m.id); });
    token = res.nextPageToken;
  } while (token);
  var msgs = [];
  for (var i = 0; i < ids.length; i++) {
    if (ctx.seen[ids[i]]) { ctx.stats.skipped++; continue; }
    if (Date.now() - started > SCAN_BUDGET_MS) return null;
    msgs.push(fetchMessage_(ids[i]));
  }
  return msgs;
}

/** GmailApp returns whole threads, so filter each message to the window and recipients. */
function listViaGmailApp_(q, after, before, ctx, started) {
  var from = parseGmailDate_(after), to = before ? parseGmailDate_(before) : null;
  var me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  var ignore = String(ctx.st.scalars['Ignore emails to'] || '').toLowerCase().split(/[,\s]+/).filter(String);
  var only = String(ctx.st.scalars['Only emails to (optional)'] || '').toLowerCase().trim();
  var msgs = [], start = 0, page;
  do {
    page = GmailApp.search(q, start, 100);
    for (var t = 0; t < page.length; t++) {
      if (Date.now() - started > SCAN_BUDGET_MS) return null;
      var ms = page[t].getMessages();
      for (var k = 0; k < ms.length; k++) {
        var m = ms[k], id = m.getId(), d = m.getDate();
        if (ctx.seen[id]) { ctx.stats.skipped++; continue; }
        if (d < from || (to && d >= to)) continue;
        var fromAddr = m.getFrom();
        if (me && emailAddress(fromAddr) === me) continue;          // my own replies
        var rcpt = (m.getTo() + ',' + m.getCc()).toLowerCase();
        if (ignore.some(function (x) { return rcpt.indexOf(x) !== -1; })) continue;
        if (only && rcpt.indexOf(only) === -1) continue;
        msgs.push({ id: id, threadId: page[t].getId(), date: d, from: fromAddr,
          to: m.getTo(), subject: m.getSubject() || '', body: m.getPlainBody() || '' });
      }
    }
    start += page.length;
  } while (page.length === 100);
  return msgs;
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

// ===================================================================== Jobs.gs
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

// ===================================================================== WebApp.gs
/**
 * WebApp.gs — tiny JSON API used by the /find-jobs Claude Code command.
 * Every request must carry the secret token (Job Tracker → Show token).
 *
 *   GET  ?token=…                 → existing roles (both tabs) + settings, for dedupe and pay rules
 *   POST ?token=…  {rows:[…]}     → append new roles to Discovered (duplicates skipped)
 *   POST ?token=…  {action:"watchlist", updates:[{company, board, slug}]}
 *                                 → save job-board slugs /find-jobs discovered
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
  try {
    if (body.action === 'watchlist') return json_(updateWatchlist_(body.updates || []));
    return json_(addDiscovered_(body.rows || []));
  } finally { lock.releaseLock(); }
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

/** Fill in Board type / slug for watchlist companies (adds the company if missing). */
function updateWatchlist_(updates) {
  var sh = sheet_(CFG.SHEET.SETTINGS), c = colMap_(sh);
  var col = c['Watchlist company'];
  var n = Math.max(sh.getLastRow(), 1);
  var names = n > 1 ? sh.getRange(2, col, n - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var done = [];
  updates.forEach(function (u) {
    if (!u || !u.company) return;
    var i = -1;
    names.forEach(function (x, k) { if (i < 0 && companySim(x, u.company) >= 0.85) i = k; });
    var row;
    if (i >= 0) row = i + 2;
    else {
      var empty = names.indexOf('');   // first blank slot in the column
      row = (empty >= 0 ? empty : names.length) + 2;
      names[row - 2] = u.company;
      sh.getRange(row, col).setValue(u.company);
    }
    sh.getRange(row, col + 1, 1, 2).setValues([[u.board || '', u.slug || '']]);
    done.push(u.company);
  });
  return { ok: true, updated: done };
}

// ===================================================================== Seed.gs
/**
 * Seed.gs — rows setup() adds the first time (only if Applications is empty).
 *
 * Two groups:
 *  1. Your pipeline, from what you told me. The Gmail backfill verifies and corrects these.
 *  2. The links you pasted on 2026-10-27, researched and ranked by urgency, then fit.
 *     This session's network couldn't open the job pages, so these facts come from web-search
 *     snippets of each posting. Every row says "verify". Open the link once before applying.
 */

var V = ' [Researched from search snippets on Oct 27 — open the link to verify.]';

var SEED_ROWS = [
  // ---------------------------------------------------------------- 1. pipeline
  { 'Company': 'Bessemer Venture Partners', 'Role': '2027 Summer Analyst', 'Type': 'Internship',
    'Category': 'Venture capital / private markets', 'Source': 'My link',
    'Status': 'Rejected', 'Furthest stage reached': 'Interview R1', 'Resume version': 'General',
    'Notes': 'From your note: applied, did first round, did not advance to R2. Backfill fills in exact dates.' },
  { 'Company': 'Merck', 'Role': '2027 Future Talent Program – GPAM Intern', 'Type': 'Internship',
    'Category': 'Biotech/pharma – BD / alliance / PM', 'Source': 'My link',
    'Status': 'Interview R1', 'Furthest stage reached': 'Interview R1', 'Last update': '2026-10-15',
    'Next action': 'Send thank-you / follow up on Oct 15 interview', 'Next action date': '2026-10-29',
    'Resume version': 'General', 'Notes': 'From your note: interviewed Oct 15, 2026.' },
  { 'Company': 'Pfizer', 'Role': 'Pfizer Futures', 'Category': 'Biotech/pharma – regulatory',
    'Source': 'My link', 'Status': 'Applied', 'Resume version': 'General',
    'Notes': 'From your note: applied recently. Fill in Type and the exact role. Backfill sets Date applied.' },
  { 'Company': 'StepStone Group', 'Role': '2027 VC & Growth Equity Investor Relations Summer Analyst',
    'Type': 'Internship', 'Category': 'Investor relations', 'Location': 'Baltimore, MD',
    'Source': 'My link', 'Status': 'In progress', 'Resume version': 'Finance (Jefferies)',
    'Notes': 'From your note: applied or in progress — backfill flips to Applied if it finds the confirmation. Baltimore is outside your target cities.' },
  { 'Company': '1752vc', 'Role': 'Venture Fellows', 'Category': 'Venture capital / private markets',
    'Source': 'My link', 'Status': 'In progress', 'Resume version': 'General',
    'Notes': 'From your note: applied or in progress.' },
  { 'Company': 'Bosch USA', 'Role': 'Venture Capital Intern', 'Type': 'Internship',
    'Category': 'Venture capital / private markets', 'Location': 'Sunnyvale, CA', 'Source': 'My link',
    'Status': 'To apply', 'Resume version': 'General',
    'Notes': 'From your note: applied or considering. If you applied, backfill will move it to Applied.' },
  { 'Company': 'ARCHIMED', 'Role': 'Venture Capital Intern', 'Type': 'Internship',
    'Category': 'Venture capital / private markets', 'Source': 'My link', 'Status': 'To apply',
    'Resume version': 'General', 'Notes': 'From your note: applied or considering. Add location + link.' },
  { 'Company': 'IBM', 'Role': 'IBM Ventures Portfolio Development Intern', 'Type': 'Internship',
    'Category': 'Venture capital / private markets', 'Location': 'New York, NY', 'Source': 'My link',
    'Status': 'To apply', 'Resume version': 'General', 'Notes': 'From your note: applied or considering.' },

  // ---------------------------------------------------------------- 2. your links, ranked
  // Overdue
  { 'Company': 'Trinity Life Sciences', 'Role': 'Commercial Strategy Summer Associate (NY)',
    'Type': 'Internship', 'Category': 'Healthcare / life sciences consulting', 'Location': 'New York, NY',
    'Remote?': 'Unknown', 'Pay (as listed)': 'Not listed', 'Fit score': 3,
    'Link': 'https://trinitylifesciences.wd108.myworkdayjobs.com/en-US/Trinity/job/New-York-NY/Commercial-Strategy-Summer-Associate--NY-_JR100752',
    'Source': 'My link', 'Deadline': '2026-10-06', 'Status': 'To apply', 'Resume version': 'Consulting (BlueMatter)',
    'Next action': 'Check if still open; else watch Trinity Associate Consultant (full-time)', 'Next action date': '2026-10-28',
    'Notes': 'Deadline = Harvard career-site listing expiry, so it may be closed. "Summer Associate" often means MBA level, and summer internships may expect you to return to school (you graduate May 2027). Meets reqs: Partly. Great firm + NYC.' + V },
  // Dated
  { 'Company': 'Google', 'Role': 'Student Researcher, BS/MS, Winter–Summer 2027', 'Type': 'Internship',
    'Category': 'AI / research', 'Location': 'Mountain View, CA (+ other US)', 'Remote?': 'Unknown',
    'Pay (as listed)': '$98,000–$131,000/yr', 'Fit score': 3,
    'Link': 'https://www.google.com/about/careers/applications/jobs/results/131518356678156998-student-researcher/',
    'Source': 'My link', 'Deadline': '2027-07-16', 'Status': 'To apply', 'Resume version': 'Product (Anthropic)',
    'Next action': 'Apply early (BS/MS spots very limited)',
    'Notes': 'Needs enrollment for the whole engagement; PhD students preferred; publications preferred. Meets reqs: Partly — you are enrolled in a technical BS/MS with AI-agent + comp-bio work, but it must fit before your May 2027 graduation. Pay ≈ $47/hr.' + V },
  // Rolling — best fit first
  { 'Company': 'Neuralink', 'Role': 'Neuroengineer Intern (Next Gen team)', 'Type': 'Internship',
    'Category': 'Biotech/pharma – R&D / lab', 'Location': 'South San Francisco / Fremont, CA', 'Remote?': 'On-site',
    'Pay (as listed)': '$35/hr + equity', 'Fit score': 3,
    'Link': 'https://job-boards.greenhouse.io/neuralink/jobs/7483748003', 'Source': 'My link',
    'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'General',
    'Next action': 'Confirm term (summer?) and apply',
    'Notes': 'Wants Python + neuroscience/engineering background, 2+ yrs academic/industry experience; electrophysiology/ML a plus. Meets reqs: Partly — Python, St. Jude comp-bio/wet lab, clinical data, but no neuroscience/ephys.' + V },
  { 'Company': 'Stanford University', 'Role': 'Requisition 200641 (title unknown)', 'Category': 'Other',
    'Location': 'Stanford, CA', 'Remote?': 'Unknown', 'Pay (as listed)': 'Not listed', 'Fit score': 3,
    'Link': 'https://careersearch.stanford.edu/hcmUI/CandidateExperience/en/sites/Stanford/job/200641',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply', 'Needs review': true,
    'Next action': 'Open link and fill in role/pay/deadline',
    'Notes': 'Could not read the posting or find it via search. Nearby Stanford reqs were lab/technician roles.' },
  { 'Company': 'Unknown (LinkedIn 4454865186)', 'Role': 'Check link — from "Biotechnology jobs San Francisco" search',
    'Category': 'Other', 'Location': 'SF Bay Area (from your search)', 'Remote?': 'Unknown', 'Pay (as listed)': 'Not listed',
    'Fit score': 3, 'Link': 'https://www.linkedin.com/jobs/view/4454865186', 'Source': 'My link',
    'Deadline': 'Rolling', 'Status': 'To apply', 'Needs review': true,
    'Next action': 'Open in LinkedIn and fill in the row',
    'Notes': 'LinkedIn is not readable from here (and I don\'t scrape it). Open it yourself.' },
  { 'Company': 'Unknown (LinkedIn 4478589517)', 'Role': 'Check link — from "Biotechnology jobs New York" search',
    'Category': 'Other', 'Location': 'New York area (from your search)', 'Remote?': 'Unknown', 'Pay (as listed)': 'Not listed',
    'Fit score': 3, 'Link': 'https://www.linkedin.com/jobs/view/4478589517', 'Source': 'My link',
    'Deadline': 'Rolling', 'Status': 'To apply', 'Needs review': true,
    'Next action': 'Open in LinkedIn and fill in the row',
    'Notes': 'LinkedIn is not readable from here. Open it yourself.' },
  { 'Company': 'Unknown (Adzuna 5931013422)', 'Role': 'Check link', 'Category': 'Other', 'Remote?': 'Unknown',
    'Pay (as listed)': 'Not listed', 'Fit score': 3, 'Link': 'https://www.adzuna.com/details/5931013422',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply', 'Needs review': true,
    'Next action': 'Open link and fill in the row', 'Notes': 'Aggregator page could not be read or found via search.' },
  { 'Company': 'Biogen', 'Role': 'Summer 2027 Internship Program (opens ~Dec 2026)', 'Type': 'Internship',
    'Category': 'Biotech/pharma – strategy / commercial', 'Location': 'Cambridge, MA', 'Remote?': 'Unknown',
    'Pay (as listed)': 'Not listed', 'Fit score': 2,
    'Link': 'https://www.biogen.com/careers/students-and-graduates.html', 'Source': 'My link',
    'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'General',
    'Next action': 'Check Biogen Workday for postings', 'Next action date': '2026-12-01',
    'Notes': 'Program page, not a posting. Postings are expected Dec 2026–Feb 2027 with rolling review. Internships generally require enrollment — check whether a May 2027 grad qualifies. For full-time, Biogen\'s Early Career Development Program (rotational) may fit better.' + V },
  { 'Company': 'MIGSO-PCUBED', 'Role': 'Biotechnology Project Management Consultant', 'Type': 'Full-time',
    'Category': 'Biotech/pharma – BD / alliance / PM', 'Location': 'San Francisco Bay Area, CA', 'Remote?': 'On-site',
    'Pay (as listed)': '$80,000–$125,000/yr', 'Fit score': 2,
    'Link': 'https://www.migso-pcubed.com/job/biotechnology-project-management-consultant-san-francisco/',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'General',
    'Notes': 'Pitched at experienced PM consultants (biotech + some IT; Jira/MS Project; PMP a plus). Listings date Feb–Apr 2026, so it may be stale. Another listing says $90–110k. A San Rafael commute is possible. Meets reqs: Partly (Orphan Therapeutics PM internship).' + V },
  { 'Company': 'Biogen', 'Role': 'Co-op, Integrated Insights & Analytics (Nephrology), Jan–Jun 2027',
    'Type': 'Internship', 'Category': 'Biotech/pharma – strategy / commercial', 'Location': 'Cambridge, MA',
    'Remote?': 'Unknown', 'Pay (as listed)': 'Not listed', 'Fit score': 1,
    'Link': 'https://www.biogen.com/careers/students-and-graduates.html', 'Source': 'My link',
    'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'Consulting (BlueMatter)',
    'Next action': 'Probably skip — conflicts with your final semester',
    'Notes': 'Full-time 6-month Jan–Jun 2027 co-op clashes with spring semester + May graduation. Sibling co-ops pay $23–29/hr (below your bar). Meets reqs: No (timing).' + V },
  { 'Company': 'Genentech', 'Role': 'Spring Biotech Development Intern – Stability Analysis', 'Type': 'Internship',
    'Category': 'Biotech/pharma – R&D / lab', 'Location': 'South San Francisco, CA', 'Remote?': 'On-site',
    'Pay (as listed)': 'Not listed', 'Fit score': 1,
    'Link': 'https://careers.gene.com/us/en/job/202609-122484/2027-Spring-Intern-Pharmaceutical-Technical-Development-Laboratory-Wet-Lab-or-Dry-Lab',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'General',
    'Next action': 'Probably skip — watch Genentech Summer 2027 interns instead',
    'Notes': 'Original bebee link: https://bebee.com/us/jobs/spring-biotech-development-intern-stability-analysis-genentech-south-san-francisco--lifeworq-bdf3fd7c-df27-4909-80d4-1b96e5f920bb — the Link column points to the closest official sibling posting. It is a 6-month on-site program starting Jan 2027, which conflicts with your spring semester. Sibling spring postings are already closing. Meets reqs: No (timing).' + V },
  { 'Company': 'Intuitive Surgical', 'Role': 'AI Research Intern (Vision-Language-Action models)', 'Type': 'Internship',
    'Category': 'AI / research', 'Location': 'Sunnyvale, CA', 'Remote?': 'On-site',
    'Pay (as listed)': '$60–$88/hr', 'Fit score': 1,
    'Link': 'https://careers.intuitive.com/en/jobs/744000151714759/JOB219611/ai-research-intern/',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'Product (Anthropic)',
    'Next action': 'Probably skip',
    'Notes': 'Wants Master\'s/PhD students doing robotics/multimodal ML research; starts Jan 2027 (during your last semester). Meets reqs: No. Pay is from job-board copies.' + V },
  { 'Company': 'Capital Group', 'Role': 'Fundamental Research Group Associate (Biotech & Pharma)', 'Type': 'Full-time',
    'Category': 'Hedge fund / equity research', 'Location': 'New York, NY (or San Francisco)', 'Remote?': 'Unknown',
    'Pay (as listed)': '$145K–$232K', 'Fit score': 1,
    'Link': 'https://talents.vaia.com/companies/capital-group/fundamental-research-group-associate-biotech-pharma-38125258/',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'Finance (Jefferies)',
    'Next action': 'Skip this one; look for Capital Group entry-level/analyst programs',
    'Notes': 'Needs 2–5 yrs in equity research/IB/consulting (one version: MD/PhD + 2 yrs). Some aggregator copies say no longer accepting. Meets reqs: No. Beware: scammers impersonate Capital Group.' + V },
  { 'Company': 'Artia Global Partners', 'Role': 'Biotech/Biopharma Equity Analyst', 'Type': 'Full-time',
    'Category': 'Hedge fund / equity research', 'Location': 'Miami, FL or New York, NY (conflicting)', 'Remote?': 'Hybrid',
    'Pay (as listed)': 'Not listed', 'Fit score': 1,
    'Link': 'https://www.linkedin.com/jobs/view/4464417062', 'Source': 'My link',
    'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'Finance (Jefferies)',
    'Next action': 'Long shot: email jobs@artiaglobal.com with resume + a sample investment memo',
    'Notes': '3+ yrs buy/sell-side, IB, VC, PE or consulting; MD/PhD highly preferred; strong modeling. Small fund, so a strong memo could get attention. Meets reqs: No.' + V },
  { 'Company': 'Simon-Kucher', 'Role': 'Manager, Healthcare & Life Sciences (Pharma/Biotech)', 'Type': 'Full-time',
    'Category': 'Healthcare / life sciences consulting', 'Location': 'New York / Boston / SF', 'Remote?': 'Unknown',
    'Pay (as listed)': '$170,000–$180,000/yr', 'Fit score': 1,
    'Link': 'https://www.linkedin.com/jobs/view/4460786880', 'Source': 'My link',
    'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'Consulting (BlueMatter)',
    'Next action': 'Skip; apply to Simon-Kucher entry-level Consultant (HC&LS) instead',
    'Notes': 'Manager level (3+ yrs consulting). Meets reqs: No. Right firm though — /find-jobs will look for their entry-level roles.' + V },
  { 'Company': 'Citi', 'Role': 'Equity Research Analyst, SMID Biotech', 'Type': 'Full-time',
    'Category': 'Hedge fund / equity research', 'Location': 'New York, NY', 'Remote?': 'Hybrid',
    'Pay (as listed)': 'Not listed', 'Fit score': 1,
    'Link': 'https://jobs.citi.com/job/new-york/equity-research-analyst-smid-biotech/287/99130359264', 'Source': 'My link',
    'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'Finance (Jefferies)',
    'Next action': 'Skip; watch Citi Research Analyst program',
    'Notes': 'Your jobzmall link: https://www.jobzmall.com/citi-1/job/equity-research-analyst-biotechnology. This is a lead-analyst role needing 15+ yrs. Meets reqs: No.' + V },
  { 'Company': 'Genentech', 'Role': 'Therapeutic Area Manager (TAM), Immunology – NY Metro', 'Type': 'Full-time',
    'Category': 'Biotech/pharma – strategy / commercial', 'Location': 'Queens / Brooklyn / Long Island, NY', 'Remote?': 'On-site',
    'Pay (as listed)': '$137,500–$255,300/yr', 'Fit score': 1,
    'Link': 'https://careers.gene.com/us/en/job/202608-121308/Therapeutic-Area-Manager-TAM-Immunology-NY-Metro-Ecosystem',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'General',
    'Next action': 'Skip', 'Notes': 'Field sales: 6+ yrs calling on HCPs, heavy driving. Meets reqs: No.' + V },
  { 'Company': 'Amgen', 'Role': 'Specialty Account Manager, IgG4 (NYC) – Rare Disease', 'Type': 'Full-time',
    'Category': 'Biotech/pharma – strategy / commercial', 'Location': 'New York, NY', 'Remote?': 'On-site',
    'Pay (as listed)': '$158,931–$215,025/yr', 'Fit score': 1,
    'Link': 'https://careers.amgen.com/en/job/new-york/specialty-account-manager-igg4-new-york-city-rare-disease/87/100619454304',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'General',
    'Next action': 'Skip', 'Notes': 'Posted Oct 13, 2026 (likely live). Field sales: years of pharma/biotech sales. Meets reqs: No.' + V },
  { 'Company': 'Healthcare Insights (healthcarein.org)', 'Role': 'Biotech Student Journalist / Contributor',
    'Type': 'Internship', 'Category': 'Marketing / content / media', 'Location': 'New York, NY', 'Remote?': 'Remote',
    'Pay (as listed)': '$0 (unpaid volunteer)', 'Fit score': 1,
    'Link': 'https://www.mediabistro.com/jobs/1490105576-healthcare-insights-is-hiring-biotech-student-journalist-contributor-in-new-yor',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply', 'Resume version': 'General',
    'Next action': 'Skip',
    'Notes': 'Your bebee link: https://bebee.com/us/jobs/biotech-student-journalist-contributor-healthcare-insights-new-york-ny--jooble-1248138753992717378 — the posting is from 2025 and likely closed. It is unpaid and you already run a much bigger platform. You do meet the reqs.' + V },
  { 'Company': 'City College of San Francisco', 'Role': 'Bioscience Internship (BTEC 14B course placement)',
    'Type': 'Internship', 'Category': 'Other', 'Location': 'San Francisco, CA', 'Remote?': 'On-site',
    'Pay (as listed)': '$0 (generally unpaid)', 'Fit score': 1,
    'Link': 'https://sites.google.com/view/ccsfbiotech/biotechnology-internships/bioscience-internship',
    'Source': 'My link', 'Deadline': 'Rolling', 'Status': 'To apply',
    'Next action': 'Mark Withdrawn — not eligible',
    'Notes': 'Only for CCSF students who completed CCSF biotech courses; this is a for-credit lab-assistant placement, not a job. Meets reqs: No.' + V }
];

// Companies /find-jobs checks every week. Board blank = /find-jobs works it out and saves it back.
var WATCHLIST = [
  ['Neuralink', 'greenhouse', 'neuralink'],
  ['Anthropic', 'greenhouse', 'anthropic'],
  ['Bessemer Venture Partners', '', ''], ['Andreessen Horowitz (a16z)', '', ''],
  ['General Catalyst', '', ''], ['Flagship Pioneering', '', ''], ['ARCH Venture Partners', '', ''],
  ['StepStone Group', '', ''], ['1752vc', '', ''], ['Bosch Ventures', '', ''], ['IBM Ventures', '', ''],
  ['Pfizer', 'url', 'https://www.pfizer.com/about/careers'],
  ['Merck', 'url', 'https://jobs.merck.com'],
  ['Genentech', 'url', 'https://careers.gene.com'],
  ['Biogen', 'url', 'https://www.biogen.com/careers/students-and-graduates.html'],
  ['Amgen', 'url', 'https://careers.amgen.com'], ['Regeneron', '', ''], ['Moderna', '', ''],
  ['Trinity Life Sciences', 'url', 'https://trinitylifesciences.wd108.myworkdayjobs.com/en-US/Trinity'],
  ['Simon-Kucher', '', ''], ['ZS Associates', '', ''], ['L.E.K. Consulting', '', ''],
  ['Putnam', '', ''], ['ClearView Healthcare Partners', '', ''], ['Blue Matter Consulting', '', ''],
  ['Jefferies', '', ''], ['Capital Group', '', ''], ['Citi', '', ''],
  ['Google', 'url', 'https://www.google.com/about/careers/applications/jobs/results/?employment_type=INTERN'],
  ['Intuitive Surgical', 'url', 'https://careers.intuitive.com'],
  ['Chan Zuckerberg Biohub', '', ''], ['Arc Institute', '', '']
];
