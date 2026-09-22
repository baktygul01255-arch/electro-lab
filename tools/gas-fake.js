/* Эмулятор сервисов Google Apps Script для локального тестирования Code.gs.
   Используется только для разработки/проверки — на GitHub/в Apps Script не нужен. */
const vm = require('vm'), fs = require('fs'), crypto = require('crypto'), path = require('path');

function makeEnv(opts = {}) {
  const store = { sheets: {}, props: {}, files: {}, folders: {} };
  let fileSeq = 0;
  class Range {
    constructor(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
    getValues() {
      const out = [];
      for (let i = 0; i < this.nr; i++) {
        const row = [];
        for (let j = 0; j < this.nc; j++) { const v = (this.sh.rows[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); }
        out.push(row);
      }
      return out;
    }
    setValues(vals) {
      for (let i = 0; i < vals.length; i++) {
        const idx = this.r - 1 + i;
        while (this.sh.rows.length <= idx) this.sh.rows.push([]);
        for (let j = 0; j < vals[i].length; j++) {
          let v = vals[i][j];
          if (typeof v === 'string' && v.length > 50000) throw new Error('Cell limit exceeded: ' + v.length);
          this.sh.rows[idx][this.c - 1 + j] = v === '' || v == null ? '' : String(v);
        }
      }
      return this;
    }
    setNumberFormat() { return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.rows = []; }
    getName() { return this.name; }
    getLastRow() { let n = this.rows.length; while (n > 0 && this.rows[n - 1].every(v => v === '' || v === undefined)) n--; return n; }
    getMaxRows() { return 1000; }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); }
    appendRow(arr) { this.rows.push(arr.map(v => (v === '' || v == null ? '' : String(v)))); }
    deleteRow(r) { this.rows.splice(r - 1, 1); }
    setFrozenRows() {}
  }
  class Spreadsheet {
    constructor(id) { this.id = id; this.sheets = []; }
    getId() { return this.id; }
    getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this.id; }
    getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
    insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
    getSheets() { return this.sheets; }
    deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); }
  }
  const sss = {};
  const SpreadsheetApp = {
    getActiveSpreadsheet() { return opts.bound ? (sss.bound = sss.bound || new Spreadsheet('bound1')) : null; },
    openById(id) { if (!sss[id]) throw new Error('no ss ' + id); return sss[id]; },
    create() { const s = new Spreadsheet('ss' + Object.keys(sss).length); sss[s.id] = s; return s; }
  };
  if (opts.bound) { sss.bound1 = new Spreadsheet('bound1'); sss.bound = sss.bound1; }

  const PropertiesService = { getScriptProperties() { return { getProperty: k => (k in store.props ? store.props[k] : null), setProperty: (k, v) => { store.props[k] = String(v); } }; } };
  let locked = false;
  const LockService = { getScriptLock() { return { waitLock() { if (locked) throw new Error('lock busy'); locked = true; }, releaseLock() { locked = false; } }; } };
  const Utilities = {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    computeDigest(alg, s) { return Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => (b > 127 ? b - 256 : b)); },
    base64Decode: s => Array.from(Buffer.from(s, 'base64')).map(b => (b > 127 ? b - 256 : b)),
    base64Encode: bytes => Buffer.from(bytes.map(b => (b < 0 ? b + 256 : b))).toString('base64'),
    newBlob(bytes, mime, name) { return { bytes, mime, name, getBytes: () => bytes, getContentType: () => mime, getName: () => name }; }
  };
  class File {
    constructor(blob) { this.id = 'file' + (++fileSeq); this.blob = blob; this.trashed = false; this.sharing = null; store.files[this.id] = this; }
    getId() { return this.id; }
    setSharing(a, p) { if (opts.noSharing) throw new Error('sharing blocked'); this.sharing = [a, p]; return this; }
    setTrashed(t) { this.trashed = t; return this; }
    getBlob() { return this.blob; }
    getSize() { return this.blob.bytes.length; }
  }
  class Folder { constructor(id) { this.id = id; } getId() { return this.id; } getUrl() { return 'https://drive.google.com/drive/folders/' + this.id; } createFile(b) { return new File(b); } }
  const DriveApp = {
    Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' }, Permission: { VIEW: 'VIEW' },
    createFolder(n) { const f = new Folder('folder' + (Object.keys(store.folders).length + 1)); store.folders[f.id] = f; return f; },
    getFolderById(id) { if (!store.folders[id]) throw new Error('no folder'); return store.folders[id]; },
    getFileById(id) { if (!store.files[id]) throw new Error('no file'); return store.files[id]; }
  };
  const ContentService = { MimeType: { JSON: 'json' }, createTextOutput(t) { return { t, setMimeType() { return this; }, getContent() { return t; } }; } };
  const logs = [];
  const Logger = { log: m => logs.push(m) };

  const ctx = vm.createContext({ SpreadsheetApp, PropertiesService, LockService, Utilities, DriveApp, ContentService, Logger, console, Date, JSON, Math, Array, Object, String, Number, RegExp, Error });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  function call(req) {
    const out = ctx.doPost({ postData: { contents: JSON.stringify(req) } });
    return JSON.parse(out.getContent());
  }
  return { ctx, call, store, logs, sss };
}
module.exports = { makeEnv };
