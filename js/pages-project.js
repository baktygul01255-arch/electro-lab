/* ============================================================
 * pages-project.js — «Сделай своими руками», «Мои работы», проект по ЗЕРДЕ,
 * материалы (файлы и ссылки), график данных, оценка жюри
 * ============================================================ */
(function (root) {
  'use strict';
  var LAB = root.LAB, t = function (k, v) { return LAB.t(k, v); }, esc = LAB.esc, L = LAB.L, icon = LAB.icon;
  var E = root.Engine, R = root.Render;
  var ct = function () { return LAB.content; };
  var TAGS = ['photo', 'video', 'data', 'presentation', 'doc', 'other'];
  var EXT_OK = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'odt', 'odp', 'ods', 'mp4', 'mov', 'webm', 'm4v', 'mp3', 'm4a', 'wav', 'ogg'];

  /* ============ модель данных проекта ============ */
  function defaultData(tpl) {
    var d = {
      c1: { problem: '', question: '', relevance: '' },
      c2: { aim: '', tasks: '', hypothesis: '', noHyp: false, stages: '' },
      c3: { methods: '', plan: [], safety: '', ack: [false, false, false, false], ethics: '' },
      c4: { table: { cols: [L(['Величина 1', '1-шама']), L(['Величина 2', '2-шама'])], rows: [['', ''], ['', ''], ['', '']] }, cx: 0, cy: 1, analysis: '', result: '' },
      c5: { diary: [], sources: [], help: '', ai: { used: '', how: '' } },
      c6: { conclusions: '', significance: '', limits: '', next: '', reflection: '' },
      c7: { pitch: '', ack: [false, false] },
      c8: { qa: [], contribution: '' }
    };
    if (tpl) {
      d.c1.question = L(tpl.question);
      d.c2.hypothesis = L(tpl.hypo);
      d.c3.safety = tpl.safety.map(function (x) { return '• ' + L(x); }).join('\n');
      d.c3.methods = tpl.steps.map(function (x, i) { return (i + 1) + '. ' + L(x); }).join('\n');
      d.c3.plan = tpl.steps.slice(0, 5).map(function (x) { return { t: L(x), d: '', done: false }; });
      d.c4.table.cols = tpl.cols.map(L);
      d.c4.table.rows = [0, 1, 2, 3].map(function () { return tpl.cols.map(function () { return ''; }); });
    }
    return d;
  }
  function mergeData(d) {
    var base = defaultData(null), out = JSON.parse(JSON.stringify(base));
    (function deep(a, b) { Object.keys(b || {}).forEach(function (k) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deep(a[k], b[k]); else a[k] = b[k]; }); })(out, d || {});
    return out;
  }
  function getPath(o, path) { var p = path.split('.'); for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; } return o; }
  function setPath(o, path, v) { var p = path.split('.'); for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[p[i]]; } o[p[p.length - 1]] = v; }
  function len(s) { return String(s || '').trim().length; }
  function lines(s) { return String(s || '').split('\n').filter(function (x) { return x.trim().length > 1; }); }
  function toNum(s) { var v = parseFloat(String(s == null ? '' : s).replace(',', '.').replace(/\s/g, '')); return isFinite(v) ? v : NaN; }

  /* готовность по критериям (не оценка, а самопроверка) */
  function readiness(d, mats, circs) {
    var evid = mats.some(function (m) { return m.tag === 'photo' || m.tag === 'data' || m.tag === 'video'; }) || circs.length > 0;
    var pres = mats.some(function (m) { return m.tag === 'presentation'; });
    var rowsData = d.c4.table.rows.filter(function (r) { return r.filter(function (c) { return String(c).trim() !== ''; }).length >= 2; }).length;
    var diary = d.c5.diary.filter(function (x) { return len(x.t) >= 10; }).length;
    var src = d.c5.sources.filter(function (x) { return len(x.t) >= 3; }).length;
    var qa = d.c8.qa.filter(function (x) { return len(x.q) > 3 && len(x.a) > 3; }).length;
    var c = {
      c1: [['problem', len(d.c1.problem) >= 40], ['question', len(d.c1.question) >= 15], ['relevance', len(d.c1.relevance) >= 40]],
      c2: [['aim', len(d.c2.aim) >= 20], ['tasks', lines(d.c2.tasks).length >= 2], ['hyp', len(d.c2.hypothesis) >= 15 || d.c2.noHyp], ['stages', len(d.c2.stages) >= 20]],
      c3: [['methods', len(d.c3.methods) >= 40], ['plan', d.c3.plan.filter(function (x) { return len(x.t) > 2; }).length >= 3], ['safety', len(d.c3.safety) >= 20 && d.c3.ack.every(Boolean)], ['ethics', len(d.c3.ethics) >= 15]],
      c4: [['rows', rowsData >= 3], ['analysis', len(d.c4.analysis) >= 60], ['result', len(d.c4.result) >= 30], ['evid', evid]],
      c5: [['diary', diary >= 3], ['sources', src >= 3], ['help', len(d.c5.help) >= 2], ['ai', d.c5.ai.used === 'no' || (d.c5.ai.used === 'yes' && len(d.c5.ai.how) >= 15)]],
      c6: [['concl', len(d.c6.conclusions) >= 60], ['signif', len(d.c6.significance) >= 30], ['limits', len(d.c6.limits) >= 20 && len(d.c6.next) >= 15], ['refl', len(d.c6.reflection) >= 30]],
      c7: [['pres', pres], ['pitch', len(d.c7.pitch) >= 60], ['ack', d.c7.ack.every(Boolean)]],
      c8: [['qa', qa >= 3], ['contrib', len(d.c8.contribution) >= 40]]
    };
    var out = {}, tot = 0, w = 0;
    ct().criteria.forEach(function (cr) {
      var arr = c[cr.id], ok = arr.filter(function (x) { return x[1]; }).length;
      out[cr.id] = { pct: Math.round(ok * 100 / arr.length), checks: arr };
      tot += out[cr.id].pct * cr.max; w += cr.max;
    });
    out.total = Math.round(tot / w);
    return out;
  }
  LAB.zerde = { defaultData: defaultData, readiness: readiness, mergeData: mergeData };
  LAB.readyPct = function (csv) {
    if (!csv) return 0;
    var a = String(csv).split(',').map(Number), tot = 0, w = 0;
    ct().criteria.forEach(function (c, i) { tot += (a[i] || 0) * c.max; w += c.max; });
    return Math.round(tot / w);
  };

  /* ============ Сделай своими руками ============ */
  function levelChip(n) { return '<span class="chip amb">' + esc(t('diy.level')) + ': ' + '★'.repeat(n) + '</span>'; }

  LAB.pages.diy = function (args, box) {
    var list = ct().diy;
    if (args[0]) {
      var p = list.filter(function (x) { return x.id === args[0]; })[0];
      if (p) return diyDetail(p, box);
    }
    box.innerHTML = '<div class="pagehead"><div><h1>' + esc(t('nav.diy')) + '</h1><p class="muted" style="margin:6px 0 0">' + esc(t('diy.lead')) + '</p></div><button class="btn" data-a="blank">' + icon('plus') + esc(t('diy.blank')) + '</button></div>' +
      '<div class="grid auto">' + list.map(function (p) {
        return '<a class="card link mod" href="#/diy/' + p.id + '"><div class="ic">' + icon(p.icon) + '</div><h3>' + esc(L(p.t)) + '</h3><p>' + esc(L(p.idea)) + '</p><div class="row" style="margin-top:10px;gap:6px">' + levelChip(p.level) + '<span class="chip">' + icon('list') + esc(L(p.time)) + '</span></div></a>';
      }).join('') + '</div>';
    box.querySelector('[data-a=blank]').onclick = function () { startProject(null); };
  };

  function diyDetail(p, box) {
    var lesson = ct().lessons.filter(function (l) { return l.id === p.lesson; })[0];
    function ul(a, cls) { return '<ul class="ticks ' + (cls || '') + '">' + a.map(function (x) { return '<li>' + esc(L(x)) + '</li>'; }).join('') + '</ul>'; }
    box.innerHTML = '<div class="crumbs"><a href="#/diy">' + esc(t('nav.diy')) + '</a></div>' +
      '<div class="diy-hero"><div class="ic">' + icon(p.icon) + '</div><div><h1 style="margin-bottom:6px">' + esc(L(p.t)) + '</h1><p class="muted" style="margin:0 0 10px">' + esc(L(p.idea)) + '</p><div class="row" style="gap:6px">' + levelChip(p.level) + '<span class="chip">' + icon('list') + esc(L(p.time)) + '</span></div></div></div>' +
      '<div class="row" style="margin:18px 0"><button class="btn primary lg" data-a="start">' + icon('folder') + esc(t('diy.start')) + '</button>' +
      (lesson ? '<a class="btn" href="#/learn/' + lesson.id + '">' + icon('book') + esc(t('diy.lesson')) + '</a>' : '') +
      (p.task ? '<a class="btn" href="#/sim/task/' + p.task + '">' + icon('chip') + esc(t('diy.simtask')) + '</a>' : '') + '</div>' +
      '<div class="grid c2"><div class="stack"><div class="card"><h3>' + esc(t('diy.question')) + '</h3><p>' + esc(L(p.question)) + '</p><h3>' + esc(t('diy.hypo')) + '</h3><p>' + esc(L(p.hypo)) + '</p></div>' +
      '<div class="card"><h3>' + esc(t('diy.materials')) + '</h3>' + ul(p.materials) + '</div>' +
      '<div class="card" style="border-color:var(--bad)"><h3 style="color:var(--bad)">' + icon('alert') + ' ' + esc(t('diy.safety')) + '</h3>' + ul(p.safety, 'warnl') + '<p class="hint">' + esc(t('diy.safety.note')) + '</p></div></div>' +
      '<div class="stack"><div class="card"><h3>' + esc(t('diy.steps')) + '</h3><ol class="steps2">' + p.steps.map(function (s) { return '<li>' + esc(L(s)) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="card"><h3>' + esc(t('diy.table')) + '</h3><div class="tblwrap"><table class="tbl"><thead><tr>' + p.cols.map(function (c) { return '<th>' + esc(L(c)) + '</th>'; }).join('') + '</tr></thead><tbody><tr>' + p.cols.map(function () { return '<td>&nbsp;</td>'; }).join('') + '</tr></tbody></table></div><p class="hint">' + esc(t('diy.table.hint')) + '</p></div></div></div>';
    box.querySelector('[data-a=start]').onclick = function () { startProject(p); };
  }

  function startProject(tpl) {
    LAB.requireLoggedStudent().then(function (ok) {
      if (!ok) return;
      var m = LAB.modal.open('<h3>' + esc(t('proj.new')) + '</h3><label class="field"><span>' + esc(t('proj.title')) + '</span><input type="text" id="pt" maxlength="120" value="' + esc(tpl ? L(tpl.t) : '') + '" placeholder="' + esc(t('proj.title.ph')) + '"></label>' +
        '<label class="field"><span>' + esc(t('proj.section')) + '</span><select id="ps">' + ct().sections.map(function (s, i) { return '<option value="' + esc(L(s)) + '"' + (i === 0 ? ' selected' : '') + '>' + esc(L(s)) + '</option>'; }).join('') + '</select></label><div class="err" id="perr"></div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn primary" id="pgo">' + icon('plus') + esc(t('proj.create')) + '</button></div>');
      m.querySelector('#pgo').onclick = function () {
        var btn = this, title = m.querySelector('#pt').value.trim();
        if (title.length < 3) { m.querySelector('#perr').textContent = t('proj.title.short'); return; }
        btn.disabled = true;
        LAB.api('projectSave', { project: { title: title, section: m.querySelector('#ps').value, template: tpl ? tpl.id : '', status: 'draft', public: false, ready: '', data: JSON.stringify(defaultData(tpl)) } })
          .then(function (d) { LAB.modal.close(); location.hash = '#/project/' + d.id; })
          .catch(function (e) { m.querySelector('#perr').textContent = LAB.errMsg(e); btn.disabled = false; });
      };
    });
  }
  LAB.requireLoggedStudent = function () {
    return LAB.requireLogin().then(function (ok) {
      if (!ok || !LAB.state.user) return false;
      if (!LAB.isStudent()) { LAB.toast(t('proj.students.only'), 'bad'); return false; }
      return true;
    });
  };

  /* ============ Мои работы ============ */
  LAB.pages.my = function (args, box) {
    if (LAB.isStaff()) { location.hash = '#/staff'; return; }
    if (!LAB.state.user) {
      box.innerHTML = '<div class="pagehead"><h1>' + esc(t('nav.my')) + '</h1></div><div id="nl"></div>';
      LAB.needLogin(box.querySelector('#nl'), t('my.login')); return;
    }
    box.innerHTML = '<div class="pagehead"><div><h1>' + esc(t('nav.my')) + '</h1><p class="muted" style="margin:6px 0 0">' + esc(t('my.lead')) + '</p></div><div class="row"><button class="btn primary" data-a="new">' + icon('plus') + esc(t('proj.new')) + '</button><a class="btn" href="#/sim/mine">' + icon('chip') + esc(t('sim.tab.mine')) + '</a></div></div><div id="list">' + LAB.loading() + '</div>';
    box.querySelector('[data-a=new]').onclick = function () { startProject(null); };
    LAB.api('projectsList').then(function (d) {
      var host = box.querySelector('#list'), items = d.projects;
      function draw() {
        if (!items.length) { host.innerHTML = '<div class="empty">' + esc(t('my.empty')) + '<br><br><a class="btn primary" href="#/diy">' + icon('wrench') + esc(t('nav.diy')) + '</a></div>'; return; }
        host.innerHTML = '<div class="grid auto">' + items.map(function (p) {
          var rp = LAB.readyPct(p.ready);
          return '<div class="card" data-id="' + esc(p.id) + '"><div class="row between"><span class="chip ' + (p.status === 'submitted' ? 'good' : '') + '">' + esc(t('proj.st.' + p.status)) + '</span>' + (p.public ? '<span class="chip amb">' + icon('eye') + esc(t('sim.public')) + '</span>' : '') + '</div>' +
            '<h3 style="margin:10px 0 4px">' + esc(p.title) + '</h3><p class="muted small" style="margin:0 0 8px">' + esc(p.section || '') + ' · ' + esc(LAB.date(p.updated)) + '</p>' +
            '<div class="row between small"><span class="muted">' + esc(t('proj.ready')) + '</span><b>' + rp + '%</b></div><div class="bar" style="margin:4px 0 12px"><i style="width:' + rp + '%"></i></div>' +
            '<div class="row" style="gap:6px"><a class="btn sm primary" href="#/project/' + esc(p.id) + '">' + icon('wire') + esc(t('common.open')) + '</a><span class="chip">' + icon('file') + p.materials + '</span><button class="btn sm danger" data-a="del" style="margin-left:auto">' + icon('trash') + '</button></div></div>';
        }).join('') + '</div>';
      }
      draw();
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a=del]'); if (!b) return;
        var id = b.closest('[data-id]').getAttribute('data-id');
        LAB.confirm(t('proj.del.confirm')).then(function (y) { if (!y) return; LAB.api('projectDelete', { id: id }).then(function () { items = items.filter(function (x) { return x.id !== id; }); draw(); }).catch(LAB.fail); });
      });
    }).catch(function (e) { box.querySelector('#list').innerHTML = '<div class="empty">' + esc(LAB.errMsg(e)) + '</div>'; });
  };

  /* ============ Материалы: превью и загрузка ============ */
  function thumbUrl(id) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w640'; }
  function fmtSize(n) { n = +n || 0; return n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function isImg(m) { return m.kind === 'file' && /^image\//.test(m.mime || '') && m.mime !== 'image/heic'; }
  function matIcon(m) {
    if (m.kind === 'link') return 'link';
    if (/^video\//.test(m.mime)) return 'video';
    if (/^image\//.test(m.mime)) return 'image';
    return 'file';
  }
  function matCard(m, canDel) {
    return '<div class="mat" data-mid="' + esc(m.id) + '"><a class="pv" href="' + esc(m.url) + '" target="_blank" rel="noopener">' +
      (isImg(m) ? '<img loading="lazy" alt="" src="' + thumbUrl(m.driveId) + '" data-drive="' + esc(m.id) + '">' : icon(matIcon(m))) + '</a>' +
      '<div class="mi"><b>' + esc(m.title) + '</b><span class="chip">' + esc(t('mat.tag.' + m.tag)) + '</span>' + (m.note ? '<span class="muted">' + esc(m.note) + '</span>' : '') +
      '<span class="muted tiny">' + (m.kind === 'file' ? fmtSize(m.size) + ' · ' : '') + esc(LAB.date(m.created)) + '</span>' +
      '<div class="row" style="gap:6px;margin-top:auto"><a class="btn sm" href="' + esc(m.url) + '" target="_blank" rel="noopener">' + icon(m.kind === 'link' ? 'link' : 'eye') + esc(t('common.open')) + '</a>' + (canDel ? '<button class="btn sm danger" data-mdel="' + esc(m.id) + '">' + icon('trash') + '</button>' : '') + '</div></div></div>';
  }
  function compressImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 900 * 1024) { resolve(file); return; }
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1800, sc = Math.min(1, max / Math.max(img.width, img.height));
        var cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { if (b && b.size < file.size) { b.name = file.name.replace(/\.\w+$/, '') + '.jpg'; resolve(b); } else resolve(file); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  function toB64(blob) {
    return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1] || ''); }; fr.onerror = rej; fr.readAsDataURL(blob); });
  }

  /* ============ График данных ============ */
  function niceTicks(min, max, n) {
    if (min === max) { max = min + 1; }
    var span = max - min, step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var a = Math.floor(min / step) * step, b = Math.ceil(max / step) * step, out = [];
    for (var v = a; v <= b + step / 2; v += step) out.push(Math.round(v / step) * step);
    return out;
  }
  function chartSvg(tb, xi, yi) {
    var pts = [];
    tb.rows.forEach(function (r) { var x = toNum(r[xi]), y = toNum(r[yi]); if (!isNaN(x) && !isNaN(y)) pts.push([x, y]); });
    if (pts.length < 2) return null;
    pts.sort(function (a, b) { return a[0] - b[0]; });
    var W = 600, H = 320, m = { l: 58, r: 20, t: 16, b: 52 };
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var xt = niceTicks(Math.min.apply(0, xs), Math.max.apply(0, xs), 6), yt = niceTicks(Math.min(0, Math.min.apply(0, ys)), Math.max.apply(0, ys), 5);
    var x0 = xt[0], x1 = xt[xt.length - 1], y0 = yt[0], y1 = yt[yt.length - 1];
    function X(v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); }
    function f(v) { return R.fmt(v); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(tb.cols[yi] + ' / ' + tb.cols[xi]) + '">';
    yt.forEach(function (v) { s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)" stroke-width="1"/><text x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + f(v) + '</text>'; });
    xt.forEach(function (v) { s += '<text x="' + X(v) + '" y="' + (H - m.b + 18) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + f(v) + '</text><line x1="' + X(v) + '" x2="' + X(v) + '" y1="' + (H - m.b) + '" y2="' + (H - m.b + 4) + '" stroke="var(--faint)"/>'; });
    s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (H - m.b) + '" y2="' + (H - m.b) + '" stroke="var(--faint)" stroke-width="1.5"/>';
    s += '<text x="' + ((m.l + W - m.r) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text)">' + esc(tb.cols[xi]) + '</text>';
    s += '<text transform="translate(14 ' + ((m.t + H - m.b) / 2) + ') rotate(-90)" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text)">' + esc(tb.cols[yi]) + '</text>';
    s += '<polyline fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" points="' + pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '"/>';
    pts.forEach(function (p) {
      s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="5" fill="var(--accent)" stroke="var(--bg-soft)" stroke-width="2"><title>' + esc(tb.cols[xi]) + ': ' + f(p[0]) + '; ' + esc(tb.cols[yi]) + ': ' + f(p[1]) + '</title></circle>';
      s += '<circle class="hit" data-tip="' + esc(f(p[0]) + ' ; ' + f(p[1])) + '" cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="14" fill="transparent"/>';
    });
    return s + '</svg><div class="tip"></div>';
  }
  function bindChart(host) {
    var tip = host.querySelector('.tip'); if (!tip) return;
    host.querySelectorAll('.hit').forEach(function (c) {
      c.addEventListener('pointerenter', function () {
        var r = host.getBoundingClientRect(), b = c.getBoundingClientRect();
        tip.textContent = c.getAttribute('data-tip'); tip.style.display = 'block';
        tip.style.left = (b.left + b.width / 2 - r.left) + 'px'; tip.style.top = (b.top + b.height / 2 - r.top) + 'px';
      });
      c.addEventListener('pointerleave', function () { tip.style.display = 'none'; });
    });
  }

  /* ============ Страница проекта ============ */
  var FLD = {
    c1: [['problem', 4], ['question', 2], ['relevance', 4]],
    c2: [['aim', 3], ['tasks', 5], ['hypothesis', 3], ['stages', 4]],
    c3: [['methods', 6]],
    c6: [['conclusions', 5], ['significance', 3], ['limits', 3], ['next', 3], ['reflection', 4]],
    c7: [['pitch', 7]],
    c8: [['contribution', 4]]
  };

  LAB.pages.project = function (args, box) {
    var id = args[0];
    if (!LAB.state.user) { LAB.needLogin(box); return; }
    return LAB.api('projectGet', { id: id }).then(function (d) { return projectView(box, d); }).catch(function (e) {
      box.innerHTML = '<div class="empty">' + icon('alert') + ' ' + esc(LAB.errMsg(e)) + '<br><br><a class="btn" href="#/home">' + esc(t('nav.home')) + '</a></div>';
    });
  };

  function projectView(box, d) {
    var me = LAB.state.user, meta = d.project;
    var P = { meta: meta, data: mergeData(safeParse(d.data)), mats: d.materials || [], circs: d.circuits || [], evals: d.evals || [], result: d.result || null };
    var owner = me.role === 'student' && meta.userId === me.id;
    var staff = LAB.isStaff() && !owner;
    var readonly = !owner;
    var sessKey = 'psec_' + meta.id;
    var active = LAB.session.get(sessKey, 'ov');
    var dirty = false, saving = false, saveTimer = null, uploading = '';
    var sections = ['ov', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'mat'];

    function safeParse(s) { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } }

    /* ---- сохранение ---- */
    function payload(statusOverride) {
      var rd = readiness(P.data, P.mats, P.circs);
      return { project: { id: meta.id, title: meta.title, section: meta.section, template: meta.template, status: statusOverride || meta.status, public: !!meta.public, ready: ct().criteria.map(function (c) { return rd[c.id].pct; }).join(','), data: JSON.stringify(P.data) } };
    }
    function setState(k) {
      var el = box.querySelector('#savestate'); if (!el) return;
      el.className = 'savestate ' + (k === 'saved' ? 'ok' : k === 'err' ? 'bad' : '');
      el.textContent = t('proj.save.' + k);
    }
    function saveNow(status) {
      if (readonly) return Promise.resolve();
      clearTimeout(saveTimer);
      saving = true; setState('saving');
      return LAB.api('projectSave', payload(status)).then(function () {
        dirty = false; saving = false; if (status) meta.status = status; setState('saved');
      }).catch(function (e) { saving = false; setState('err'); LAB.fail(e); throw e; });
    }
    function saveSoon() {
      if (readonly) return;
      dirty = true; setState('dirty');
      clearTimeout(saveTimer); saveTimer = setTimeout(function () { saveNow().catch(function () {}); }, 1600);
    }

    /* ---- построение ---- */
    function head() {
      return '<div class="crumbs"><a href="#/' + (owner ? 'my' : (staff ? 'staff' : 'gallery')) + '">' + esc(t(owner ? 'nav.my' : (staff ? 'nav.staff' : 'nav.gallery'))) + '</a></div>' +
        '<div class="pagehead"><div><h1 style="font-size:clamp(1.5rem,3.4vw,2.2rem)">' + esc(meta.title) + '</h1>' +
        '<p class="muted" style="margin:6px 0 0">' + (meta.name ? icon('user') + ' ' + esc(meta.name) + (meta.cls && meta.cls !== '-' ? ' · ' + esc(meta.cls) : '') + ' · ' : '') + esc(meta.section || '') + '</p></div>' +
        '<div class="row">' + (owner ? '<span id="savestate" class="savestate"></span>' : '') +
        '<button class="btn sm" data-a="report">' + icon('download') + esc(t('proj.report')) + '</button></div></div>';
    }
    function stepper() {
      var rd = readiness(P.data, P.mats, P.circs);
      var out = '<div class="stepper" role="tablist">';
      sections.forEach(function (s, i) {
        var label, sub, pct = null;
        if (s === 'ov') { label = t('proj.s.ov'); sub = owner ? t('proj.ready') + ' ' + rd.total + '%' : ''; pct = rd.total; }
        else if (s === 'mat') { label = t('proj.s.mat'); sub = P.mats.length + P.circs.length + ''; }
        else { var c = ct().criteria.filter(function (x) { return x.id === s; })[0]; label = L(c.t); sub = c.max + ' ' + t('crit.pts') + (owner ? ' · ' + rd[s].pct + '%' : ''); pct = rd[s].pct; }
        var n = s === 'ov' ? '★' : s === 'mat' ? '⌂' : s.slice(1);
        out += '<button data-sec="' + s + '" class="' + (active === s ? 'on' : '') + '" role="tab"><span class="ring ' + (pct === 100 ? 'full' : '') + '" style="--p:' + (pct || 0) + '" data-n="' + n + '"></span><span class="st"><span style="overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(label) + '</span><small>' + esc(sub) + '</small></span></button>';
      });
      return out + '</div>';
    }

    function fieldLabel(path) { return t('f.' + path); }
    function ta(path, rows) {
      var v = getPath(P.data, path) || '';
      return '<label class="field"><span>' + esc(fieldLabel(path)) + '</span><textarea rows="' + rows + '" data-f="' + path + '" placeholder="' + esc(t('f.' + path + '.ph')) + '">' + esc(v) + '</textarea></label>';
    }
    var stepHtml = '', lastChecks = '';
    function checksBox(cid) {
      var rd = readiness(P.data, P.mats, P.circs)[cid];
      return (lastChecks = '<div class="checks"><div class="lbl">' + esc(t('proj.checklist')) + '</div>' + rd.checks.map(function (c) { return '<div class="req ' + (c[1] ? 'ok' : '') + '"><span class="m">' + (c[1] ? icon('check') : '') + '</span><span>' + esc(t('chk.' + cid + '.' + c[0])) + '</span></div>'; }).join('') + '</div>');
    }
    function critHead(cid) {
      var c = ct().criteria.filter(function (x) { return x.id === cid; })[0];
      return '<h2><span class="chip amb pts">' + c.max + ' ' + esc(t('crit.pts')) + '</span>' + esc(L(c.t)) + '</h2><div class="crit-desc">' + esc(L(c.d)) + '</div>';
    }

    function secOv() {
      var rd = readiness(P.data, P.mats, P.circs);
      var s = '<h2>' + esc(t('proj.s.ov')) + '</h2>';
      s += '<label class="field"><span>' + esc(t('proj.title')) + '</span><input type="text" maxlength="120" data-m="title" value="' + esc(meta.title) + '"></label>';
      s += '<label class="field"><span>' + esc(t('proj.section')) + '</span><select data-m="section">' + ct().sections.map(function (x) { var v = L(x); return '<option value="' + esc(v) + '"' + (v === meta.section ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + (ct().sections.some(function (x) { return L(x) === meta.section; }) ? '' : '<option selected>' + esc(meta.section) + '</option>') + '</select></label>';
      s += '<div class="grid c2" style="margin-bottom:14px"><div class="card flat"><div class="lbl">' + esc(t('proj.status')) + '</div><span class="chip ' + (meta.status === 'submitted' ? 'good' : '') + '">' + esc(t('proj.st.' + meta.status)) + '</span>' +
        '<p class="hint" style="margin-top:8px">' + esc(t('proj.submit.hint')) + '</p><button class="btn ' + (meta.status === 'submitted' ? '' : 'primary') + '" data-a="submit">' + icon('flag') + esc(meta.status === 'submitted' ? t('proj.unsubmit') : t('proj.submit')) + '</button></div>' +
        '<div class="card flat"><div class="lbl">' + esc(t('proj.gallery')) + '</div><label class="check"><input type="checkbox" data-m="public"' + (meta.public ? ' checked' : '') + '><span>' + esc(t('proj.gallery.check')) + '</span></label><p class="hint">' + esc(t('proj.gallery.hint')) + '</p></div></div>';
      s += '<h3>' + esc(t('proj.ready.title')) + ' — ' + rd.total + '%</h3><p class="muted small">' + esc(t('proj.ready.hint')) + '</p>';
      ct().criteria.forEach(function (c, i) { s += '<div class="row between small" style="margin-top:8px"><span><b>' + (i + 1) + '.</b> ' + esc(L(c.t)) + '</span><b>' + rd[c.id].pct + '%</b></div><div class="bar ' + (rd[c.id].pct === 100 ? 'good' : '') + '"><i style="width:' + rd[c.id].pct + '%"></i></div>'; });
      if (P.result) s += resultCard();
      return s;
    }
    function resultCard() {
      var r = P.result, tot = r.avg, a = LAB.awardFor(tot);
      return '<div class="card" style="margin-top:22px;border-color:var(--amber)"><h3>' + icon('award') + ' ' + esc(t('proj.result')) + '</h3><div class="row"><div class="total">' + LAB.fmt(tot) + '</div><span class="muted">/ 100 · ' + esc(t('proj.result.jurors', { n: r.n })) + '</span>' + (a ? '<span class="award ' + a.id + '">' + esc(L(a.t)) + '</span>' : '') + '</div>' +
        '<div class="grid c2" style="margin-top:10px">' + ct().criteria.map(function (c, i) { return '<div class="row between small" style="flex-wrap:nowrap;align-items:baseline;gap:12px"><span>' + (i + 1) + '. ' + esc(L(c.t)) + '</span><b style="white-space:nowrap">' + LAB.fmt(r.crit[c.id]) + ' / ' + c.max + '</b></div>'; }).join('') + '</div>' +
        (r.comments && r.comments.length ? '<h4 style="margin-top:12px">' + esc(t('proj.result.comments')) + '</h4>' + r.comments.map(function (c) { return '<div class="expl">' + esc(c) + '</div>'; }).join('') : '') + '</div>';
    }

    function listRows(kind) {
      var d = P.data, s = '';
      if (kind === 'plan') {
        d.c3.plan.forEach(function (x, i) { s += '<div class="listrow plan"><input type="text" data-f="c3.plan.' + i + '.t" value="' + esc(x.t) + '" placeholder="' + esc(t('f.c3.plan.ph')) + '"><input type="date" data-f="c3.plan.' + i + '.d" value="' + esc(x.d || '') + '"><label class="check" style="margin:8px 0 0" title="' + esc(t('common.done')) + '"><input type="checkbox" data-f="c3.plan.' + i + '.done"' + (x.done ? ' checked' : '') + '></label><button class="btn sm danger" data-rm="c3.plan.' + i + '">' + icon('x') + '</button></div>'; });
        s += '<button class="btn sm" data-add="c3.plan">' + icon('plus') + esc(t('proj.add')) + '</button>';
      } else if (kind === 'diary') {
        d.c5.diary.forEach(function (x, i) { s += '<div class="listrow diary"><input type="date" data-f="c5.diary.' + i + '.d" value="' + esc(x.d || '') + '"><textarea rows="2" data-f="c5.diary.' + i + '.t" placeholder="' + esc(t('f.c5.diary.ph')) + '">' + esc(x.t) + '</textarea><button class="btn sm danger" data-rm="c5.diary.' + i + '">' + icon('x') + '</button></div>'; });
        s += '<button class="btn sm" data-add="c5.diary">' + icon('plus') + esc(t('proj.add.entry')) + '</button>';
      } else if (kind === 'sources') {
        d.c5.sources.forEach(function (x, i) {
          s += '<div class="listrow src"><input type="text" data-f="c5.sources.' + i + '.t" value="' + esc(x.t) + '" placeholder="' + esc(t('f.c5.src.title')) + '"><input type="url" data-f="c5.sources.' + i + '.u" value="' + esc(x.u || '') + '" placeholder="https://…">' +
            '<select data-f="c5.sources.' + i + '.k">' + ['book', 'site', 'article', 'video', 'other'].map(function (k) { return '<option value="' + k + '"' + (x.k === k ? ' selected' : '') + '>' + esc(t('src.' + k)) + '</option>'; }).join('') + '</select><button class="btn sm danger" data-rm="c5.sources.' + i + '">' + icon('x') + '</button></div>';
        });
        s += '<button class="btn sm" data-add="c5.sources">' + icon('plus') + esc(t('proj.add.source')) + '</button>';
      } else if (kind === 'qa') {
        d.c8.qa.forEach(function (x, i) { s += '<div class="listrow qa"><textarea rows="2" data-f="c8.qa.' + i + '.q" placeholder="' + esc(t('f.c8.q.ph')) + '">' + esc(x.q) + '</textarea><textarea rows="2" data-f="c8.qa.' + i + '.a" placeholder="' + esc(t('f.c8.a.ph')) + '">' + esc(x.a) + '</textarea><button class="btn sm danger" data-rm="c8.qa.' + i + '">' + icon('x') + '</button></div>'; });
        s += '<button class="btn sm" data-add="c8.qa">' + icon('plus') + esc(t('proj.add.qa')) + '</button>';
      }
      return s;
    }

    function tableEditor() {
      var tb = P.data.c4.table, s = '<div class="tblwrap"><table class="dtable"><thead><tr>';
      tb.cols.forEach(function (c, i) { s += '<th><input type="text" data-f="c4.table.cols.' + i + '" value="' + esc(c) + '" aria-label="' + esc(t('proj.col')) + '"></th>'; });
      s += '<th style="width:44px"></th></tr></thead><tbody>';
      tb.rows.forEach(function (r, ri) {
        s += '<tr>';
        tb.cols.forEach(function (c, ci) { s += '<td><input type="text" inputmode="decimal" data-f="c4.table.rows.' + ri + '.' + ci + '" value="' + esc(r[ci] == null ? '' : r[ci]) + '"></td>'; });
        s += '<td class="center"><button class="btn sm danger" data-rm="c4.table.rows.' + ri + '" title="' + esc(t('proj.rm.row')) + '">' + icon('x') + '</button></td></tr>';
      });
      s += '</tbody></table></div><div class="row" style="margin-top:8px"><button class="btn sm" data-add="c4.row">' + icon('plus') + esc(t('proj.add.row')) + '</button><button class="btn sm" data-add="c4.col">' + icon('plus') + esc(t('proj.add.col')) + '</button>' + (tb.cols.length > 1 ? '<button class="btn sm danger" data-rm="c4.col">' + esc(t('proj.rm.col')) + '</button>' : '') + '</div>';
      return s;
    }
    function chartBlock() {
      var tb = P.data.c4.table, cx = Math.min(P.data.c4.cx || 0, tb.cols.length - 1), cy = Math.min(P.data.c4.cy == null ? 1 : P.data.c4.cy, tb.cols.length - 1);
      var opts = function (sel) { return tb.cols.map(function (c, i) { return '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join(''); };
      var svg = tb.cols.length > 1 ? chartSvg(tb, cx, cy) : null;
      return '<div class="row" style="margin:12px 0 6px"><label class="lbl" style="margin:0">' + esc(t('proj.chart.x')) + ' <select data-cx="1" style="width:auto">' + opts(cx) + '</select></label><label class="lbl" style="margin:0">' + esc(t('proj.chart.y')) + ' <select data-cy="1" style="width:auto">' + opts(cy) + '</select></label></div>' +
        '<div class="chartbox" id="chart">' + (svg || '<p class="muted small center" style="padding:24px 8px">' + esc(t('proj.chart.empty')) + '</p>') + '</div>';
    }

    function matPanel(defTag, tags) {
      var list = P.mats.filter(function (m) { return !tags || tags.indexOf(m.tag) >= 0; });
      var s = '<div class="mgrid" style="margin-bottom:12px">' + list.map(function (m) { return matCard(m, owner); }).join('') + '</div>';
      if (!list.length) s = '<p class="muted small">' + esc(t('mat.none')) + '</p>';
      if (owner) {
        s += '<div class="card flat" style="padding:12px"><div class="row" style="margin-bottom:10px"><label class="lbl" style="margin:0">' + esc(t('mat.tag')) + ' <select data-mtag style="width:auto">' + TAGS.map(function (g) { return '<option value="' + g + '"' + (g === defTag ? ' selected' : '') + '>' + esc(t('mat.tag.' + g)) + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="drop" data-drop tabindex="0">' + icon('upload') + ' ' + esc(t('mat.drop')) + '<div class="hint">' + esc(t('mat.limit', { mb: LAB.cfg.MAX_FILE_MB || 10 })) + '</div><input type="file" multiple hidden data-file></div>' +
          '<div class="small muted" data-upstate style="margin:8px 0">' + esc(uploading) + '</div>' +
          '<details><summary class="small" style="cursor:pointer;color:var(--accent)">' + icon('link') + ' ' + esc(t('mat.addlink')) + '</summary><div class="grid c2" style="margin-top:10px"><input type="text" data-lt placeholder="' + esc(t('mat.link.title')) + '"><input type="url" data-lu placeholder="https://…"></div><button class="btn sm primary" data-addlink style="margin-top:8px">' + icon('plus') + esc(t('mat.addlink.go')) + '</button></details></div>';
      }
      return s;
    }
    function circPanel() {
      var s = '<h3 style="margin-top:20px">' + icon('chip') + ' ' + esc(t('proj.circuits')) + '</h3>';
      if (!P.circs.length) s += '<p class="muted small">' + esc(t('proj.circuits.none')) + '</p>';
      else s += '<div class="grid auto">' + P.circs.map(function (c) { return LAB.circCard(c, {}); }).join('') + '</div>';
      if (owner) s += '<div class="row" style="margin-top:10px"><a class="btn sm" href="#/sim/tasks">' + icon('chip') + esc(t('sim.tab.tasks')) + '</a><button class="btn sm" data-a="attach">' + icon('link') + esc(t('proj.circuits.attach')) + '</button></div>';
      return s;
    }

    function secCrit(cid) {
      var d = P.data, s = critHead(cid);
      if (cid === 'c1' || cid === 'c2' || cid === 'c6' || cid === 'c8' && false) {
        FLD[cid].forEach(function (f) {
          if (cid === 'c2' && f[0] === 'hypothesis') { s += ta('c2.hypothesis', 3) + '<label class="check" style="margin-top:-8px"><input type="checkbox" data-f="c2.noHyp"' + (d.c2.noHyp ? ' checked' : '') + '><span>' + esc(t('f.c2.noHyp')) + '</span></label>'; }
          else s += ta(cid + '.' + f[0], f[1]);
        });
      } else if (cid === 'c3') {
        s += ta('c3.methods', 6) + '<div class="lbl">' + esc(t('f.c3.plan')) + '</div>' + listRows('plan') + '<div class="lbl" style="margin-top:14px">' + esc(t('f.c3.safety')) + '</div><textarea rows="4" data-f="c3.safety" placeholder="' + esc(t('f.c3.safety.ph')) + '">' + esc(d.c3.safety) + '</textarea>' +
          '<div style="margin:10px 0">' + [0, 1, 2, 3].map(function (i) { return '<label class="check"><input type="checkbox" data-f="c3.ack.' + i + '"' + (d.c3.ack[i] ? ' checked' : '') + '><span>' + esc(t('f.c3.ack' + (i + 1))) + '</span></label>'; }).join('') + '</div>' + ta('c3.ethics', 3);
      } else if (cid === 'c4') {
        s += '<div class="lbl">' + esc(t('f.c4.table')) + '</div>' + tableEditor() + chartBlock() + '<div style="height:12px"></div>' + ta('c4.analysis', 6) + ta('c4.result', 4) +
          '<h3>' + icon('image') + ' ' + esc(t('f.c4.evidence')) + '</h3>' + matPanel('photo', ['photo', 'data', 'video']) + circPanel();
      } else if (cid === 'c5') {
        s += '<div class="lbl">' + esc(t('f.c5.diary')) + '</div><p class="hint" style="margin-top:0">' + esc(t('f.c5.diary.h')) + '</p>' + listRows('diary') +
          '<div class="lbl" style="margin-top:16px">' + esc(t('f.c5.sources')) + '</div><p class="hint" style="margin-top:0">' + esc(t('f.c5.sources.h')) + '</p>' + listRows('sources') +
          '<div style="height:12px"></div>' + ta('c5.help', 2) +
          '<div class="lbl">' + esc(t('f.c5.ai')) + '</div><p class="hint" style="margin-top:0">' + esc(t('f.c5.ai.h')) + '</p>' +
          '<label class="check"><input type="radio" name="aiuse" data-f="c5.ai.used" value="no"' + (d.c5.ai.used === 'no' ? ' checked' : '') + '><span>' + esc(t('f.c5.ai.no')) + '</span></label>' +
          '<label class="check"><input type="radio" name="aiuse" data-f="c5.ai.used" value="yes"' + (d.c5.ai.used === 'yes' ? ' checked' : '') + '><span>' + esc(t('f.c5.ai.yes')) + '</span></label>' +
          '<textarea rows="3" data-f="c5.ai.how" placeholder="' + esc(t('f.c5.ai.how.ph')) + '"' + (d.c5.ai.used === 'yes' ? '' : ' style="display:none"') + '>' + esc(d.c5.ai.how) + '</textarea>';
      } else if (cid === 'c6') {
        FLD.c6.forEach(function (f) { s += ta('c6.' + f[0], f[1]); });
      } else if (cid === 'c7') {
        s += ta('c7.pitch', 7) + '<div style="margin:6px 0 14px">' + [0, 1].map(function (i) { return '<label class="check"><input type="checkbox" data-f="c7.ack.' + i + '"' + (d.c7.ack[i] ? ' checked' : '') + '><span>' + esc(t('f.c7.ack' + (i + 1))) + '</span></label>'; }).join('') + '</div>' +
          '<h3>' + icon('file') + ' ' + esc(t('f.c7.files')) + '</h3><p class="hint" style="margin-top:0">' + esc(t('f.c7.files.h')) + '</p>' + matPanel('presentation', ['presentation', 'video']);
      } else if (cid === 'c8') {
        s += '<div class="lbl">' + esc(t('f.c8.qa')) + '</div><p class="hint" style="margin-top:0">' + esc(t('f.c8.qa.h')) + '</p>' + listRows('qa') + '<div style="height:14px"></div>' + ta('c8.contribution', 4);
      }
      return s + checksBox(cid);
    }
    function secMat() {
      return '<h2>' + esc(t('proj.s.mat')) + '</h2><p class="muted">' + esc(t('proj.mat.lead')) + '</p>' + matPanel('doc', null) + circPanel();
    }

    /* ---- режим только чтения (учитель / жюри / галерея / экспорт) ---- */
    function roVal(v) { v = String(v == null ? '' : v).trim(); return v ? '<div class="v">' + esc(v) + '</div>' : '<div class="v empty">—</div>'; }
    function roHtml(forExport) {
      var d = P.data, s = '<div class="ro">';
      ct().criteria.forEach(function (c, i) {
        s += '<h2 style="margin-top:26px"><span class="chip amb pts">' + c.max + ' ' + esc(t('crit.pts')) + '</span>' + (i + 1) + '. ' + esc(L(c.t)) + '</h2>';
        var k = c.id;
        if (k === 'c1' || k === 'c2' || k === 'c6') {
          FLD[k].forEach(function (f) { s += '<h4>' + esc(fieldLabel(k + '.' + f[0])) + '</h4>' + roVal(d[k][f[0]]); });
          if (k === 'c2' && d.c2.noHyp) s += '<div class="chip">' + esc(t('f.c2.noHyp')) + '</div>';
        } else if (k === 'c3') {
          s += '<h4>' + esc(fieldLabel('c3.methods')) + '</h4>' + roVal(d.c3.methods) + '<h4>' + esc(t('f.c3.plan')) + '</h4>' + roVal(d.c3.plan.map(function (x) { return (x.done ? '☑ ' : '☐ ') + x.t + (x.d ? ' (' + x.d + ')' : ''); }).join('\n')) +
            '<h4>' + esc(t('f.c3.safety')) + '</h4>' + roVal(d.c3.safety) + '<div>' + d.c3.ack.map(function (a, i) { return '<div class="small">' + (a ? '☑' : '☐') + ' ' + esc(t('f.c3.ack' + (i + 1))) + '</div>'; }).join('') + '</div><h4>' + esc(fieldLabel('c3.ethics')) + '</h4>' + roVal(d.c3.ethics);
        } else if (k === 'c4') {
          var tb = d.c4.table;
          s += '<h4>' + esc(t('f.c4.table')) + '</h4><div class="tblwrap"><table class="tbl"><thead><tr>' + tb.cols.map(function (c2) { return '<th>' + esc(c2) + '</th>'; }).join('') + '</tr></thead><tbody>' + tb.rows.map(function (r) { return '<tr>' + tb.cols.map(function (c2, ci) { return '<td>' + esc(r[ci] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
          var cx = Math.min(d.c4.cx || 0, tb.cols.length - 1), cy = Math.min(d.c4.cy == null ? 1 : d.c4.cy, tb.cols.length - 1), svg = tb.cols.length > 1 ? chartSvg(tb, cx, cy) : null;
          if (svg) s += '<div class="chartbox" style="margin-top:10px;max-width:640px">' + svg + '</div>';
          s += '<h4>' + esc(fieldLabel('c4.analysis')) + '</h4>' + roVal(d.c4.analysis) + '<h4>' + esc(fieldLabel('c4.result')) + '</h4>' + roVal(d.c4.result) + '<h4>' + esc(t('f.c4.evidence')) + '</h4><div class="mgrid">' + P.mats.filter(function (m) { return ['photo', 'data', 'video'].indexOf(m.tag) >= 0; }).map(function (m) { return matCard(m, false); }).join('') + '</div>' + roCircs();
        } else if (k === 'c5') {
          s += '<h4>' + esc(t('f.c5.diary')) + '</h4>' + roVal(d.c5.diary.map(function (x) { return (x.d || '—') + ': ' + x.t; }).join('\n')) + '<h4>' + esc(t('f.c5.sources')) + '</h4>' +
            (d.c5.sources.length ? '<div class="v">' + d.c5.sources.map(function (x) { return esc(x.t) + (x.u && /^https?:\/\//i.test(x.u) ? ' — <a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.u) + '</a>' : '') + ' <span class="muted">(' + esc(t('src.' + (x.k || 'other'))) + ')</span>'; }).join('<br>') + '</div>' : roVal('')) +
            '<h4>' + esc(fieldLabel('c5.help')) + '</h4>' + roVal(d.c5.help) + '<h4>' + esc(t('f.c5.ai')) + '</h4>' + roVal((d.c5.ai.used === 'no' ? t('f.c5.ai.no') : d.c5.ai.used === 'yes' ? t('f.c5.ai.yes') + '\n' + d.c5.ai.how : ''));
        } else if (k === 'c7') {
          s += '<h4>' + esc(fieldLabel('c7.pitch')) + '</h4>' + roVal(d.c7.pitch) + '<div>' + d.c7.ack.map(function (a, i) { return '<div class="small">' + (a ? '☑' : '☐') + ' ' + esc(t('f.c7.ack' + (i + 1))) + '</div>'; }).join('') + '</div><h4>' + esc(t('f.c7.files')) + '</h4><div class="mgrid">' + P.mats.filter(function (m) { return ['presentation', 'video'].indexOf(m.tag) >= 0; }).map(function (m) { return matCard(m, false); }).join('') + '</div>';
        } else if (k === 'c8') {
          s += '<h4>' + esc(t('f.c8.qa')) + '</h4>' + roVal(d.c8.qa.map(function (x) { return 'Q: ' + x.q + '\nA: ' + x.a; }).join('\n\n')) + '<h4>' + esc(fieldLabel('c8.contribution')) + '</h4>' + roVal(d.c8.contribution);
        }
      });
      var other = P.mats.filter(function (m) { return ['photo', 'data', 'video', 'presentation'].indexOf(m.tag) < 0; });
      s += '<h2 style="margin-top:26px">' + esc(t('proj.s.mat')) + '</h2><div class="mgrid">' + (other.length ? other.map(function (m) { return matCard(m, false); }).join('') : '<span class="muted small">—</span>') + '</div></div>';
      return s;
    }
    function roCircs() {
      if (!P.circs.length) return '';
      return '<h4>' + esc(t('proj.circuits')) + '</h4><div class="grid auto">' + P.circs.map(function (c) { return LAB.circCard(c, {}); }).join('') + '</div>';
    }

    /* ---- панель оценки (жюри / учитель) ---- */
    function evalPanel() {
      var mine = P.evals.filter(function (e) { return e.jurorId === me.id; })[0], sc = (mine && mine.scores) || {};
      var min = (LAB.state.settings && LAB.state.settings.minJurors) || 3;
      var s = '<div class="card evalpanel"><h3>' + icon('award') + ' ' + esc(t('eval.title')) + '</h3><p class="muted small">' + esc(t('eval.hint')) + '</p>';
      ct().criteria.forEach(function (c, i) {
        if (c.id === 'c8') {
          c.sub.forEach(function (sb) { s += '<div class="evrow"><span>' + (i + 1) + sb[0] + '. ' + esc(L(sb[1])) + ' <span class="muted">(≤5)</span></span><input type="number" min="0" max="5" step="0.5" data-sc="c8' + sb[0] + '" value="' + (sc['c8' + sb[0]] != null ? sc['c8' + sb[0]] : '') + '"></div>'; });
        } else s += '<div class="evrow"><span>' + (i + 1) + '. ' + esc(L(c.t)) + ' <span class="muted">(≤' + c.max + ')</span></span><input type="number" min="0" max="' + c.max + '" step="0.5" data-sc="' + c.id + '" value="' + (sc[c.id] != null ? sc[c.id] : '') + '"></div>';
      });
      s += '<div class="row between" style="margin:10px 0"><span class="muted">' + esc(t('eval.total')) + '</span><span class="total" id="evtot">0</span></div><div id="evaw"></div>' +
        '<label class="field"><span>' + esc(t('eval.comment')) + '</span><textarea rows="3" id="evcm" maxlength="1500">' + esc((mine && mine.comment) || '') + '</textarea></label><div class="err" id="everr"></div>' +
        '<button class="btn primary" style="width:100%" data-a="evsave">' + icon('save') + esc(t('eval.save')) + '</button>';
      if (LAB.isTeacher()) {
        var others = P.evals;
        s += '<h4 style="margin-top:16px">' + esc(t('eval.all')) + ' (' + others.length + '/' + min + ')</h4>' + (others.length ? others.map(function (e) { return '<div class="row between small" style="border-top:1px solid var(--line);padding:6px 0"><span>' + esc(e.jurorName) + '</span><b>' + LAB.fmt(e.total) + '</b></div>'; }).join('') + '<div class="row between" style="border-top:2px solid var(--line);padding-top:6px"><b>' + esc(t('eval.avg')) + '</b><b>' + LAB.fmt(others.reduce(function (a, e) { return a + e.total; }, 0) / others.length) + '</b></div>' : '<p class="muted small">—</p>');
      }
      return s + '</div>';
    }
    function evTotal() {
      var tot = 0;
      box.querySelectorAll('[data-sc]').forEach(function (i) { var v = parseFloat(i.value); if (isFinite(v)) tot += Math.max(0, Math.min(v, parseFloat(i.max))); });
      tot = Math.round(tot * 10) / 10;
      var el = box.querySelector('#evtot'); if (!el) return tot;
      el.textContent = LAB.fmt(tot);
      var a = LAB.awardFor(tot);
      box.querySelector('#evaw').innerHTML = a ? '<span class="award ' + a.id + '">' + esc(L(a.t)) + '</span>' : '';
      return tot;
    }

    /* ---- отрисовка ---- */
    function render() {
      var main;
      if (readonly) {
        main = '<div class="card">' + roHtml() + '</div>';
        box.innerHTML = head() + (staff ? '<div class="pgrid" style="grid-template-columns:minmax(0,1fr) 340px">' + main + '<aside>' + evalPanel() + '</aside></div>' : main);
        evTotal();
        return;
      }
      stepHtml = stepper();
      box.innerHTML = head() + '<div class="pgrid">' + stepHtml + '<div class="card sect" id="sect">' + sectionHtml() + '</div></div>';
      setState(dirty ? 'dirty' : 'saved'); if (!dirty) box.querySelector('#savestate').textContent = '';
      afterSection();
    }
    function sectionHtml() { return active === 'ov' ? secOv() : active === 'mat' ? secMat() : secCrit(active); }
    function afterSection() { var ch = box.querySelector('#chart'); if (ch) bindChart(ch); }
    function renderSection() {
      var sect = box.querySelector('#sect'); if (!sect) return;
      var y = window.scrollY; sect.innerHTML = sectionHtml(); afterSection(); window.scrollTo(0, y);
      stepHtml = stepper(); box.querySelector('.stepper').outerHTML = stepHtml;
    }
    function refreshLight() {
      // обновить чек-лист, кольца и график без потери фокуса
      // заменяем DOM только если содержимое изменилось: иначе клик по кнопке теряется, когда blur → change перерисовывает шаги
      var st = box.querySelector('.stepper'); if (st) { var sh = stepper(); if (sh !== stepHtml) { stepHtml = sh; st.outerHTML = sh; } }
      var cb = box.querySelector('.checks'); if (cb && /^c\d$/.test(active)) { var prev = lastChecks, ch = checksBox(active); if (ch !== prev) cb.outerHTML = ch; }
      if (active === 'c4') { var ch = box.querySelector('#chart'); if (ch) { var tb = P.data.c4.table, cx = Math.min(P.data.c4.cx || 0, tb.cols.length - 1), cy = Math.min(P.data.c4.cy == null ? 1 : P.data.c4.cy, tb.cols.length - 1); var svg = tb.cols.length > 1 ? chartSvg(tb, cx, cy) : null; ch.innerHTML = svg || '<p class="muted small center" style="padding:24px 8px">' + esc(t('proj.chart.empty')) + '</p>'; bindChart(ch); } }
      if (active === 'ov') { /* прогресс на обзоре обновится при следующем открытии */ }
    }

    /* ---- события ---- */
    box.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-sec]'))) { active = b.getAttribute('data-sec'); LAB.session.set(sessKey, active); renderSection(); return; }
      if ((b = e.target.closest('[data-add]'))) { addItem(b.getAttribute('data-add')); return; }
      if ((b = e.target.closest('[data-rm]'))) { rmItem(b.getAttribute('data-rm')); return; }
      if ((b = e.target.closest('[data-mdel]'))) { delMat(b.getAttribute('data-mdel')); return; }
      if ((b = e.target.closest('[data-drop]'))) { if (!e.target.closest('input')) b.querySelector('[data-file]').click(); return; }
      if (e.target.closest('[data-addlink]')) { addLink(); return; }
      b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'submit') toggleSubmit();
      else if (a === 'report') exportReport();
      else if (a === 'attach') attachCircuit();
      else if (a === 'evsave') saveEval();
    });
    box.addEventListener('input', function (e) {
      var el = e.target;
      if (el.hasAttribute('data-sc')) { evTotal(); return; }
      if (el.hasAttribute('data-m')) return;
      var f = el.getAttribute && el.getAttribute('data-f'); if (!f) return;
      if (el.type === 'radio' || el.type === 'checkbox') return;
      setPath(P.data, f, el.value); saveSoon(); refreshLight();
    });
    box.addEventListener('change', function (e) {
      var el = e.target;
      if (el.hasAttribute('data-m')) {
        var k = el.getAttribute('data-m');
        if (k === 'public') meta.public = el.checked; else meta[k] = el.value.trim() || meta[k];
        if (k === 'title') { var h1 = box.querySelector('h1'); if (h1) h1.textContent = meta.title; }
        saveSoon(); return;
      }
      if (el.hasAttribute('data-cx')) { P.data.c4.cx = +el.value; saveSoon(); refreshLight(); return; }
      if (el.hasAttribute('data-cy')) { P.data.c4.cy = +el.value; saveSoon(); refreshLight(); return; }
      if (el.hasAttribute('data-file')) { handleFiles(el.files); el.value = ''; return; }
      var f = el.getAttribute && el.getAttribute('data-f'); if (!f) return;
      if (el.type === 'checkbox') { setPath(P.data, f, el.checked); saveSoon(); refreshLight(); }
      else if (el.type === 'radio') {
        setPath(P.data, f, el.value); saveSoon();
        var how = box.querySelector('[data-f="c5.ai.how"]'); if (how) how.style.display = P.data.c5.ai.used === 'yes' ? '' : 'none';
        refreshLight();
      } else { if (getPath(P.data, f) === el.value) return; setPath(P.data, f, el.value); saveSoon(); refreshLight(); }
    });
    box.addEventListener('dragover', function (e) { var d = e.target.closest('[data-drop]'); if (d) { e.preventDefault(); d.classList.add('over'); } });
    box.addEventListener('dragleave', function (e) { var d = e.target.closest('[data-drop]'); if (d) d.classList.remove('over'); });
    box.addEventListener('drop', function (e) { var d = e.target.closest('[data-drop]'); if (d) { e.preventDefault(); d.classList.remove('over'); handleFiles(e.dataTransfer.files); } });
    box.addEventListener('error', function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-drive') || img.dataset.fb) return;
      img.dataset.fb = '1';
      LAB.api('fileGet', { id: img.getAttribute('data-drive') }).then(function (r) { img.src = 'data:' + r.mime + ';base64,' + r.data; }).catch(function () { img.replaceWith(document.createRange().createContextualFragment(icon('image'))); });
    }, true);

    function addItem(what) {
      var d = P.data;
      if (what === 'c3.plan') d.c3.plan.push({ t: '', d: '', done: false });
      else if (what === 'c5.diary') d.c5.diary.push({ d: new Date().toISOString().slice(0, 10), t: '' });
      else if (what === 'c5.sources') d.c5.sources.push({ t: '', u: '', k: 'site' });
      else if (what === 'c8.qa') d.c8.qa.push({ q: '', a: '' });
      else if (what === 'c4.row') d.c4.table.rows.push(d.c4.table.cols.map(function () { return ''; }));
      else if (what === 'c4.col') { d.c4.table.cols.push(t('proj.col') + ' ' + (d.c4.table.cols.length + 1)); d.c4.table.rows.forEach(function (r) { r.push(''); }); }
      saveSoon(); renderSection();
    }
    function rmItem(path) {
      var d = P.data;
      if (path === 'c4.col') { d.c4.table.cols.pop(); d.c4.table.rows.forEach(function (r) { r.pop(); }); d.c4.cx = Math.min(d.c4.cx || 0, d.c4.table.cols.length - 1); d.c4.cy = Math.min(d.c4.cy == null ? 1 : d.c4.cy, d.c4.table.cols.length - 1); }
      else { var p = path.split('.'), idx = +p.pop(), arr = getPath(d, p.join('.')); arr.splice(idx, 1); }
      saveSoon(); renderSection();
    }

    function handleFiles(files) {
      if (!files || !files.length) return;
      var tag = (box.querySelector('[data-mtag]') || {}).value || 'other';
      var list = Array.prototype.slice.call(files), i = 0, maxMB = LAB.cfg.MAX_FILE_MB || 10;
      function status(msg) { uploading = msg; var el = box.querySelector('[data-upstate]'); if (el) el.textContent = msg; }
      function next() {
        if (i >= list.length) { status(''); renderSection(); return; }
        var f = list[i++];
        var ext = LAB.ext(f.name);
        if (EXT_OK.indexOf(ext) < 0) { LAB.toast(t('err.BAD_TYPE') + ': ' + f.name, 'bad'); next(); return; }
        status(t('mat.uploading', { i: i, n: list.length, name: f.name }));
        compressImage(f).then(function (blob) {
          if (blob.size > maxMB * 1048576) { LAB.toast(t('err.TOO_BIG_FILE') + ': ' + f.name, 'bad'); next(); return null; }
          return toB64(blob).then(function (b64) {
            return LAB.api('materialUpload', { projectId: meta.id, name: blob.name || f.name, data: b64, tag: tag, title: f.name });
          }).then(function (r) { P.mats.push(r.material); next(); });
        }).catch(function (e) { LAB.fail(e); next(); });
      }
      next();
    }
    function addLink() {
      var title = box.querySelector('[data-lt]').value.trim(), url = box.querySelector('[data-lu]').value.trim();
      var tag = (box.querySelector('[data-mtag]') || {}).value || 'other';
      if (!/^https?:\/\//i.test(url)) { LAB.toast(t('err.BAD_URL'), 'bad'); return; }
      LAB.api('materialLink', { projectId: meta.id, title: title || url, url: url, tag: tag }).then(function (r) { P.mats.push(r.material); renderSection(); LAB.toast(t('mat.added'), 'good'); }).catch(LAB.fail);
    }
    function delMat(mid) {
      LAB.confirm(t('mat.del.confirm')).then(function (y) {
        if (!y) return;
        LAB.api('materialDelete', { id: mid }).then(function () { P.mats = P.mats.filter(function (m) { return m.id !== mid; }); renderSection(); }).catch(LAB.fail);
      });
    }
    function attachCircuit() {
      LAB.api('circuitsList').then(function (r) {
        var free = r.circuits.filter(function (c) { return c.projectId !== meta.id; });
        if (!free.length) { LAB.toast(t('proj.circuits.nofree'), 'bad'); return; }
        var m = LAB.modal.open('<h3>' + esc(t('proj.circuits.attach')) + '</h3><div class="grid c2" style="max-height:60vh;overflow:auto">' + free.map(function (c) { return '<div>' + LAB.circCard(c, {}).replace(/<div class="row" style="gap:6px"><a[\s\S]*$/, '') + '<button class="btn sm primary" data-pick="' + esc(c.id) + '" style="margin:-4px 0 10px 18px">' + icon('link') + esc(t('proj.circuits.pick')) + '</button></div>'; }).join('') + '</div>', { wide: true });
        m.addEventListener('click', function (e) {
          var b = e.target.closest('[data-pick]'); if (!b) return;
          var c = free.filter(function (x) { return x.id === b.getAttribute('data-pick'); })[0];
          LAB.api('circuitSave', { id: c.id, title: c.title, taskId: c.taskId, projectId: meta.id, json: c.json, ok: c.ok, public: c.public }).then(function () {
            c.projectId = meta.id; P.circs.push(c); LAB.modal.close(); renderSection(); LAB.toast(t('mat.added'), 'good');
          }).catch(LAB.fail);
        });
      }).catch(LAB.fail);
    }
    function toggleSubmit() {
      var to = meta.status === 'submitted' ? 'draft' : 'submitted';
      var go = function () { saveNow(to).then(function () { LAB.toast(t(to === 'submitted' ? 'proj.submitted' : 'proj.unsubmitted'), 'good'); renderSection(); }).catch(function () {}); };
      if (to === 'submitted') {
        var rd = readiness(P.data, P.mats, P.circs);
        if (rd.total < 60) { LAB.confirm(t('proj.submit.low', { p: rd.total }), t('proj.submit')).then(function (y) { if (y) go(); }); return; }
      }
      go();
    }
    function saveEval() {
      var scores = {}, ok = true;
      box.querySelectorAll('[data-sc]').forEach(function (i) {
        var v = parseFloat(String(i.value).replace(',', '.'));
        if (!isFinite(v)) v = 0;
        if (v < 0 || v > parseFloat(i.max)) ok = false;
        scores[i.getAttribute('data-sc')] = v;
      });
      var err = box.querySelector('#everr');
      if (!ok) { err.textContent = t('err.BAD_SCORE'); return; }
      err.textContent = '';
      LAB.api('evalSave', { projectId: meta.id, scores: scores, comment: box.querySelector('#evcm').value }).then(function (r) {
        LAB.toast(t('eval.saved', { n: LAB.fmt(r.total) }), 'good');
        var ex = P.evals.filter(function (e) { return e.jurorId === me.id; })[0];
        if (ex) { ex.total = r.total; ex.scores = scores; ex.comment = box.querySelector('#evcm').value; }
        else P.evals.push({ jurorId: me.id, jurorName: me.name, total: r.total, scores: scores, comment: box.querySelector('#evcm').value });
        var p = box.querySelector('.evalpanel'); if (p) { var y = p.scrollTop; p.outerHTML = evalPanel(); evTotal(); }
      }).catch(LAB.fail);
    }
    function exportReport() {
      var css = 'body{font:15px/1.55 Arial,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:#111}h1{font-size:26px}h2{font-size:19px;border-bottom:2px solid #0284c7;padding-bottom:4px;margin-top:28px}h4{margin:14px 0 4px;color:#0369a1}.v{white-space:pre-wrap;background:#f1f5f9;border-radius:6px;padding:8px 12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:5px 8px;text-align:left}.chip{background:#fef3c7;border-radius:10px;padding:1px 8px;font-size:12px;margin-right:6px}.mat,.card{border:1px solid #cbd5e1;border-radius:8px;padding:8px;margin:6px 0}.mgrid,.grid{display:block}.pv,.btn,.row a.btn{display:none}img{max-width:260px}svg{max-width:100%;height:auto}.thumb svg{max-height:220px}.bar,.tip{display:none}';
      var html = '<!doctype html><html lang="' + (LAB.state.lang === 'kz' ? 'kk' : 'ru') + '"><head><meta charset="utf-8"><title>' + esc(meta.title) + '</title><style>' + css + '</style></head><body><h1>' + esc(meta.title) + '</h1><p>' + esc(meta.name || (me.role === 'student' ? me.name : '')) + ' · ' + esc(meta.cls && meta.cls !== '-' ? meta.cls : '') + ' · ' + esc(meta.section || '') + '</p>' + roHtml(true).replace(/<svg class="i[^>]*>[\s\S]*?<\/svg>/g, '') + '</body></html>';
      LAB.download((meta.title || 'project').replace(/[^\wА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүІіҺһ -]/g, '') + '.html', html, 'text/html');
    }

    /* первичная отрисовка + очистка */
    render();
    if (!readonly) window.addEventListener('beforeunload', beforeUnload);
    function beforeUnload(e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } }
    return function () {
      window.removeEventListener('beforeunload', beforeUnload);
      if (dirty && !readonly) { clearTimeout(saveTimer); LAB.api('projectSave', payload()).catch(function () {}); }
    };
  }
})(window);
