// Minimal in-memory stand-ins for the Google services the scripts use.
// Formatting calls (colors, validation, widths…) are accepted and ignored.
const crypto = require('crypto');

function chain() {
  const p = new Proxy(function () {}, {
    get: (t, k) => (k === Symbol.toPrimitive || k === 'then') ? undefined : (...a) => p,
    apply: () => p
  });
  return p;
}

class MockRange {
  constructor(sheet, r, c, nr, nc) { Object.assign(this, { sheet, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) row.push(this.sheet.get(this.r + i, this.c + j));
      out.push(row);
    }
    return out;
  }
  getValue() { return this.sheet.get(this.r, this.c); }
  setValues(v) {
    if (v.length !== this.nr || v[0].length !== this.nc)
      throw new Error(`setValues size ${v.length}x${v[0].length} != range ${this.nr}x${this.nc}`);
    v.forEach((row, i) => row.forEach((x, j) => this.sheet.set(this.r + i, this.c + j, x)));
    return this;
  }
  setValue(x) { this.sheet.set(this.r, this.c, x); return this; }
  setFormula(f) {
    this.sheet.formulas[`${this.r},${this.c}`] = f;
    const m = f.match(/^=\{"([^"]+)";/);
    this.sheet.set(this.r, this.c, m ? m[1] : '#FORMULA');
    return this;
  }
  getRow() { return this.r; }
  getColumn() { return this.c; }
  getNumRows() { return this.nr; }
  getNumColumns() { return this.nc; }
  getSheet() { return this.sheet; }
  insertCheckboxes() {
    for (let i = 0; i < this.nr; i++)
      if (this.sheet.get(this.r + i, this.c) === '') this.sheet.checkbox[`${this.c}`] = true;
    return this;
  }
}
// any other Range method is a chainable no-op
const rangeProxyHandler = {
  get(t, k, recv) {
    if (!(k in t)) return () => recv;
    if (typeof t[k] !== 'function') return t[k];
    return (...a) => { const r = t[k](...a); return r === t ? recv : r; };
  }
};

class MockSheet {
  constructor(name, id) {
    this.name = name; this.id = id; this.data = []; this.formulas = {}; this.checkbox = {};
    this.hidden = false; this.charts = [];
  }
  get(r, c) { const row = this.data[r - 1]; const v = row ? row[c - 1] : undefined; return v === undefined ? '' : v; }
  set(r, c, v) {
    while (this.data.length < r) this.data.push([]);
    this.data[r - 1][c - 1] = v;
  }
  getName() { return this.name; }
  getSheetId() { return this.id; }
  getLastRow() {
    for (let i = this.data.length - 1; i >= 0; i--)
      if ((this.data[i] || []).some(v => v !== '' && v !== undefined && v !== null)) return i + 1;
    return 0;
  }
  getLastColumn() { return Math.max(0, ...this.data.map(r => { let n = 0; (r || []).forEach((v, i) => { if (v !== '' && v !== undefined) n = i + 1; }); return n; })); }
  getMaxRows() { return 1000; }
  getRange(a, b, c, d) {
    if (typeof a === 'string') return new Proxy(new MockRange(this, 1, 1, 1, 1), rangeProxyHandler);
    return new Proxy(new MockRange(this, a, b, c || 1, d || 1), rangeProxyHandler);
  }
  appendRow(vals) { const r = this.getLastRow() + 1; vals.forEach((v, j) => this.set(r, j + 1, v)); }
  deleteRow(r) { this.data.splice(r - 1, 1); }
  clear() { this.data = []; this.formulas = {}; }
  getCharts() { return this.charts; }
  removeChart() {}
  insertChart(c) { this.charts.push(c); }
  newChart() { return chain(); }
  hideSheet() { this.hidden = true; }
  // values in one column as an array (test helper)
  col(header) {
    const h = this.data[0].indexOf(header);
    return this.data.slice(1).map(r => (r || [])[h]).filter(v => v !== undefined);
  }
  rowsAsObjects() {
    const hs = this.data[0];
    return this.data.slice(1).filter(r => r && r[0]).map(r => Object.fromEntries(hs.map((h, i) => [h, r[i] === undefined ? '' : r[i]])));
  }
}
const sheetProxyHandler = {
  get(t, k) { return k in t ? (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) : (() => undefined); }
};

