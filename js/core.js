/* ============================================================
 * core.js — состояние, язык, тема, иконки, роутер, окна, вход, API, прогресс
 * ============================================================ */
(function (root) {
  'use strict';
  var LAB = root.LAB = root.LAB || {};
  var CFG = root.LAB_CONFIG || {};
  LAB.cfg = CFG;

  /* ---------- хранилище ---------- */
  function mk(store) {
    return {
      get: function (k, d) { try { var v = store.getItem('lab_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
      set: function (k, v) { try { store.setItem('lab_' + k, JSON.stringify(v)); } catch (e) {} },
      del: function (k) { try { store.removeItem('lab_' + k); } catch (e) {} }
    };
  }
  var ls, ss;
  try { ls = mk(root.localStorage); ss = mk(root.sessionStorage); } catch (e) { ls = ss = { get: function (k, d) { return d; }, set: function () {}, del: function () {} }; }
  LAB.store = ls; LAB.session = ss;

  var S = LAB.state = {
    lang: ls.get('lang', (navigator.language || '').toLowerCase().indexOf('kk') === 0 ? 'kz' : 'ru'),
    theme: ls.get('theme', 'dark'),
    token: ls.get('token', null), user: ls.get('user', null),
    progress: ls.get('progress', {}), settings: null
  };

  /* ---------- перевод ---------- */
  LAB.L = function (x) {
    if (Array.isArray(x)) return x[S.lang === 'kz' ? 1 : 0] != null ? x[S.lang === 'kz' ? 1 : 0] : x[0];
    return x == null ? '' : x;
  };
  LAB.t = function (key, vars) {
    var e = LAB.S && LAB.S[key];
    var s = e ? LAB.L(e) : key;
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  };
  LAB.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  LAB.$ = function (sel, el) { return (el || document).querySelector(sel); };
  LAB.$$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  LAB.fmt = function (x) { return root.Render.fmt(x); };
  LAB.date = function (ts, withTime) {
    if (!ts) return '—';
    var d = new Date(Number(ts));
    var loc = S.lang === 'kz' ? 'kk-KZ' : 'ru-RU';
    try { return withTime ? d.toLocaleString(loc, { dateStyle: 'short', timeStyle: 'short' }) : d.toLocaleDateString(loc); } catch (e) { return d.toISOString().slice(0, 10); }
  };
  LAB.pct = function (a, b) { return b ? Math.round(a * 100 / b) : 0; };
  LAB.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  LAB.uid = function () { return Math.random().toString(36).slice(2, 9); };
  LAB.debounce = function (fn, ms) { var t; var f = function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; f.flush = function () { clearTimeout(t); }; return f; };

  /* ---------- иконки ---------- */
  var IC = {
    bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    chip: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 12.9L17 22l-5-3-5 3 1.5-9.1"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    rotate: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    pointer: '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>',
    wire: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    eraser: '<path d="M7 21h13"/><path d="M5.5 15.5L15 6l4 4-9.5 9.5H6.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    spark: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    gauge: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="M12 14l4-5"/><circle cx="12" cy="14" r="1.2"/>',
    omega: '<path d="M3 19h5.5a7.5 7.5 0 1 1 7 0H21"/>',
    series: '<circle cx="3.5" cy="12" r="1.5"/><path d="M5 12h3"/><rect x="8" y="9" width="8" height="6" rx="1"/><path d="M16 12h3"/><circle cx="20.5" cy="12" r="1.5"/>',
    parallel: '<path d="M3 12h4M17 12h4"/><path d="M7 12V6h10v6M7 12v6h10v-6"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.5 0-3-2-5-3.5-7-.5 2-1.5 3-3 3 0-3-1-6-4-8 0 4-4 6-4 11.5C4.5 19.3 8 22 12 22z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    magnet: '<path d="M6 3v9a6 6 0 0 0 12 0V3"/><path d="M6 8h4M14 8h4"/>',
    stack: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    star: '<polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/>',
    globeLang: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
  };
  LAB.icon = function (name, cls) {
    return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[name] || IC.spark) + '</svg>';
  };

  /* ---------- тема и язык ---------- */
  LAB.applyTheme = function () {
    document.documentElement.setAttribute('data-theme', S.theme);
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', S.theme === 'dark' ? '#0a1120' : '#f2f6fc');
  };
  LAB.applyLang = function () {
    document.documentElement.setAttribute('lang', S.lang === 'kz' ? 'kk' : 'ru');
    root.Render.setDecimal(',');
    root.Render.setWords(
      { V: LAB.t('u.V'), A: LAB.t('u.A'), W: LAB.t('u.W'), Om: LAB.t('u.Om') },
      { broken: LAB.t('sim.w.broken'), blownFuse: LAB.t('sim.w.fuse'), on: LAB.t('sim.w.on'), off: LAB.t('sim.w.off') }
    );
    document.title = LAB.t('app.name');
  };
  LAB.setLang = function (l) {
    S.lang = l; ls.set('lang', l);
    LAB.applyLang(); LAB.renderHeader(); LAB.route(true);
  };
  LAB.toggleTheme = function () {
    S.theme = S.theme === 'dark' ? 'light' : 'dark'; ls.set('theme', S.theme);
    LAB.applyTheme();
    LAB.renderHeader();
    if (LAB.themeHook) LAB.themeHook(); else LAB.route(true);
  };

  /* ---------- уведомления и окна ---------- */
  LAB.toast = function (msg, kind) {
    var box = LAB.$('#toast'), el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 320); }, 3200);
  };
  LAB.modal = {
    open: function (html, o) {
      o = o || {};
      var r = LAB.$('#modal-root');
      r.innerHTML = '<div class="modal-bg" data-close="1"></div><div class="modal' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
        '<button class="iconbtn x" data-close="1" aria-label="' + LAB.esc(LAB.t('common.close')) + '">' + LAB.icon('x') + '</button>' + html + '</div>';
      r.classList.add('open');
      r.onclick = function (e) { if (e.target.getAttribute && e.target.getAttribute('data-close')) LAB.modal.close(); };
      var first = r.querySelector('input,select,textarea');
      if (first && !o.noFocus) setTimeout(function () { try { first.focus(); } catch (e) {} }, 30);
      return r.querySelector('.modal');
    },
    close: function () {
      var r = LAB.$('#modal-root');
      r.classList.remove('open'); r.innerHTML = '';
      if (LAB.modal.onClose) { var f = LAB.modal.onClose; LAB.modal.onClose = null; f(); }
    }
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && LAB.$('#modal-root').classList.contains('open')) LAB.modal.close(); });

  LAB.confirm = function (msg, okLabel) {
    return new Promise(function (resolve) {
      var m = LAB.modal.open('<h3>' + LAB.esc(msg) + '</h3><div class="row" style="justify-content:flex-end;margin-top:18px">' +
        '<button class="btn" data-a="no">' + LAB.esc(LAB.t('common.cancel')) + '</button>' +
        '<button class="btn danger" data-a="yes">' + LAB.esc(okLabel || LAB.t('common.yes')) + '</button></div>', { noFocus: true });
      var done = false;
      LAB.modal.onClose = function () { if (!done) resolve(false); };
      m.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]');
        if (!b) return;
        done = true; resolve(b.getAttribute('data-a') === 'yes'); LAB.modal.close();
      });
    });
  };
  LAB.prompt = function (title, label, value, type) {
    return new Promise(function (resolve) {
      var m = LAB.modal.open('<h3>' + LAB.esc(title) + '</h3><label class="field"><span>' + LAB.esc(label) + '</span><input type="' + (type || 'text') + '" value="' + LAB.esc(value || '') + '"></label>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn" data-a="no">' + LAB.esc(LAB.t('common.cancel')) + '</button><button class="btn primary" data-a="yes">OK</button></div>');
      var done = false, inp = m.querySelector('input');
      LAB.modal.onClose = function () { if (!done) resolve(null); };
      function ok() { done = true; var v = inp.value; LAB.modal.close(); resolve(v); }
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
      m.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]');
        if (!b) return;
        if (b.getAttribute('data-a') === 'yes') ok(); else LAB.modal.close();
      });
    });
  };

  /* ---------- API (Google Apps Script) ---------- */
  LAB.apiReady = function () { return !!(CFG.API_URL && /^https:\/\/script\.google\.com\//.test(CFG.API_URL)); };
  function apiErr(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  LAB.api = function (action, payload) {
    if (!LAB.apiReady()) return Promise.reject(apiErr('NOAPI'));
    var usedToken = S.token;
    var body = JSON.stringify(Object.assign({ action: action, token: usedToken || undefined }, payload || {}));
    return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, redirect: 'follow' })
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        var d;
        try { d = JSON.parse(txt); } catch (e) { throw apiErr('SERVER', 'Bad response'); }
        if (!d.ok) {
          if (d.error === 'AUTH' && usedToken && S.token === usedToken) { LAB.logoutLocal(); }   // запоздавший ответ со старым токеном не должен выкидывать нового пользователя
          throw apiErr(d.error || 'SERVER', d.message);
        }
        return d;
      }, function () { throw apiErr('NET'); });
  };
  LAB.errMsg = function (e) {
    var code = e && e.code ? e.code : 'SERVER';
    var k = 'err.' + code;
    return LAB.S[k] ? LAB.t(k) : (LAB.t('err.SERVER') + (e && e.message ? ' (' + e.message + ')' : ''));
  };
  LAB.fail = function (e) { LAB.toast(LAB.errMsg(e), 'bad'); };

  /* ---------- пользователь ---------- */
  LAB.isStaff = function () { return !!(S.user && (S.user.role === 'teacher' || S.user.role === 'jury')); };
  LAB.isTeacher = function () { return !!(S.user && S.user.role === 'teacher'); };
  LAB.isStudent = function () { return !!(S.user && S.user.role === 'student'); };

  LAB.setSession = function (token, user) {
    S.token = token; S.user = user; ls.set('token', token); ls.set('user', user);
  };
  LAB.logoutLocal = function () {
    S.token = null; S.user = null; ls.del('token'); ls.del('user'); S.settings = null;
    LAB.renderHeader();
    if (/^#\/(my|project|staff)/.test(location.hash)) location.hash = '#/home'; else LAB.route(true);
  };
  LAB.logout = function () {
    var p = S.token ? LAB.api('logout').catch(function () {}) : Promise.resolve();
    return p.then(function () { LAB.logoutLocal(); LAB.toast(LAB.t('auth.loggedout')); });
  };

  /* ---------- прогресс ---------- */
  function mergeProgress(a, b) {
    a = a || {}; b = b || {};
    var out = { lessons: {}, quiz: {}, trainer: {}, tasks: {} }, k;
    var ids = {}; Object.keys(a.lessons || {}).concat(Object.keys(b.lessons || {})).forEach(function (i) { ids[i] = 1; });
    Object.keys(ids).forEach(function (i) {
      var x = (a.lessons || {})[i] || {}, y = (b.lessons || {})[i] || {};
      out.lessons[i] = { done: !!(x.done || y.done), best: Math.max(x.best || 0, y.best || 0) };
    });
    out.quiz = { best: Math.max((a.quiz || {}).best || 0, (b.quiz || {}).best || 0), runs: Math.max((a.quiz || {}).runs || 0, (b.quiz || {}).runs || 0) };
    var ta = a.trainer || {}, tb = b.trainer || {};
    out.trainer = (ta.answered || 0) >= (tb.answered || 0) ? ta : tb;
    for (k in (a.tasks || {})) out.tasks[k] = a.tasks[k];
    for (k in (b.tasks || {})) if (!out.tasks[k] || (b.tasks[k].at || 0) > (out.tasks[k].at || 0)) out.tasks[k] = b.tasks[k];
    return out;
  }
  var saveRemote = LAB.debounce(function () {
    if (!S.token || !LAB.apiReady()) return;
    LAB.api('progressSave', { progress: S.progress }).catch(function () {});
  }, 1500);
  LAB.progress = {
    get: function () { return S.progress; },
    update: function (fn) {
      var p = S.progress || {};
      p.lessons = p.lessons || {}; p.quiz = p.quiz || {}; p.trainer = p.trainer || {}; p.tasks = p.tasks || {};
      fn(p);
      S.progress = p; ls.set('progress', p);
      saveRemote();
    },
    sync: function () {
      if (!S.token || !LAB.apiReady()) return Promise.resolve();
      return LAB.api('progressGet').then(function (d) {
        var remote = {}; try { remote = JSON.parse(d.progress || '{}'); } catch (e) {}
        S.progress = mergeProgress(S.progress, remote); ls.set('progress', S.progress);
        return LAB.api('progressSave', { progress: S.progress });
      }).catch(function () {});
    },
    summary: function (p) {
      p = p || S.progress || {};
      var done = 0; Object.keys(p.lessons || {}).forEach(function (i) { if (p.lessons[i].done) done++; });
      var tr = p.trainer || {}, tasks = 0; Object.keys(p.tasks || {}).forEach(function (i) { if (p.tasks[i].ok) tasks++; });
      return { lessons: done, answered: tr.answered || 0, correct: tr.correct || 0, acc: LAB.pct(tr.correct || 0, tr.answered || 0), tasks: tasks, quizBest: (p.quiz || {}).best || 0 };
    }
  };

  /* ---------- вход / регистрация ---------- */
  LAB.auth = {
    open: function (tab) {
      tab = tab || 'login';
      var classes = ['8А', '8Ә', '8Б', '8В', '8Г', '8Д'].map(function (c) { return '<option value="' + c + '">'; }).join('');
      var html = '<div class="tabs" style="margin-bottom:14px"><button data-tab="login" class="' + (tab === 'login' ? 'on' : '') + '">' + LAB.esc(LAB.t('auth.login')) + '</button><button data-tab="reg" class="' + (tab === 'reg' ? 'on' : '') + '">' + LAB.esc(LAB.t('auth.register')) + '</button></div>' +
        '<form id="authform" autocomplete="on">' +
        (tab === 'reg' ? '<label class="field"><span>' + LAB.esc(LAB.t('auth.role')) + '</span><select name="role"><option value="student">' + LAB.esc(LAB.t('role.student')) + '</option><option value="teacher">' + LAB.esc(LAB.t('role.teacher')) + '</option><option value="jury">' + LAB.esc(LAB.t('role.jury')) + '</option></select></label>' : '') +
        '<label class="field"><span>' + LAB.esc(LAB.t('auth.name')) + '</span><input type="text" name="name" required minlength="3" maxlength="70" autocomplete="name" placeholder="' + LAB.esc(LAB.t('auth.name.ph')) + '"></label>' +
        '<label class="field" id="f-cls"><span>' + LAB.esc(LAB.t('auth.class')) + (tab === 'login' ? ' <em class="tiny">(' + LAB.esc(LAB.t('auth.class.staff')) + ')</em>' : '') + '</span><input type="text" name="cls" list="clslist" maxlength="8" placeholder="8А"><datalist id="clslist">' + classes + '</datalist></label>' +
        '<label class="field"><span>' + LAB.esc(LAB.t('auth.password')) + '</span><input type="password" name="password" required minlength="4" maxlength="64" autocomplete="' + (tab === 'reg' ? 'new-password' : 'current-password') + '"></label>' +
        (tab === 'reg' ? '<label class="field hidden" id="f-code"><span>' + LAB.esc(LAB.t('auth.code')) + '</span><input type="text" name="code" maxlength="20"><div class="hint">' + LAB.esc(LAB.t('auth.code.hint')) + '</div></label>' : '') +
        '<div class="err" id="autherr"></div>' +
        '<button class="btn primary" style="width:100%" type="submit">' + LAB.esc(tab === 'reg' ? LAB.t('auth.register') : LAB.t('auth.login')) + '</button>' +
        (tab === 'reg' ? '<p class="hint" style="margin-top:10px">' + LAB.esc(LAB.t('auth.reg.hint')) + '</p>' : '') +
        '</form>';
      var m = LAB.modal.open('<h3>' + LAB.esc(tab === 'reg' ? LAB.t('auth.register') : LAB.t('auth.login')) + '</h3>' + html);
      return new Promise(function (resolve) {
        var done = false;
        LAB.modal.onClose = function () { if (!done) resolve(false); };
        m.addEventListener('click', function (e) {
          var t = e.target.closest('[data-tab]');
          if (t) { done = true; LAB.auth.open(t.getAttribute('data-tab')).then(resolve); }
        });
        var form = m.querySelector('#authform'), roleSel = form.role;
        function sync() {
          var r = roleSel ? roleSel.value : 'student';
          var fc = m.querySelector('#f-cls'), fk = m.querySelector('#f-code');
          if (tab === 'reg') { fc.classList.toggle('hidden', r !== 'student'); if (fk) fk.classList.toggle('hidden', r === 'student'); }
        }
        if (roleSel) roleSel.addEventListener('change', sync);
        sync();
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = form.querySelector('button[type=submit]'), err = m.querySelector('#autherr');
          err.textContent = '';
          var role = roleSel ? roleSel.value : 'student';
          var payload = { name: form.name.value, password: form.password.value };
          if (tab === 'reg') { payload.role = role; if (role === 'student') payload.cls = form.cls.value; else payload.code = form.code.value; }
          else payload.cls = form.cls.value;
          if (!LAB.apiReady()) { err.textContent = LAB.t('err.NOAPI'); return; }
          btn.disabled = true;
          LAB.api(tab === 'reg' ? 'register' : 'login', payload).then(function (d) {
            done = true;
            LAB.setSession(d.token, d.user);
            LAB.modal.close();
            LAB.toast(LAB.t('auth.welcome', { name: d.user.name }), 'good');
            resolve(true);
            LAB.progress.sync().then(function () { LAB.afterLogin(); });
            LAB.afterLogin();
          }).catch(function (ex) { err.textContent = LAB.errMsg(ex); btn.disabled = false; });
        });
      });
    },
    profile: function () {
      var u = S.user; if (!u) return LAB.auth.open('login');
      var sm = LAB.progress.summary();
      var html = '<h3>' + LAB.esc(u.name) + '</h3><p class="muted">' + LAB.esc(LAB.t('role.' + u.role)) + (u.role === 'student' ? ' · ' + LAB.esc(u.cls) : '') + '</p>' +
        (u.role === 'student' ? '<div class="grid c2" style="margin:12px 0"><div class="card flat stat"><b>' + sm.lessons + '/' + LAB.content.lessons.length + '</b><span class="muted small">' + LAB.esc(LAB.t('prof.lessons')) + '</span></div><div class="card flat stat"><b>' + sm.tasks + '/' + LAB.content.tasks.length + '</b><span class="muted small">' + LAB.esc(LAB.t('prof.tasks')) + '</span></div></div>' : '') +
        '<div class="row" style="justify-content:flex-end;margin-top:14px">' +
        (u.role === 'student' ? '<a class="btn" href="#/my" data-close="1">' + LAB.icon('folder') + LAB.esc(LAB.t('nav.my')) + '</a>' : '<a class="btn" href="#/staff" data-close="1">' + LAB.icon('users') + LAB.esc(LAB.t('nav.staff')) + '</a>') +
        '<button class="btn danger" data-a="out">' + LAB.icon('logout') + LAB.esc(LAB.t('auth.logout')) + '</button></div>';
      var m = LAB.modal.open(html, { noFocus: true });
      m.addEventListener('click', function (e) {
        if (e.target.closest('[data-a=out]')) { LAB.modal.close(); LAB.logout(); }
        else if (e.target.closest('a')) LAB.modal.close();
      });
    }
  };
  LAB.afterLogin = function () {
    LAB.renderHeader();
    if (LAB.apiReady() && S.token) LAB.api('settingsGet').then(function (d) { S.settings = d; }).catch(function () {});
    LAB.route(true);
  };
  LAB.requireLogin = function () {
    if (S.user) return Promise.resolve(true);
    return LAB.auth.open('login');
  };

  /* ---------- шапка ---------- */
  var NAV = [
    ['home', 'home', 'nav.home'], ['learn', 'book', 'nav.learn'], ['trainer', 'target', 'nav.trainer'],
    ['sim', 'chip', 'nav.sim'], ['diy', 'wrench', 'nav.diy.s'], ['my', 'folder', 'nav.my'],
    ['criteria', 'award', 'nav.criteria.s'], ['gallery', 'star', 'nav.gallery'], ['staff', 'users', 'nav.staff']
  ];
  LAB.currentPage = 'home';
  LAB.renderHeader = function () {
    var u = S.user, links = NAV.filter(function (n) {
      if (n[0] === 'my') return !u || u.role === 'student';
      if (n[0] === 'staff') return u && (u.role === 'teacher' || u.role === 'jury');
      return true;
    }).map(function (n) {
      return '<a href="#/' + n[0] + '" data-nav="' + n[0] + '" class="' + (LAB.currentPage === n[0] ? 'on' : '') + '">' + LAB.icon(n[1]) + '<span>' + LAB.esc(LAB.t(n[2])) + '</span></a>';
    }).join('');
    var userHtml = u ? '<button class="iconbtn userbtn" data-act="profile" title="' + LAB.esc(u.name) + '"><span class="av">' + LAB.esc((u.name || '?').trim().charAt(0).toUpperCase()) + '</span><span class="nm">' + LAB.esc(u.name.split(' ')[0]) + '</span></button>' :
      '<button class="btn primary sm" data-act="login">' + LAB.icon('user') + '<span>' + LAB.esc(LAB.t('auth.login')) + '</span></button>';
    LAB.$('#topbar').innerHTML = '<div class="in"><a class="brand" href="#/home"><span class="logo"><svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span class="bt">' + LAB.esc(LAB.t('app.name')) + '</span></a>' +
      '<nav class="nav" aria-label="menu">' + links + '</nav>' +
      '<div class="tools"><div class="seg" role="group" aria-label="language"><button data-lang="ru" class="' + (S.lang === 'ru' ? 'on' : '') + '">RU</button><button data-lang="kz" class="' + (S.lang === 'kz' ? 'on' : '') + '">ҚАЗ</button></div>' +
      '<button class="iconbtn" data-act="theme" title="' + LAB.esc(LAB.t('theme.toggle')) + '" aria-label="' + LAB.esc(LAB.t('theme.toggle')) + '">' + LAB.icon(S.theme === 'dark' ? 'sun' : 'moon') + '</button>' + userHtml + '</div></div>';
    var ban = LAB.$('#banner');
    if (ban) { ban.classList.toggle('hidden', LAB.apiReady()); ban.textContent = LAB.t('banner.noapi'); }
  };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-lang],[data-act]');
    if (!t || !t.closest('#topbar')) return;
    if (t.hasAttribute('data-lang')) LAB.setLang(t.getAttribute('data-lang'));
    else if (t.getAttribute('data-act') === 'theme') LAB.toggleTheme();
    else if (t.getAttribute('data-act') === 'login') LAB.auth.open('login');
    else if (t.getAttribute('data-act') === 'profile') LAB.auth.profile();
  });

  /* ---------- роутер ---------- */
  LAB.pages = {};
  LAB.cleanup = null;
  LAB.route = function (keepScroll) {
    var h = (location.hash || '').replace(/^#\/?/, '') || 'home';
    var parts = h.split('/'), name = parts[0];
    if (!LAB.pages[name]) name = 'home';
    if (LAB.cleanup) { try { LAB.cleanup(); } catch (e) {} LAB.cleanup = null; }
    LAB.themeHook = null;
    LAB.currentPage = name;
    LAB.$$('#topbar .nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === name); });
    var view = LAB.$('#view');
    view.innerHTML = '';
    var box = document.createElement('div');
    view.appendChild(box);
    box.innerHTML = '<div class="loading"><span class="spin"></span></div>';
    if (keepScroll !== true) window.scrollTo(0, 0);
    Promise.resolve().then(function () { return LAB.pages[name](parts.slice(1), box); }).then(function (r) {
      if (typeof r === 'function') LAB.cleanup = r;
    }).catch(function (e) {
      console.error(e);
      box.innerHTML = '<div class="empty">' + LAB.icon('alert') + ' ' + LAB.esc(LAB.errMsg(e)) + '</div>';
    });
  };
  window.addEventListener('hashchange', function () { LAB.route(); });

  /* ---------- мелкие общие компоненты ---------- */
  LAB.loading = function () { return '<div class="loading"><span class="spin"></span></div>'; };
  LAB.needLogin = function (box, msg) {
    box.innerHTML = '<div class="empty"><p>' + LAB.esc(msg || LAB.t('need.login')) + '</p><button class="btn primary" data-a="login">' + LAB.icon('user') + LAB.esc(LAB.t('auth.login')) + '</button></div>';
    box.querySelector('[data-a=login]').onclick = function () { LAB.auth.open('login'); };
  };
  LAB.download = function (name, content, mime) {
    var a = document.createElement('a');
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  LAB.ext = function (n) { var m = /\.([A-Za-z0-9]{1,6})$/.exec(n || ''); return m ? m[1].toLowerCase() : ''; };
})(window);
