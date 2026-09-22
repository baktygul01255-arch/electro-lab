/* ============================================================
 * pages-staff.js — кабинет учителя и жюри, галерея работ
 *   #/staff/projects | rating | students | settings
 *   #/gallery
 * ============================================================ */
(function (root) {
  'use strict';
  var LAB = root.LAB, t = function (k, v) { return LAB.t(k, v); }, esc = LAB.esc, L = LAB.L, icon = LAB.icon;
  var ct = function () { return LAB.content; };
  var CAP = 0.6;                       // «общее число дипломов I–III не более 60 % участников»

  function thumbUrl(id) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w640'; }
  function uniq(a) { var o = {}; a.forEach(function (x) { if (x) o[x] = 1; }); return Object.keys(o).sort(function (x, y) { return x.localeCompare(y, 'ru'); }); }
  function opts(list, cur, allLabel) {
    return '<option value="">' + esc(allLabel) + '</option>' + list.map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
  }
  function authorLine(p) { return esc(p.name || '—') + (p.cls && p.cls !== '-' ? ' · ' + esc(p.cls) : ''); }
  function awardChip(score) {
    var a = LAB.awardFor(score);
    return a ? '<span class="award ' + a.id + '">' + esc(L(a.t)) + '</span>' : '<span class="muted small">' + esc(t('crit.noaward')) + '</span>';
  }
  function num(x) { return x == null || x === '' ? '—' : LAB.fmt(+x); }

  /* ============ кабинет ============ */
  LAB.pages.staff = function (args, box) {
    if (!LAB.state.user) {
      box.innerHTML = '<div class="pagehead"><h1>' + esc(t('nav.staff')) + '</h1></div><div id="nl"></div>';
      LAB.needLogin(box.querySelector('#nl'), t('staff.login')); return;
    }
    if (!LAB.isStaff()) { location.hash = '#/my'; return; }
    var teacher = LAB.isTeacher();
    var allowed = teacher ? ['projects', 'rating', 'students', 'settings'] : ['projects', 'students'];
    var tab = allowed.indexOf(args[0]) >= 0 ? args[0] : 'projects';
    var icons = { projects: 'folder', rating: 'chart', students: 'users', settings: 'gauge' };
    box.innerHTML = '<div class="pagehead"><div><h1>' + esc(t('nav.staff')) + '</h1><p class="muted" style="margin:6px 0 0">' + esc(t(teacher ? 'staff.lead.teacher' : 'staff.lead.jury')) + '</p></div>' +
      '<span class="chip acc">' + icon('user') + esc(LAB.state.user.name) + ' · ' + esc(t('role.' + LAB.state.user.role)) + '</span></div>' +
      '<div class="tabs">' + allowed.map(function (k) { return '<a href="#/staff/' + k + '" class="' + (k === tab ? 'on' : '') + '">' + icon(icons[k]) + ' ' + esc(t('staff.tab.' + k)) + '</a>'; }).join('') + '</div>' +
      '<div id="pane">' + LAB.loading() + '</div>';
    var host = box.querySelector('#pane');
    var fn = { projects: projectsPane, rating: ratingPane, students: studentsPane, settings: settingsPane }[tab];
    fn(host, teacher);
  };

  function loadFail(host) { return function (e) { host.innerHTML = '<div class="empty">' + icon('alert') + ' ' + esc(LAB.errMsg(e)) + '</div>'; }; }

  /* ---------- работы ---------- */
  function projectsPane(host, teacher) {
    LAB.api('projectsList').then(function (d) {
      var items = d.projects, F = { q: '', section: '', cls: '', status: '', ev: '' };
      var mineDone = items.filter(function (p) { return p.myScore != null; }).length;
      var submitted = items.filter(function (p) { return p.status === 'submitted'; }).length;
      host.innerHTML = '<div class="grid c4" style="margin-bottom:14px">' +
        stat(items.length, t('staff.st.total')) + stat(submitted, t('staff.st.submitted')) + stat(mineDone, t('staff.st.mine')) + stat(Math.max(0, submitted - mineDone), t('staff.st.todo')) + '</div>' +
        '<div class="card flat filters"><div class="row" style="gap:10px"><input type="search" data-f="q" placeholder="' + esc(t('common.search')) + '" style="flex:2;min-width:160px">' +
        '<select data-f="section" style="flex:1;min-width:140px">' + opts(uniq(items.map(function (p) { return p.section; })), '', t('staff.f.section')) + '</select>' +
        '<select data-f="cls" style="flex:1;min-width:100px">' + opts(uniq(items.map(function (p) { return p.cls; })), '', t('staff.f.class')) + '</select>' +
        '<select data-f="status" style="flex:1;min-width:120px"><option value="">' + esc(t('staff.f.status')) + '</option><option value="submitted">' + esc(t('proj.st.submitted')) + '</option><option value="draft">' + esc(t('proj.st.draft')) + '</option></select>' +
        '<select data-f="ev" style="flex:1;min-width:140px"><option value="">' + esc(t('staff.f.ev')) + '</option><option value="todo">' + esc(t('staff.f.ev.todo')) + '</option><option value="done">' + esc(t('staff.f.ev.done')) + '</option></select></div></div>' +
        '<div id="plist" style="margin-top:14px"></div>';
      function stat(n, lbl) { return '<div class="card flat stat"><b>' + n + '</b><span class="muted small">' + esc(lbl) + '</span></div>'; }
      function draw() {
        var q = F.q.trim().toLowerCase();
        var rows = items.filter(function (p) {
          if (q && (p.title + ' ' + p.name + ' ' + p.section).toLowerCase().indexOf(q) < 0) return false;
          if (F.section && p.section !== F.section) return false;
          if (F.cls && p.cls !== F.cls) return false;
          if (F.status && p.status !== F.status) return false;
          if (F.ev === 'todo' && p.myScore != null) return false;
          if (F.ev === 'done' && p.myScore == null) return false;
          return true;
        });
        var el = host.querySelector('#plist');
        if (!rows.length) { el.innerHTML = '<div class="empty">' + esc(t('staff.none')) + '</div>'; return; }
        el.innerHTML = '<div class="card" style="padding:0"><div class="tblwrap"><table class="tbl"><thead><tr><th>' + esc(t('proj.title')) + '</th><th>' + esc(t('staff.col.author')) + '</th><th>' + esc(t('proj.section')) + '</th><th>' + esc(t('proj.status')) + '</th><th class="center">' + esc(t('proj.ready')) + '</th><th class="center">' + icon('file') + '</th><th class="center">' + esc(t('staff.col.jurors')) + '</th><th class="center">' + esc(t('staff.col.mine')) + '</th>' + (teacher ? '<th class="center">' + esc(t('staff.col.avg')) + '</th>' : '') + '<th></th></tr></thead><tbody>' +
          rows.map(function (p) {
            var rp = LAB.readyPct(p.ready);
            return '<tr><td><a href="#/project/' + esc(p.id) + '"><b>' + esc(p.title) + '</b></a><div class="muted tiny">' + esc(LAB.date(p.updated)) + '</div></td><td>' + authorLine(p) + '</td><td class="small">' + esc(p.section || '') + '</td>' +
              '<td><span class="chip ' + (p.status === 'submitted' ? 'good' : '') + '">' + esc(t('proj.st.' + p.status)) + '</span></td>' +
              '<td class="center nowrap"><b>' + rp + '%</b></td><td class="center">' + (p.materials || 0) + '</td><td class="center">' + (p.evalCount || 0) + '</td>' +
              '<td class="center">' + (p.myScore != null ? '<b>' + num(p.myScore) + '</b>' : '<span class="muted">—</span>') + '</td>' +
              (teacher ? '<td class="center">' + (p.avg != null ? '<b>' + num(p.avg) + '</b>' : '<span class="muted">—</span>') + '</td>' : '') +
              '<td class="right"><a class="btn sm primary" href="#/project/' + esc(p.id) + '">' + icon('eye') + esc(t('common.open')) + '</a></td></tr>';
          }).join('') + '</tbody></table></div></div><p class="muted small" style="margin:8px 2px">' + esc(t('staff.shown', { n: rows.length, m: items.length })) + '</p>';
      }
      host.querySelector('.filters').addEventListener('input', function (e) {
        var k = e.target.getAttribute('data-f'); if (!k) return;
        F[k] = e.target.value; draw();
      });
      draw();
    }).catch(loadFail(host));
  }

  /* ---------- рейтинг (учитель) ---------- */
  function ratingPane(host) {
    Promise.all([LAB.api('ranking'), LAB.api('settingsGet')]).then(function (rs) {
      var rk = rs[0], st = rs[1], minJ = rk.minJurors || 3;
      LAB.state.settings = st;
      var all = rk.items.filter(function (x) { return x.status === 'submitted' || x.n > 0; });
      var capN = Math.floor(all.length * CAP + 1e-9);
      // кандидаты на диплом I–III: достаточно жюри и балл ≥ 70
      var cand = all.filter(function (x) { return x.n >= minJ && x.avg != null && x.avg >= 70; }).sort(function (a, b) { return b.avg - a.avg; });
      var over = {};
      cand.forEach(function (x, i) { if (i >= capN) over[x.id] = true; });
      var bySec = {};
      all.forEach(function (x) { (bySec[x.section || '—'] = bySec[x.section || '—'] || []).push(x); });
      var secs = Object.keys(bySec).sort(function (a, b) { return a.localeCompare(b, 'ru'); });
      secs.forEach(function (s) {
        var arr = bySec[s];
        arr.sort(function (a, b) { return (b.avg == null ? -1 : b.avg) - (a.avg == null ? -1 : a.avg); });
        var place = 0, prev = null;
        arr.forEach(function (x, i) { if (x.avg == null) { x.place = null; return; } if (x.avg !== prev) { place = i + 1; prev = x.avg; } x.place = place; });
      });
      function awardCell(x) {
        if (x.avg == null) return '<span class="muted">—</span>';
        if (x.n < minJ) return '<span class="chip bad" title="' + esc(t('rate.need', { n: minJ })) + '">' + icon('alert') + esc(t('rate.need.short', { n: minJ - x.n })) + '</span>';
        var a = LAB.awardFor(x.avg);
        if (!a) return '<span class="muted small">' + esc(t('crit.noaward')) + '</span>';
        if (over[x.id]) return '<span class="award G">' + esc(L(ct().awards[3].t)) + '</span> <span class="chip amb" title="' + esc(t('rate.cap.hint')) + '">' + icon('info') + '60%</span>';
        return '<span class="award ' + a.id + '">' + esc(L(a.t)) + '</span>';
      }
      var overN = cand.length - Math.min(cand.length, capN);
      host.innerHTML = '<div class="row between" style="margin-bottom:12px"><div class="row" style="gap:8px"><span class="chip ' + (st.resultsPublished ? 'good' : '') + '">' + icon(st.resultsPublished ? 'eye' : 'lock') + esc(t(st.resultsPublished ? 'rate.published' : 'rate.hidden')) + '</span>' +
        '<span class="chip">' + icon('users') + esc(t('rate.minj', { n: minJ })) + '</span></div>' +
        '<div class="row" style="gap:8px"><button class="btn" data-a="pub">' + icon(st.resultsPublished ? 'lock' : 'eye') + esc(t(st.resultsPublished ? 'rate.unpublish' : 'rate.publish')) + '</button><button class="btn primary" data-a="csv">' + icon('download') + esc(t('rate.csv')) + '</button></div></div>' +
        '<div class="warn ' + (overN > 0 ? 'bad' : 'info') + '">' + icon(overN > 0 ? 'alert' : 'info') + '<span>' + esc(t('rate.cap', { n: all.length, cap: capN, k: cand.length })) + (overN > 0 ? ' ' + esc(t('rate.cap.over', { x: overN })) : '') + '</span></div><p class="hint" style="margin:8px 2px 0">' + icon('info') + ' ' + esc(t('crit.important')) + '</p>' +
        (secs.length ? secs.map(function (s) {
          var arr = bySec[s];
          return '<div class="card" style="padding:0;margin-top:14px"><h3 style="margin:0;padding:14px 16px 6px">' + esc(s) + ' <span class="muted small">(' + arr.length + ')</span></h3><div class="tblwrap"><table class="tbl"><thead><tr><th class="center">' + esc(t('rate.place')) + '</th><th>' + esc(t('rate.work')) + '</th><th class="center">' + esc(t('staff.col.jurors')) + '</th>' +
            ct().criteria.map(function (c, i) { return '<th class="center" title="' + esc(L(c.t)) + ' (' + c.max + ')">' + (i + 1) + '</th>'; }).join('') + '<th class="center">Σ</th><th>' + esc(t('rate.award')) + '</th></tr></thead><tbody>' +
            arr.map(function (x) {
              return '<tr><td class="center"><b>' + (x.place || '—') + '</b></td><td><a href="#/project/' + esc(x.id) + '"><b>' + esc(x.title) + '</b></a><div class="muted tiny">' + authorLine(x) + '</div></td>' +
                '<td class="center"><span class="' + (x.n < minJ ? 'chip bad' : '') + '">' + x.n + '</span></td>' +
                ct().criteria.map(function (c) { return '<td class="center small">' + (x.crit ? LAB.fmt(x.crit[c.id]) : '<span class="muted">—</span>') + '</td>'; }).join('') +
                '<td class="center"><b>' + (x.avg != null ? LAB.fmt(x.avg) : '—') + '</b></td><td class="nowrap">' + awardCell(x) + '</td></tr>';
            }).join('') + '</tbody></table></div></div>';
        }).join('') : '<div class="empty" style="margin-top:14px">' + esc(t('rate.empty')) + '</div>');

      host.querySelector('[data-a=csv]').onclick = function () {
        var head = [t('proj.section'), t('rate.place'), t('proj.title'), t('staff.col.author'), t('auth.class'), t('staff.col.jurors')].concat(ct().criteria.map(function (c, i) { return (i + 1) + ' (' + c.max + ')'; })).concat(['Σ', t('rate.award')]);
        var lines = [head];
        secs.forEach(function (s) {
          bySec[s].forEach(function (x) {
            var a = x.avg != null && x.n >= minJ ? LAB.awardFor(x.avg) : null, awd = a ? (over[x.id] ? L(ct().awards[3].t) + ' (60%)' : L(a.t)) : '';
            lines.push([s, x.place || '', x.title, x.name, x.cls, x.n].concat(ct().criteria.map(function (c) { return x.crit ? x.crit[c.id] : ''; })).concat([x.avg != null ? x.avg : '', awd]));
          });
        });
        var csv = '﻿' + lines.map(function (r) {
          return r.map(function (c) { var s = typeof c === 'number' ? String(c).replace('.', ',') : String(c == null ? '' : c); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
        }).join('\r\n');
        LAB.download('zerde-rating-' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv;charset=utf-8');
      };
      host.querySelector('[data-a=pub]').onclick = function () {
        var btn = this; btn.disabled = true;
        LAB.api('settingsSet', { resultsPublished: !st.resultsPublished }).then(function () { LAB.toast(t('common.saved'), 'good'); ratingPane(host); }).catch(function (e) { btn.disabled = false; LAB.fail(e); });
      };
    }).catch(loadFail(host));
  }

  /* ---------- ученики ---------- */
  function studentsPane(host, teacher) {
    LAB.api('usersList').then(function (d) {
      var users = d.users, F = { q: '', cls: '', role: 'student' }, nLes = ct().lessons.length, nTask = ct().tasks.length;
      var classes = uniq(users.filter(function (u) { return u.role === 'student'; }).map(function (u) { return u.cls; }));
      host.innerHTML = '<div class="card flat filters"><div class="row" style="gap:10px"><input type="search" data-f="q" placeholder="' + esc(t('common.search')) + '" style="flex:2;min-width:160px">' +
        '<select data-f="cls" style="flex:1;min-width:110px">' + opts(classes, '', t('staff.f.class')) + '</select>' +
        '<select data-f="role" style="flex:1;min-width:130px"><option value="student">' + esc(t('role.student')) + '</option><option value="staff">' + esc(t('staff.f.staff')) + '</option></select></div></div><div id="ulist" style="margin-top:14px"></div>';
      function pr(u) { var p = {}; try { p = JSON.parse(u.progress || '{}'); } catch (e) {} return LAB.progress.summary(p); }
      function draw() {
        var q = F.q.trim().toLowerCase();
        var rows = users.filter(function (u) {
          if (F.role === 'student' ? u.role !== 'student' : u.role === 'student') return false;
          if (F.cls && u.cls !== F.cls) return false;
          if (q && u.name.toLowerCase().indexOf(q) < 0) return false;
          return true;
        }).sort(function (a, b) { return (a.cls || '').localeCompare(b.cls || '', 'ru') || a.name.localeCompare(b.name, 'ru'); });
        var el = host.querySelector('#ulist');
        if (!rows.length) { el.innerHTML = '<div class="empty">' + esc(t('staff.none')) + '</div>'; return; }
        var stud = F.role === 'student';
        el.innerHTML = '<div class="card" style="padding:0"><div class="tblwrap"><table class="tbl"><thead><tr><th>' + esc(t('auth.name')) + '</th><th>' + esc(stud ? t('auth.class') : t('staff.col.role')) + '</th>' +
          (stud ? '<th>' + esc(t('prof.lessons')) + '</th><th>' + esc(t('prof.tasks')) + '</th><th class="center">' + esc(t('staff.col.quiz')) + '</th><th class="center">' + esc(t('staff.col.trainer')) + '</th><th class="center">' + esc(t('staff.col.works')) + '</th><th class="center">' + icon('chip') + '</th>' : '') +
          '<th>' + esc(t('staff.col.seen')) + '</th><th></th></tr></thead><tbody>' +
          rows.map(function (u) {
            var s = pr(u);
            return '<tr data-id="' + esc(u.id) + '"><td><b>' + esc(u.name) + '</b></td><td>' + esc(stud ? u.cls : t('role.' + u.role)) + '</td>' +
              (stud ? '<td style="min-width:110px"><div class="row between tiny"><span>' + s.lessons + '/' + nLes + '</span></div><div class="bar"><i style="width:' + LAB.pct(s.lessons, nLes) + '%"></i></div></td>' +
                '<td style="min-width:110px"><div class="row between tiny"><span>' + s.tasks + '/' + nTask + '</span></div><div class="bar good"><i style="width:' + LAB.pct(s.tasks, nTask) + '%"></i></div></td>' +
                '<td class="center">' + (s.quizBest ? s.quizBest + '%' : '<span class="muted">—</span>') + '</td><td class="center">' + (s.answered ? s.acc + '% <span class="muted tiny">(' + s.answered + ')</span>' : '<span class="muted">—</span>') + '</td>' +
                '<td class="center">' + u.projects + '</td><td class="center">' + u.circuits + '</td>' : '') +
              '<td class="small muted nowrap">' + esc(LAB.date(u.lastSeen, true)) + '</td>' +
              '<td class="right nowrap">' + (stud && u.circuits ? '<button class="btn sm" data-a="circ" title="' + esc(t('sim.tab.mine')) + '">' + icon('chip') + '</button> ' : '') +
              (teacher ? '<button class="btn sm" data-a="reset" title="' + esc(t('staff.reset')) + '">' + icon('lock') + '</button> <button class="btn sm danger" data-a="del" title="' + esc(t('common.delete')) + '">' + icon('trash') + '</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div></div><p class="muted small" style="margin:8px 2px">' + esc(t('staff.shown', { n: rows.length, m: users.length })) + '</p>';
      }
      host.querySelector('.filters').addEventListener('input', function (e) { var k = e.target.getAttribute('data-f'); if (k) { F[k] = e.target.value; draw(); } });
      host.querySelector('#ulist').addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        var id = b.closest('[data-id]').getAttribute('data-id'), u = users.filter(function (x) { return x.id === id; })[0], a = b.getAttribute('data-a');
        if (a === 'reset') {
          LAB.prompt(t('staff.reset'), t('staff.reset.new', { name: u.name }), '', 'text').then(function (pw) {
            if (pw == null) return;
            LAB.api('userReset', { userId: id, password: pw }).then(function () { LAB.toast(t('staff.reset.ok'), 'good'); }).catch(LAB.fail);
          });
        } else if (a === 'del') {
          LAB.confirm(t('staff.del.confirm', { name: u.name }), t('common.delete')).then(function (y) {
            if (!y) return;
            LAB.api('userDelete', { userId: id }).then(function () { users = users.filter(function (x) { return x.id !== id; }); draw(); LAB.toast(t('common.deleted'), 'good'); }).catch(LAB.fail);
          });
        } else if (a === 'circ') {
          var m = LAB.modal.open('<h3>' + esc(u.name) + ' — ' + esc(t('sim.tab.mine')) + '</h3><div id="cc">' + LAB.loading() + '</div>', { wide: true, noFocus: true });
          LAB.api('circuitsList', { userId: id }).then(function (r) {
            var cc = m.querySelector('#cc'); if (!cc) return;
            cc.innerHTML = r.circuits.length ? '<div class="grid c2" style="max-height:66vh;overflow:auto">' + r.circuits.map(function (c) { return LAB.circCard(c, {}); }).join('') + '</div>' : '<p class="muted">' + esc(t('sim.mine.empty')) + '</p>';
            cc.addEventListener('click', function (ev) { if (ev.target.closest('a')) LAB.modal.close(); });
          }).catch(LAB.fail);
        }
      });
      draw();
    }).catch(loadFail(host));
  }

  /* ---------- настройки (учитель) ---------- */
  function settingsPane(host) {
    LAB.api('settingsGet').then(function (st) {
      LAB.state.settings = st;
      host.innerHTML = '<div class="grid c2"><div class="card stack"><h3>' + icon('gauge') + ' ' + esc(t('set.title')) + '</h3>' +
        '<label class="check"><input type="checkbox" data-s="resultsPublished"' + (st.resultsPublished ? ' checked' : '') + '><span><b>' + esc(t('set.results')) + '</b><br><span class="muted small">' + esc(t('set.results.hint')) + '</span></span></label>' +
        '<label class="check"><input type="checkbox" data-s="registrationOpen"' + (st.registrationOpen ? ' checked' : '') + '><span><b>' + esc(t('set.reg')) + '</b><br><span class="muted small">' + esc(t('set.reg.hint')) + '</span></span></label>' +
        '<label class="field"><span>' + esc(t('set.minj')) + '</span><input type="number" min="1" max="9" step="1" data-s="minJurors" value="' + st.minJurors + '" style="max-width:110px"><div class="hint">' + esc(t('set.minj.hint')) + '</div></label></div>' +
        '<div class="card stack"><h3>' + icon('lock') + ' ' + esc(t('set.codes')) + '</h3><p class="muted">' + esc(t('set.codes.hint')) + '</p>' +
        '<h3 style="margin-top:6px">' + icon('globe') + ' ' + esc(t('set.api')) + '</h3><p class="muted small" style="word-break:break-all">' + esc(LAB.cfg.API_URL || '—') + '</p>' +
        '<div class="row"><button class="btn" data-a="ping">' + icon('bolt') + esc(t('set.ping')) + '</button><span id="pingres" class="small"></span></div></div></div>';
      host.addEventListener('change', function (e) {
        var el = e.target, k = el.getAttribute('data-s'); if (!k) return;
        var v = el.type === 'checkbox' ? el.checked : Math.max(1, Math.min(9, parseInt(el.value, 10) || 3));
        if (el.type !== 'checkbox') el.value = v;
        var body = {}; body[k] = v;
        LAB.api('settingsSet', body).then(function (r) { LAB.state.settings = r; LAB.toast(t('common.saved'), 'good'); }).catch(LAB.fail);
      });
      host.querySelector('[data-a=ping]').onclick = function () {
        var out = host.querySelector('#pingres'); out.textContent = '…';
        LAB.api('ping').then(function (r) { out.innerHTML = '<span class="chip good">' + icon('check') + ' v' + esc(r.version) + '</span>'; }).catch(function (e) { out.innerHTML = '<span class="chip bad">' + esc(LAB.errMsg(e)) + '</span>'; });
      };
    }).catch(loadFail(host));
  }

  /* ============ галерея ============ */
  LAB.pages.gallery = function (args, box) {
    var head = '<div class="pagehead"><div><h1>' + esc(t('nav.gallery')) + '</h1><p class="muted" style="margin:6px 0 0">' + esc(t('gal.lead')) + '</p></div></div>';
    if (!LAB.state.user) { box.innerHTML = head + '<div id="nl"></div>'; LAB.needLogin(box.querySelector('#nl'), t('gal.login')); return; }
    box.innerHTML = head + '<div class="tabs"><button data-k="p" class="on">' + icon('folder') + ' ' + esc(t('gal.projects')) + '</button><button data-k="c">' + icon('chip') + ' ' + esc(t('gal.circuits')) + '</button></div><div id="gl">' + LAB.loading() + '</div>';
    LAB.api('galleryList').then(function (d) {
      var kind = 'p', sec = '';
      var host = box.querySelector('#gl');
      function draw() {
        box.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-k') === kind); });
        if (kind === 'p') {
          var list = d.projects.filter(function (p) { return !sec || p.section === sec; });
          host.innerHTML = '<div class="row" style="margin-bottom:12px"><select data-sec style="max-width:340px">' + opts(uniq(d.projects.map(function (p) { return p.section; })), sec, t('staff.f.section')) + '</select></div>' +
            (list.length ? '<div class="grid auto">' + list.map(function (p) {
              return '<a class="card link gcard" href="#/project/' + esc(p.id) + '"><div class="gcover">' + (p.cover ? '<img loading="lazy" alt="" src="' + thumbUrl(p.cover) + '" data-drive="' + esc(p.coverMat || '') + '">' : icon('bolt')) + '</div>' +
                '<div class="gin"><h3>' + esc(p.title) + '</h3><p class="muted small" style="margin:0">' + authorLine(p) + '</p><div class="row" style="gap:6px;margin-top:8px"><span class="chip">' + esc(p.section || '') + '</span>' + (p.status === 'submitted' ? '<span class="chip good">' + icon('check') + esc(t('proj.st.submitted')) + '</span>' : '') + '</div></div></a>';
            }).join('') + '</div>' : '<div class="empty">' + esc(t('gal.empty')) + '</div>');
        } else {
          host.innerHTML = d.circuits.length ? '<div class="grid auto">' + d.circuits.map(function (c) { return LAB.circCard(c, { by: true }); }).join('') + '</div>' : '<div class="empty">' + esc(t('gal.empty')) + '</div>';
        }
      }
      box.querySelector('.tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) { kind = b.getAttribute('data-k'); draw(); } });
      host.addEventListener('change', function (e) { if (e.target.hasAttribute('data-sec')) { sec = e.target.value; draw(); } });
      host.addEventListener('error', function (e) {
        var img = e.target;
        if (!img || img.tagName !== 'IMG' || img.dataset.fb) return;
        img.dataset.fb = '1';
        var mid = img.getAttribute('data-drive');
        var swap = function () { var p = img.parentNode; if (p) p.innerHTML = icon('image'); };
        if (!mid) { swap(); return; }
        LAB.api('fileGet', { id: mid }).then(function (r) { img.src = 'data:' + r.mime + ';base64,' + r.data; }).catch(swap);
      }, true);
      draw();
    }).catch(function (e) { box.querySelector('#gl').innerHTML = '<div class="empty">' + icon('alert') + ' ' + esc(LAB.errMsg(e)) + '</div>'; });
  };
})(window);