function makeEnv(opts = {}) {
  const sheets = [];
  let nextId = 100;
  const toasts = [], mails = [], triggers = [], batchUpdates = [];
  const props = {};
  const ss = {
    getSheetByName: n => sheets.find(s => s.name === n) || null,
    insertSheet: n => { const s = new Proxy(new MockSheet(n, nextId++), sheetProxyHandler); sheets.push(s); return s; },
    getSheets: () => sheets,
    getId: () => 'SPREADSHEET_ID',
    getUrl: () => 'https://docs.google.com/spreadsheets/d/SPREADSHEET_ID',
    toast: (m) => toasts.push(m),
    setSpreadsheetTimeZone() {}, setActiveSheet() {}, moveActiveSheet() {}
  };
  const messages = opts.messages || [];
  const env = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss, getActive: () => ss,
      newDataValidation: chain, newConditionalFormatRule: chain, getUi: chain, flush() {}
    },
    Charts: { ChartType: { COLUMN: 'COLUMN', BAR: 'BAR' } },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null),
      setProperty: (k, v) => { props[k] = String(v); },
      deleteProperty: k => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: t => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); },
      newTrigger: fn => {
        const t = { fn, getHandlerFunction: () => fn, spec: [] };
        const b = new Proxy({}, { get: (_, k) => k === 'create' ? () => { triggers.push(t); return t; } : (...a) => { t.spec.push([k, ...a]); return b; } });
        return b;
      }
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, f) => {
        const p = n => String(n).padStart(2, '0');
        const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return f.replace('yyyy', d.getFullYear()).replace('MMM', M[d.getMonth()]).replace('MM', p(d.getMonth() + 1))
          .replace('dd', p(d.getDate())).replace(/\bd\b/, d.getDate());
      },
      base64DecodeWebSafe: s => Buffer.from(s, 'base64url'),
      newBlob: b => ({ getDataAsString: () => Buffer.from(b).toString('utf8') })
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'jennifertranpk@gmail.com' }) },
    MailApp: { sendEmail: m => mails.push(m) },
    Logger: { log: () => {} },
    HtmlService: { createHtmlOutput: chain },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => ({ body: s }) }) },
    Gmail: { Users: { Messages: {
      list: (u, o) => {
        const after = o.q.match(/after:(\d{4})\/(\d{2})\/(\d{2})/);
        const before = o.q.match(/before:(\d{4})\/(\d{2})\/(\d{2})/);
        const a = after && new Date(+after[1], +after[2] - 1, +after[3]);
        const b = before && new Date(+before[1], +before[2] - 1, +before[3]);
        env._queries.push(o.q);
        const hits = messages.filter(m => (!a || m.date >= a) && (!b || m.date < b))
          .sort((x, y) => y.date - x.date);   // Gmail returns newest first
        return { messages: hits.map(m => ({ id: m.id })) };
      },
      get: (u, id) => {
        const m = messages.find(x => x.id === id);
        return { id: m.id, threadId: m.id, internalDate: String(m.date.getTime()),
          payload: { mimeType: 'multipart/alternative', headers: [
            { name: 'From', value: m.from }, { name: 'Subject', value: m.subject }, { name: 'To', value: 'jennifertranpk@gmail.com' }],
            parts: [{ mimeType: 'text/plain', body: { data: Buffer.from(m.body || '').toString('base64url') } }] } };
      }
    } } },
    Sheets: { Spreadsheets: {
      get: () => ({ sheets: [] }),
      batchUpdate: (req) => { batchUpdates.push(req); return {}; }
    } },
    _queries: [], _ss: ss, _mails: mails, _triggers: triggers, _toasts: toasts, _props: props,
    _batch: batchUpdates
  };
  return env;
}

module.exports = { makeEnv };
