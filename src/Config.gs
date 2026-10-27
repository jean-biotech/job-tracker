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
