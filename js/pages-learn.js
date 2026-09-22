/* ============================================================
 * pages-learn.js — главная, уроки, тренажёр, критерии ЗЕРДЕ
 * ============================================================ */
(function (root) {
  'use strict';
  var LAB = root.LAB, t = function (k, v) { return LAB.t(k, v); }, esc = LAB.esc, L = LAB.L, icon = LAB.icon;
  var C = function () { return LAB.content; };
  var relatedTask = { 2: 'flash', 3: 'measure', 4: 'dimmer', 5: 'garland', 6: 'lustre', 7: 'kettle', 8: 'home' };

  /* ============ ГЛАВНАЯ ============ */
  LAB.pages.home = function (args, box) {
    var S = LAB.state, sm = LAB.progress.summary(), ct = C();
    var demo = root.Sim.examples.simple();
    var art = root.Render.staticSVG(demo, { theme: S.theme, flow: true, animate: true, bg: false, uid: 'hero', noLabels: true });
    var mods = [
      ['learn', 'book', t('nav.learn'), t('home.m.learn'), sm.lessons + '/' + ct.lessons.length],
      ['trainer', 'target', t('nav.trainer'), t('home.m.trainer'), sm.answered ? sm.acc + '%' : ''],
      ['sim', 'chip', t('nav.sim'), t('home.m.sim'), sm.tasks + '/' + ct.tasks.length],
      ['diy', 'wrench', t('nav.diy'), t('home.m.diy'), String(ct.diy.length)],
      [LAB.isStaff() ? 'staff' : 'my', 'folder', LAB.isStaff() ? t('nav.staff') : t('nav.my'), t('home.m.my'), ''],
      ['criteria', 'award', t('nav.criteria'), t('home.m.criteria'), '100']
    ];
    box.innerHTML =
      '<section class="hero"><div><span class="chip acc">' + icon('bolt') + esc(t('home.badge')) + '</span>' +
      '<h1 style="margin-top:14px">' + esc(t('home.title1')) + ' <em>' + esc(t('home.title2')) + '</em></h1>' +
      '<p class="lead">' + esc(t('home.lead')) + '</p>' +
      '<div class="row" style="margin-top:18px"><a class="btn primary lg" href="#/learn">' + icon('book') + esc(t('home.cta1')) + '</a>' +
      '<a class="btn lg" href="#/sim">' + icon('chip') + esc(t('home.cta2')) + '</a>' +
      (LAB.state.user ? '' : '<button class="btn lg ghost" data-a="reg">' + icon('user') + esc(t('auth.register')) + '</button>') + '</div></div>' +
      '<div class="art" aria-hidden="true">' + art + '</div></section>' +
      '<h2 style="margin:34px 0 14px">' + esc(t('home.modules')) + '</h2>' +
      '<div class="grid c3">' + mods.map(function (m, i) {
        return '<a class="card link mod" href="#/' + m[0] + '"><span class="n">' + (i + 1) + '</span><div class="ic">' + icon(m[1]) + '</div><h3>' + esc(m[2]) + '</h3><p>' + esc(m[3]) + '</p>' +
          (m[4] ? '<div style="margin-top:10px"><span class="chip acc">' + esc(m[4]) + '</span></div>' : '') + '</a>';
      }).join('') + '</div>' +
      '<h2 style="margin:34px 0 14px">' + esc(t('home.how')) + '</h2>' +
      '<div class="steps">' + ['home.s1', 'home.s2', 'home.s3', 'home.s4', 'home.s5'].map(function (k) { return '<div>' + esc(t(k)) + '</div>'; }).join('') + '</div>' +
      (LAB.isStudent() ? '<h2 style="margin:34px 0 14px">' + esc(t('home.progress')) + '</h2><div class="grid c3">' +
        '<div class="card"><div class="row between"><b>' + esc(t('prof.lessons')) + '</b><span class="muted">' + sm.lessons + '/' + ct.lessons.length + '</span></div><div class="bar" style="margin-top:8px"><i style="width:' + LAB.pct(sm.lessons, ct.lessons.length) + '%"></i></div></div>' +
        '<div class="card"><div class="row between"><b>' + esc(t('prof.trainer')) + '</b><span class="muted">' + sm.acc + '%</span></div><div class="bar" style="margin-top:8px"><i style="width:' + sm.acc + '%"></i></div></div>' +
        '<div class="card"><div class="row between"><b>' + esc(t('prof.tasks')) + '</b><span class="muted">' + sm.tasks + '/' + ct.tasks.length + '</span></div><div class="bar" style="margin-top:8px"><i style="width:' + LAB.pct(sm.tasks, ct.tasks.length) + '%"></i></div></div></div>' : '');
    var reg = box.querySelector('[data-a=reg]');
    if (reg) reg.onclick = function () { LAB.auth.open('reg'); };
  };

  /* ============ КВИЗ ============ */
  function runQuiz(host, qs, onFinish) {
    var i = 0, correct = 0;
    function show() {
      var q = qs[i];
      var opts = LAB.shuffle(q.o.map(function (o, k) { return { txt: L(o), ok: k === 0 }; }));
      host.innerHTML = '<div class="row between"><span class="chip acc">' + esc(t('quiz.q', { n: i + 1, m: qs.length })) + '</span><span class="muted small">' + esc(t('quiz.score')) + ': ' + correct + '</span></div>' +
        '<div class="bar" style="margin:10px 0 16px"><i style="width:' + LAB.pct(i, qs.length) + '%"></i></div>' +
        '<div class="prob-text">' + esc(L(q.q)) + '</div>' +
        opts.map(function (o, k) { return '<button class="opt" data-k="' + k + '">' + esc(o.txt) + '</button>'; }).join('') +
        '<div id="qfoot"></div>';
      var answered = false;
      host.querySelectorAll('.opt').forEach(function (b) {
        b.onclick = function () {
          if (answered) return; answered = true;
          var o = opts[+b.getAttribute('data-k')];
          if (o.ok) correct++;
          host.querySelectorAll('.opt').forEach(function (bb) { bb.disabled = true; if (opts[+bb.getAttribute('data-k')].ok) bb.classList.add('ok'); });
          if (!o.ok) b.classList.add('no');
          host.querySelector('#qfoot').innerHTML = '<div class="expl"><b>' + esc(o.ok ? t('quiz.right') : t('quiz.wrong')) + '</b> ' + esc(L(q.e)) + '</div>' +
            '<button class="btn primary" id="qnext">' + esc(i + 1 < qs.length ? t('quiz.next') : t('quiz.finish')) + icon('arrow') + '</button>';
          host.querySelector('#qnext').onclick = function () { i++; if (i < qs.length) show(); else finish(); };
        };
      });
    }
    function finish() {
      var pct = LAB.pct(correct, qs.length);
      host.innerHTML = '<div class="center" style="padding:10px 0"><div class="big">' + correct + ' / ' + qs.length + '</div><p class="muted">' + esc(pct >= 67 ? t('quiz.good') : t('quiz.retry.msg')) + '</p>' +
        '<button class="btn" id="qagain">' + icon('rotate') + esc(t('quiz.again')) + '</button></div>';
      host.querySelector('#qagain').onclick = function () { i = 0; correct = 0; qs = LAB.shuffle(qs); show(); };
      onFinish(correct, qs.length);
    }
    qs = LAB.shuffle(qs);
    show();
  }

  /* ============ ВИДЖЕТЫ УРОКОВ ============ */
  function sl(id, label, min, max, step, val, unit) {
    return '<div class="slider-row"><label for="' + id + '">' + esc(label) + '</label><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><b id="' + id + 'v">' + LAB.fmt(val) + ' ' + esc(unit) + '</b></div>';
  }
  function bind(box, ids, fn) {
    var units = {};
    ids.forEach(function (id) { var el = box.querySelector('#' + id); units[id] = (box.querySelector('#' + id + 'v').textContent.split(' ').slice(1).join(' ')); });
    function upd() {
      var v = {};
      ids.forEach(function (id) {
        var el = box.querySelector('#' + id); v[id] = parseFloat(el.value);
        box.querySelector('#' + id + 'v').textContent = LAB.fmt(v[id]) + ' ' + units[id];
      });
      fn(v);
    }
    ids.forEach(function (id) { box.querySelector('#' + id).addEventListener('input', upd); });
    upd();
  }
  var widgets = {
    charges: function (host) {
      var a = 1, b = -1;
      function draw() {
        var same = a === b, ax = same ? [64, 40] : [116, 144], bx = same ? [296, 320] : [244, 216];
        function arrow(x1, x2) { var d = x2 > x1 ? 1 : -1; return '<path d="M' + x1 + ' 70H' + x2 + '" stroke="var(--amber)" stroke-width="4" stroke-linecap="round"/><path d="M' + x2 + ' 70l' + (-8 * d) + ' -6m' + (8 * d) + ' 6l' + (-8 * d) + ' 6" stroke="var(--amber)" stroke-width="4" stroke-linecap="round" fill="none"/>'; }
        host.querySelector('svg').innerHTML =
          arrow(same ? 92 : 100, same ? 56 : 132) + arrow(same ? 268 : 260, same ? 304 : 228) +
          '<g data-c="a" style="cursor:pointer"><circle cx="90" cy="70" r="28" fill="' + (a > 0 ? '#f87171' : '#60a5fa') + '"/><text x="90" y="80" text-anchor="middle" font-size="30" font-weight="800" fill="#fff">' + (a > 0 ? '+' : '−') + '</text></g>' +
          '<g data-c="b" style="cursor:pointer"><circle cx="270" cy="70" r="28" fill="' + (b > 0 ? '#f87171' : '#60a5fa') + '"/><text x="270" y="80" text-anchor="middle" font-size="30" font-weight="800" fill="#fff">' + (b > 0 ? '+' : '−') + '</text></g>';
        host.querySelector('#chres').textContent = same ? t('w.charges.rep') : t('w.charges.att');
        host.querySelectorAll('[data-c]').forEach(function (g) { g.onclick = function () { if (g.getAttribute('data-c') === 'a') a = -a; else b = -b; draw(); }; });
      }
      host.innerHTML = '<h4>' + esc(t('w.charges.title')) + '</h4><p class="muted small">' + esc(t('w.charges.hint')) + '</p><svg viewBox="0 0 360 140" style="width:100%;max-width:440px;display:block;margin:auto"></svg><p class="center big" id="chres" style="font-size:1.2rem"></p>';
      draw();
    },
    ohm: function (host) {
      host.innerHTML = '<h4>' + esc(t('w.ohm.title')) + '</h4>' + sl('wu', 'U', 0, 24, 0.5, 12, t('u.V')) + sl('wr', 'R', 1, 100, 1, 24, t('u.Om')) +
        '<div class="row" style="margin-top:12px"><div class="formula" id="wf"></div><div class="big" id="wi"></div></div><div class="bar" style="margin-top:10px"><i id="wbar" style="width:0"></i></div><p class="hint">' + esc(t('w.ohm.hint')) + '</p>';
      bind(host, ['wu', 'wr'], function (v) {
        var I = v.wu / v.wr;
        host.querySelector('#wf').textContent = 'I = U / R = ' + LAB.fmt(v.wu) + ' / ' + LAB.fmt(v.wr);
        host.querySelector('#wi').textContent = '= ' + LAB.fmt(I) + ' ' + t('u.A');
        host.querySelector('#wbar').style.width = Math.min(100, I / 6 * 100) + '%';
      });
    },
    series: function (host) {
      host.innerHTML = '<h4>' + esc(t('w.series.title')) + '</h4>' + sl('sa', 'U', 1, 36, 1, 12, t('u.V')) + sl('sb', 'R₁', 1, 50, 1, 10, t('u.Om')) + sl('sc', 'R₂', 1, 50, 1, 20, t('u.Om')) +
        '<div class="grid c3" style="margin-top:10px"><div class="card flat stat"><b id="sR"></b><span class="muted small">R = R₁ + R₂</span></div><div class="card flat stat"><b id="sI"></b><span class="muted small">I = U / R</span></div><div class="card flat stat"><b id="sU"></b><span class="muted small">U₁ ; U₂</span></div></div>';
      bind(host, ['sa', 'sb', 'sc'], function (v) {
        var R = v.sb + v.sc, I = v.sa / R;
        host.querySelector('#sR').textContent = LAB.fmt(R) + ' ' + t('u.Om');
        host.querySelector('#sI').textContent = LAB.fmt(I) + ' ' + t('u.A');
        host.querySelector('#sU').textContent = LAB.fmt(I * v.sb) + ' ; ' + LAB.fmt(I * v.sc) + ' ' + t('u.V');
      });
    },
    parallel: function (host) {
      host.innerHTML = '<h4>' + esc(t('w.par.title')) + '</h4>' + sl('pa', 'U', 1, 36, 1, 12, t('u.V')) + sl('pb', 'R₁', 1, 50, 1, 10, t('u.Om')) + sl('pc', 'R₂', 1, 50, 1, 20, t('u.Om')) +
        '<div class="grid c3" style="margin-top:10px"><div class="card flat stat"><b id="pR"></b><span class="muted small">R = R₁R₂ / (R₁ + R₂)</span></div><div class="card flat stat"><b id="pI"></b><span class="muted small">I = I₁ + I₂</span></div><div class="card flat stat"><b id="pU"></b><span class="muted small">I₁ ; I₂</span></div></div>';
      bind(host, ['pa', 'pb', 'pc'], function (v) {
        var R = v.pb * v.pc / (v.pb + v.pc), i1 = v.pa / v.pb, i2 = v.pa / v.pc;
        host.querySelector('#pR').textContent = LAB.fmt(R) + ' ' + t('u.Om');
        host.querySelector('#pI').textContent = LAB.fmt(i1 + i2) + ' ' + t('u.A');
        host.querySelector('#pU').textContent = LAB.fmt(i1) + ' ; ' + LAB.fmt(i2) + ' ' + t('u.A');
      });
    },
    power: function (host) {
      host.innerHTML = '<h4>' + esc(t('w.pow.title')) + '</h4>' + sl('wa', 'P', 10, 3000, 10, 2000, t('u.W')) + sl('wt', 't', 0.1, 10, 0.1, 0.5, t('u.h')) + sl('wc', t('w.pow.tariff'), 5, 60, 1, 20, '₸') +
        '<div class="grid c3" style="margin-top:10px"><div class="card flat stat"><b id="wE"></b><span class="muted small">A = P·t</span></div><div class="card flat stat"><b id="wS"></b><span class="muted small">' + esc(t('w.pow.cost')) + '</span></div><div class="card flat stat"><b id="wJ"></b><span class="muted small">' + esc(t('w.pow.joule')) + '</span></div></div>' +
        '<p class="hint">' + esc(t('w.pow.hint')) + '</p>';
      bind(host, ['wa', 'wt', 'wc'], function (v) {
        var kwh = v.wa / 1000 * v.wt;
        host.querySelector('#wE').textContent = LAB.fmt(kwh) + ' ' + t('u.kWh');
        host.querySelector('#wS').textContent = LAB.fmt(kwh * v.wc) + ' ₸';
        host.querySelector('#wJ').textContent = LAB.fmt(kwh * 3.6e6) + ' ' + t('u.J');
      });
    }
  };

  /* ============ УРОКИ ============ */
  LAB.pages.learn = function (args, box) {
    var ct = C(), p = LAB.progress.get();
    if (args[0] === 'test') return testPage(box);
    if (args[0]) return lessonPage(+args[0], box);
    box.innerHTML = '<div class="pagehead"><div><h1>' + esc(t('nav.learn')) + '</h1><p class="muted" style="margin:6px 0 0">' + esc(t('learn.lead')) + '</p></div><a class="btn amber" href="#/learn/test">' + icon('target') + esc(t('learn.test')) + '</a></div>' +
      '<div class="grid auto">' + ct.lessons.map(function (l) {
        var st = (p.lessons || {})[l.id] || {};
        return '<a class="card link lesson-card ' + (st.done ? 'done' : '') + '" href="#/learn/' + l.id + '"><div class="row between"><span class="no">' + (st.done ? icon('check') : l.id) + '</span>' + (st.done ? '<span class="chip good">' + esc(t('learn.done')) + '</span>' : '') + '</div>' +
          '<h3>' + esc(L(l.t)) + '</h3><p class="muted small" style="margin:0">' + esc(L(l.lead)) + '</p></a>';
      }).join('') + '</div>';
  };

  function lessonPage(id, box) {
    var ct = C(), l = ct.lessons.filter(function (x) { return x.id === id; })[0];
    if (!l) { box.innerHTML = '<div class="empty">404</div>'; return; }
    var qs = ct.quiz.filter(function (q) { return q.tag === id; });
    var prev = ct.lessons.filter(function (x) { return x.id === id - 1; })[0], next = ct.lessons.filter(function (x) { return x.id === id + 1; })[0];
    var rt = relatedTask[id];
    box.innerHTML = '<div class="crumbs"><a href="#/learn">' + esc(t('nav.learn')) + '</a> / ' + esc(t('learn.lesson')) + ' ' + id + '</div>' +
      '<div class="lesson-body"><h1>' + esc(L(l.t)) + '</h1><p class="lead muted" style="font-size:1.1rem">' + esc(L(l.lead)) + '</p>' +
      l.blocks.map(function (b) { return '<h3>' + esc(L(b.h)) + '</h3><p>' + esc(L(b.p)) + '</p>'; }).join('') +
      (l.formulas.length ? '<h3>' + esc(t('learn.formulas')) + '</h3>' + l.formulas.map(function (f) { return '<div><span class="formula">' + esc(f.f) + '</span> <span class="muted small">— ' + esc(L(f.n)) + '</span></div>'; }).join('') : '') +
      (l.widget ? '<div class="widget" id="widget"></div>' : '') +
      '<div class="row" style="margin:16px 0">' + (rt ? '<a class="btn" href="#/sim/task/' + rt + '">' + icon('chip') + esc(t('learn.to.sim')) + '</a>' : '') +
      (id >= 4 && id <= 7 ? '<a class="btn" href="#/trainer">' + icon('target') + esc(t('learn.to.trainer')) + '</a>' : '') + '</div>' +
      '<div class="card" style="margin-top:18px"><h3>' + esc(t('learn.selfcheck')) + '</h3><div id="quiz"></div></div>' +
      '<div class="row between" style="margin-top:22px">' + (prev ? '<a class="btn" href="#/learn/' + prev.id + '">' + icon('back') + esc(t('common.prev')) + '</a>' : '<span></span>') +
      (next ? '<a class="btn primary" href="#/learn/' + next.id + '">' + esc(t('common.next')) + icon('arrow') + '</a>' : '<a class="btn primary" href="#/sim">' + esc(t('learn.to.sim')) + icon('arrow') + '</a>') + '</div></div>';
    if (l.widget) widgets[l.widget](box.querySelector('#widget'));
    runQuiz(box.querySelector('#quiz'), qs, function (c, n) {
      LAB.progress.update(function (p) {
        var s = p.lessons[id] || {};
        p.lessons[id] = { done: s.done || c / n >= 0.66, best: Math.max(s.best || 0, c) };
      });
      if (c / n >= 0.66) LAB.toast(t('learn.lesson.done'), 'good');
    });
  }

  function testPage(box) {
    var ct = C();
    box.innerHTML = '<div class="crumbs"><a href="#/learn">' + esc(t('nav.learn')) + '</a> / ' + esc(t('learn.test')) + '</div><h1>' + esc(t('learn.test')) + '</h1><p class="muted">' + esc(t('learn.test.lead')) + '</p><div class="card" id="quiz"></div>';
    runQuiz(box.querySelector('#quiz'), LAB.shuffle(ct.quiz).slice(0, 10), function (c, n) {
      LAB.progress.update(function (p) { p.quiz = { best: Math.max((p.quiz || {}).best || 0, LAB.pct(c, n)), runs: ((p.quiz || {}).runs || 0) + 1 }; });
    });
  }

  /* ============ ТРЕНАЖЁР ============ */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function nf(x) { return String(Math.round(x * 10000) / 10000).replace('.', ','); }
  var KWH = ['кВт·ч', 'кВт·сағ'];
  LAB.trainerGenRef = function () { return GEN; };
  var GEN = {
    ohmI: function () {
      var R = pick([2, 4, 5, 8, 10, 12, 20, 25, 40, 50, 100]), I = pick([0.1, 0.2, 0.25, 0.4, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5]), U = Math.round(R * I * 100) / 100;
      return { ans: I, unit: 'А', q: ['Напряжение на резисторе U = ' + nf(U) + ' В, его сопротивление R = ' + nf(R) + ' Ом. Найдите силу тока.', 'Резистордағы кернеу U = ' + nf(U) + ' В, кедергісі R = ' + nf(R) + ' Ом. Ток күшін табыңыз.'], sol: 'I = U / R = ' + nf(U) + ' / ' + nf(R) + ' = ' + nf(I) + ' А' };
    },
    ohmU: function () {
      var R = pick([2, 4, 5, 8, 10, 12, 20, 25, 40, 50]), I = pick([0.1, 0.2, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4]), U = Math.round(R * I * 100) / 100;
      return { ans: U, unit: 'В', q: ['Через проводник сопротивлением R = ' + nf(R) + ' Ом течёт ток I = ' + nf(I) + ' А. Найдите напряжение на проводнике.', 'Кедергісі R = ' + nf(R) + ' Ом өткізгіш арқылы I = ' + nf(I) + ' А ток өтеді. Өткізгіштегі кернеуді табыңыз.'], sol: 'U = I · R = ' + nf(I) + ' · ' + nf(R) + ' = ' + nf(U) + ' В' };
    },
    ohmR: function () {
      var R = pick([2, 4, 5, 8, 10, 12, 20, 25, 40, 50]), I = pick([0.1, 0.2, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4]), U = Math.round(R * I * 100) / 100;
      return { ans: R, unit: 'Ом', q: ['При напряжении U = ' + nf(U) + ' В сила тока в проводнике I = ' + nf(I) + ' А. Найдите сопротивление проводника.', 'U = ' + nf(U) + ' В кернеуде өткізгіштегі ток күші I = ' + nf(I) + ' А. Өткізгіштің кедергісін табыңыз.'], sol: 'R = U / I = ' + nf(U) + ' / ' + nf(I) + ' = ' + nf(R) + ' Ом' };
    },
    series: function () {
      var a = pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]), b = pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]), c = pick([2, 3, 4, 5, 6, 8, 10]);
      return { ans: a + b + c, unit: 'Ом', q: ['Три резистора сопротивлениями ' + nf(a) + ' Ом, ' + nf(b) + ' Ом и ' + nf(c) + ' Ом соединены последовательно. Найдите общее сопротивление.', 'Кедергілері ' + nf(a) + ' Ом, ' + nf(b) + ' Ом және ' + nf(c) + ' Ом үш резистор тізбектей қосылған. Жалпы кедергіні табыңыз.'], sol: 'R = R₁ + R₂ + R₃ = ' + nf(a) + ' + ' + nf(b) + ' + ' + nf(c) + ' = ' + nf(a + b + c) + ' Ом' };
    },
    seriesI: function () {
      var S = pick([4, 6, 8, 10, 12, 20, 30]), r1 = Math.round(S / 4) || 1, r2 = S - r1, I = pick([0.5, 1, 2]), U = S * I;
      return { ans: I, unit: 'А', q: ['Резисторы ' + nf(r1) + ' Ом и ' + nf(r2) + ' Ом соединены последовательно и подключены к источнику U = ' + nf(U) + ' В. Найдите силу тока в цепи.', 'Кедергілері ' + nf(r1) + ' Ом және ' + nf(r2) + ' Ом резисторлар тізбектей қосылып, U = ' + nf(U) + ' В көзге қосылған. Тізбектегі ток күшін табыңыз.'], sol: 'R = ' + nf(r1) + ' + ' + nf(r2) + ' = ' + nf(S) + ' Ом;  I = U / R = ' + nf(U) + ' / ' + nf(S) + ' = ' + nf(I) + ' А' };
    },
    parallel: function () {
      var p = pick([[6, 3, 2], [10, 10, 5], [20, 5, 4], [12, 4, 3], [30, 20, 12], [15, 10, 6], [60, 20, 15], [8, 8, 4], [12, 6, 4], [9, 18, 6], [40, 10, 8], [24, 8, 6]]);
      return { ans: p[2], unit: 'Ом', q: ['Два резистора ' + nf(p[0]) + ' Ом и ' + nf(p[1]) + ' Ом соединены параллельно. Найдите общее сопротивление.', 'Екі резистор ' + nf(p[0]) + ' Ом және ' + nf(p[1]) + ' Ом параллель қосылған. Жалпы кедергіні табыңыз.'], sol: 'R = R₁·R₂ / (R₁ + R₂) = ' + nf(p[0]) + '·' + nf(p[1]) + ' / ' + nf(p[0] + p[1]) + ' = ' + nf(p[2]) + ' Ом' };
    },
    parallelI: function () {
      var p = pick([[12, 4, 6, 5], [24, 6, 12, 6], [36, 9, 18, 6], [60, 20, 30, 5], [220, 110, 55, 6], [10, 5, 10, 3]]);
      return { ans: p[3], unit: 'А', q: ['Два резистора ' + nf(p[1]) + ' Ом и ' + nf(p[2]) + ' Ом соединены параллельно и подключены к напряжению ' + nf(p[0]) + ' В. Найдите общую силу тока.', 'Екі резистор ' + nf(p[1]) + ' Ом және ' + nf(p[2]) + ' Ом параллель қосылып, ' + nf(p[0]) + ' В кернеуге қосылған. Жалпы ток күшін табыңыз.'], sol: 'I₁ = ' + nf(p[0]) + ' / ' + nf(p[1]) + ' = ' + nf(p[0] / p[1]) + ' А;  I₂ = ' + nf(p[0]) + ' / ' + nf(p[2]) + ' = ' + nf(p[0] / p[2]) + ' А;  I = I₁ + I₂ = ' + nf(p[3]) + ' А' };
    },
    powerP: function () {
      var p = pick([[220, 0.5, 110], [220, 10, 2200], [12, 2, 24], [6, 0.5, 3], [4.5, 0.4, 1.8], [24, 2.5, 60], [220, 0.25, 55], [9, 0.5, 4.5]]);
      return { ans: p[2], unit: 'Вт', q: ['Лампа включена в сеть с напряжением ' + nf(p[0]) + ' В, сила тока ' + nf(p[1]) + ' А. Найдите мощность лампы.', 'Шам кернеуі ' + nf(p[0]) + ' В желіге қосылған, ток күші ' + nf(p[1]) + ' А. Шамның қуатын табыңыз.'], sol: 'P = U · I = ' + nf(p[0]) + ' · ' + nf(p[1]) + ' = ' + nf(p[2]) + ' Вт' };
    },
    powerI: function () {
      var p = pick([[60, 12, 5], [2200, 220, 10], [44, 220, 0.2], [110, 220, 0.5], [550, 220, 2.5], [1100, 220, 5], [15, 6, 2.5]]);
      return { ans: p[2], unit: 'А', q: ['Прибор мощностью ' + nf(p[0]) + ' Вт работает от напряжения ' + nf(p[1]) + ' В. Найдите силу тока.', 'Қуаты ' + nf(p[0]) + ' Вт аспап ' + nf(p[1]) + ' В кернеуден жұмыс істейді. Ток күшін табыңыз.'], sol: 'I = P / U = ' + nf(p[0]) + ' / ' + nf(p[1]) + ' = ' + nf(p[2]) + ' А' };
    },
    work: function () {
      var p = pick([[60, 120, 7200], [100, 30, 3000], [2000, 60, 120000], [1500, 10, 15000], [40, 50, 2000], [800, 5, 4000]]);
      return { ans: p[2], unit: 'Дж', q: ['Электроприбор мощностью ' + nf(p[0]) + ' Вт работает ' + nf(p[1]) + ' с. Какую работу совершает ток?', 'Қуаты ' + nf(p[0]) + ' Вт электр аспабы ' + nf(p[1]) + ' с жұмыс істейді. Ток қандай жұмыс атқарады?'], sol: 'A = P · t = ' + nf(p[0]) + ' · ' + nf(p[1]) + ' = ' + nf(p[2]) + ' Дж' };
    },
    kwh: function () {
      var p = pick([[2, 0.5, 1], [1.5, 2, 3], [0.06, 5, 0.3], [0.1, 10, 1], [3, 1.5, 4.5], [0.5, 8, 4]]);
      return { ans: p[2], unit: KWH, q: ['Прибор мощностью ' + nf(p[0]) + ' кВт работает ' + nf(p[1]) + ' ч. Сколько энергии он израсходует (в кВт·ч)?', 'Қуаты ' + nf(p[0]) + ' кВт аспап ' + nf(p[1]) + ' сағ жұмыс істейді. Ол қанша энергия жұмсайды (кВт·сағ)?'], sol: 'A = P · t = ' + nf(p[0]) + ' · ' + nf(p[1]) + ' = ' + nf(p[2]) + ' ' + L(KWH) };
    },
    cost: function () {
      var p = pick([[3, 20, 60], [2.5, 20, 50], [10, 20, 200], [0.5, 20, 10], [4, 25, 100]]);
      return { ans: p[2], unit: '₸', q: ['Условный тариф — ' + nf(p[1]) + ' ₸ за 1 кВт·ч. Сколько стоит ' + nf(p[0]) + ' кВт·ч электроэнергии?', 'Шартты тариф — 1 кВт·сағ үшін ' + nf(p[1]) + ' ₸. ' + nf(p[0]) + ' кВт·сағ электр энергиясы қанша тұрады?'], sol: nf(p[0]) + ' · ' + nf(p[1]) + ' = ' + nf(p[2]) + ' ₸' };
    },
    joule: function () {
      var p = pick([[2, 10, 60, 2400], [0.5, 20, 100, 500], [3, 4, 10, 360], [1, 50, 30, 1500], [4, 5, 5, 400], [2, 25, 30, 3000]]);
      return { ans: p[3], unit: 'Дж', q: ['По проводнику сопротивлением ' + nf(p[1]) + ' Ом течёт ток ' + nf(p[0]) + ' А в течение ' + nf(p[2]) + ' с. Какое количество теплоты выделится?', 'Кедергісі ' + nf(p[1]) + ' Ом өткізгіш арқылы ' + nf(p[0]) + ' А ток ' + nf(p[2]) + ' с бойы өтеді. Қанша жылу мөлшері бөлінеді?'], sol: 'Q = I² · R · t = ' + nf(p[0]) + '² · ' + nf(p[1]) + ' · ' + nf(p[2]) + ' = ' + nf(p[3]) + ' Дж' };
    },
    units: function () {
      var p = pick([['250 мА', 'А', 0.25], ['0,5 кВ', 'В', 500], ['3 кОм', 'Ом', 3000], ['1500 Вт', 'кВт', 1.5], ['40 мВ', 'В', 0.04], ['2,5 А', 'мА', 2500], ['0,2 кОм', 'Ом', 200], ['4 кВт', 'Вт', 4000], ['5000 Ом', 'кОм', 5], ['300 мА', 'А', 0.3]]);
      return { ans: p[2], unit: p[1], q: ['Переведите: ' + p[0] + ' = ? ' + p[1], 'Аударыңыз: ' + p[0] + ' = ? ' + p[1]], sol: p[0] + ' = ' + nf(p[2]) + ' ' + p[1] };
    },
    kettle: function () {
      var P = pick([550, 1100, 2200]), I = P / 220, R = 220 * 220 / P;
      if (Math.random() < 0.5) return { ans: I, unit: 'А', q: ['Электрочайник мощностью ' + nf(P) + ' Вт включён в сеть 220 В. Найдите силу тока в спирали.', 'Қуаты ' + nf(P) + ' Вт электр шәйнек 220 В желіге қосылған. Спираль тогының күшін табыңыз.'], sol: 'I = P / U = ' + nf(P) + ' / 220 = ' + nf(I) + ' А' };
      return { ans: R, unit: 'Ом', q: ['Электрочайник мощностью ' + nf(P) + ' Вт включён в сеть 220 В. Найдите сопротивление спирали (R = U² / P).', 'Қуаты ' + nf(P) + ' Вт электр шәйнек 220 В желіге қосылған. Спиральдың кедергісін табыңыз (R = U² / P).'], sol: 'R = U² / P = 220² / ' + nf(P) + ' = ' + nf(R) + ' Ом' };
    }
  };
  var TOPICS = { ohm: ['ohmI', 'ohmU', 'ohmR'], circuits: ['series', 'seriesI', 'parallel', 'parallelI'], power: ['powerP', 'powerI', 'work', 'kwh', 'cost', 'joule', 'kettle'], units: ['units'], mix: Object.keys(GEN) };

  function parseNum(s) { s = String(s || '').replace(/\s/g, '').replace(',', '.'); if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)) return NaN; return parseFloat(s); }

  LAB.pages.trainer = function (args, box) {
    var topic = 'mix', N = 10, idx = 0, ok = 0, cur = null, log = [];
    function setup() {
      var sm = LAB.progress.summary();
      box.innerHTML = '<div class="pagehead"><div><h1>' + esc(t('nav.trainer')) + '</h1><p class="muted" style="margin:6px 0 0">' + esc(t('trainer.lead')) + '</p></div></div>' +
        '<div class="grid c2"><div class="card"><h3>' + esc(t('trainer.choose')) + '</h3><div class="stack">' +
        ['ohm', 'circuits', 'power', 'units', 'mix'].map(function (k) { return '<label class="check"><input type="radio" name="tp" value="' + k + '"' + (k === topic ? ' checked' : '') + '><span><b>' + esc(t('trainer.t.' + k)) + '</b><br><span class="muted small">' + esc(t('trainer.t.' + k + '.d')) + '</span></span></label>'; }).join('') +
        '</div><button class="btn primary lg" id="go" style="margin-top:12px">' + icon('target') + esc(t('trainer.start')) + '</button></div>' +
        '<div class="card"><h3>' + esc(t('trainer.stats')) + '</h3><div class="grid c2"><div class="card flat stat"><b>' + sm.answered + '</b><span class="muted small">' + esc(t('trainer.answered')) + '</span></div><div class="card flat stat"><b>' + sm.acc + '%</b><span class="muted small">' + esc(t('trainer.acc')) + '</span></div></div>' +
        '<p class="hint">' + esc(t('trainer.tip')) + '</p></div></div>';
      box.querySelector('#go').onclick = function () { topic = box.querySelector('input[name=tp]:checked').value; idx = 0; ok = 0; log = []; next(); };
    }
    function next() {
      var type = pick(TOPICS[topic]);
      cur = GEN[type](); cur.type = type;
      screen(false);
    }
    function screen(checked, val) {
      var unit = L(cur.unit);
      box.innerHTML = '<div class="crumbs"><a href="#/trainer">' + esc(t('nav.trainer')) + '</a></div><div class="card" style="max-width:760px"><div class="row between"><span class="chip acc">' + esc(t('trainer.task', { n: idx + 1, m: N })) + '</span><span class="muted small">' + esc(t('quiz.score')) + ': ' + ok + '</span></div>' +
        '<div class="bar" style="margin:10px 0"><i style="width:' + LAB.pct(idx, N) + '%"></i></div>' +
        '<div class="prob-text">' + esc(L(cur.q)) + '</div>' +
        '<div class="ans-row"><input type="text" inputmode="decimal" id="ans" autocomplete="off" placeholder="' + esc(t('trainer.ans')) + '" ' + (checked ? 'disabled value="' + esc(val) + '"' : '') + '><b>' + esc(unit) + '</b>' +
        (checked ? '' : '<button class="btn primary" id="chk">' + esc(t('trainer.check')) + '</button>') + '</div><div id="fb"></div></div>';
      var inp = box.querySelector('#ans');
      if (!checked) {
        inp.focus();
        var go = function () {
          var v = parseNum(inp.value);
          if (isNaN(v)) { box.querySelector('#fb').innerHTML = '<div class="err">' + esc(t('trainer.nan')) + '</div>'; return; }
          var good = Math.abs(v - cur.ans) <= Math.max(Math.abs(cur.ans) * 0.01, 1e-9);
          if (good) ok++;
          log.push(good);
          LAB.progress.update(function (p) {
            var tr = p.trainer; tr.answered = (tr.answered || 0) + 1; tr.correct = (tr.correct || 0) + (good ? 1 : 0);
            tr.by = tr.by || {}; tr.by[cur.type] = tr.by[cur.type] || { a: 0, c: 0 }; tr.by[cur.type].a++; if (good) tr.by[cur.type].c++;
          });
          screen(true, inp.value);
          box.querySelector('#fb').innerHTML = '<div class="expl" style="background:' + (good ? 'var(--good-soft)' : 'var(--bad-soft)') + '"><b>' + esc(good ? t('quiz.right') : t('quiz.wrong')) + '</b> ' + esc(good ? '' : t('trainer.correct') + ': ' + nf(cur.ans) + ' ' + unit) + '</div>' +
            '<div class="sol"><b>' + esc(t('trainer.solution')) + ':</b> ' + esc(cur.sol.replace(/ Ом/g, ' ' + t('u.Om'))) + '</div>' +
            '<div style="margin-top:14px"><button class="btn primary" id="nx">' + esc(idx + 1 < N ? t('quiz.next') : t('quiz.finish')) + icon('arrow') + '</button></div>';
          box.querySelector('#nx').focus();
          box.querySelector('#nx').onclick = function () { idx++; if (idx < N) next(); else summary(); };
        };
        box.querySelector('#chk').onclick = go;
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      }
    }
    function summary() {
      var pct = LAB.pct(ok, N);
      box.innerHTML = '<div class="card center" style="max-width:560px;margin:auto"><h2>' + esc(t('trainer.done')) + '</h2><div class="big" style="font-size:2.6rem">' + ok + ' / ' + N + '</div>' +
        '<p class="muted">' + esc(pct >= 80 ? t('trainer.great') : pct >= 50 ? t('trainer.ok') : t('trainer.more')) + '</p><div class="row" style="justify-content:center;margin:10px 0">' +
        log.map(function (g) { return '<span class="chip ' + (g ? 'good' : 'bad') + '">' + (g ? icon('check') : icon('x')) + '</span>'; }).join('') + '</div>' +
        '<div class="row" style="justify-content:center"><button class="btn primary" id="again">' + icon('rotate') + esc(t('quiz.again')) + '</button><a class="btn" href="#/learn">' + icon('book') + esc(t('nav.learn')) + '</a></div></div>';
      box.querySelector('#again').onclick = setup;
    }
    setup();
  };

  /* ============ КРИТЕРИИ ЗЕРДЕ ============ */
  LAB.awardFor = function (score) {
    var a = C().awards;
    for (var i = 0; i < a.length; i++) if (score >= a[i].min) return a[i];
    return null;
  };
  LAB.pages.criteria = function (args, box) {
    var ct = C(), self = LAB.store.get('self', {});
    function calc() {
      var tot = 0;
      ct.criteria.forEach(function (c) { tot += Math.min(c.max, +self[c.id] || 0); });
      return Math.round(tot * 10) / 10;
    }
    box.innerHTML = '<div class="pagehead"><div><h1>' + esc(t('crit.title')) + '</h1><p class="muted" style="margin:6px 0 0">' + esc(t('crit.sub')) + '</p></div><span class="chip amb">' + icon('info') + esc(t('crit.source')) + '</span></div>' +
      '<div class="card" style="margin-bottom:16px">' + icon('users') + ' <b>' + esc(t('crit.jury')) + '</b> <span class="muted">— ' + esc(t('crit.jury.sub')) + '</span></div>' +
      '<div class="card rubric"><div class="tblwrap"><table class="tbl"><thead><tr><th>#</th><th>' + esc(t('crit.col.c')) + '</th><th>' + esc(t('crit.col.w')) + '</th><th class="center">' + esc(t('crit.col.p')) + '</th></tr></thead><tbody>' +
      ct.criteria.map(function (c, i) { return '<tr><td><span class="n">' + (i + 1) + '</span></td><td><b>' + esc(L(c.t)) + '</b></td><td class="muted">' + esc(L(c.d)) + '</td><td class="pt">' + c.max + '</td></tr>'; }).join('') +
      '</tbody></table></div><p style="margin:14px 0 0"><span class="chip amb">' + icon('star') + esc(t('crit.heaviest')) + '</span></p></div>' +
      '<div class="grid c2" style="margin-top:16px"><div class="card"><h3>' + esc(t('crit.awards')) + '</h3><table class="tbl"><thead><tr><th>' + esc(t('crit.award')) + '</th><th>' + esc(t('crit.points')) + '</th></tr></thead><tbody>' +
      ct.awards.map(function (a) { return '<tr><td><span class="award ' + a.id + '">' + esc(L(a.t)) + '</span></td><td><b>' + a.range + '</b></td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="warn info" style="margin-top:12px">' + icon('info') + '<span>' + esc(t('crit.important')) + '</span></div></div>' +
      '<div class="card self"><h3>' + esc(t('crit.self')) + '</h3><p class="muted small">' + esc(t('crit.self.sub')) + '</p>' +
      ct.criteria.map(function (c, i) { return '<div class="slider-row" style="grid-template-columns:24px 1fr 60px"><b>' + (i + 1) + '</b><input type="range" min="0" max="' + c.max + '" step="0.5" data-c="' + c.id + '" value="' + (self[c.id] || 0) + '" title="' + esc(L(c.t)) + '"><b data-v="' + c.id + '">' + (self[c.id] || 0) + '/' + c.max + '</b></div>'; }).join('') +
      '<div class="row between" style="margin-top:12px"><div><span class="muted small">' + esc(t('crit.total')) + '</span><div class="total" id="tot">0</div></div><div id="aw"></div></div></div></div>';
    function upd() {
      var tot = calc(), a = LAB.awardFor(tot);
      box.querySelector('#tot').textContent = LAB.fmt(tot);
      box.querySelector('#aw').innerHTML = a ? '<span class="award ' + a.id + '">' + esc(L(a.t)) + '</span>' : '<span class="muted small">' + esc(t('crit.noaward')) + '</span>';
    }
    box.querySelectorAll('input[data-c]').forEach(function (r) {
      r.addEventListener('input', function () {
        var id = r.getAttribute('data-c'), c = ct.criteria.filter(function (x) { return x.id === id; })[0];
        self[id] = +r.value; LAB.store.set('self', self);
        box.querySelector('[data-v=' + id + ']').textContent = r.value + '/' + c.max; upd();
      });
    });
    upd();
  };
})(window);
