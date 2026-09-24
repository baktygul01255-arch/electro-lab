/* ============================================================
 * pages-sim.js — симулятор цепей: свободная сборка, задания, «Мои схемы»
 * ============================================================ */
(function (root) {
  'use strict';
  var LAB = root.LAB, t = function (k, v) { return LAB.t(k, v); }, esc = LAB.esc, L = LAB.L, icon = LAB.icon;
  var E = root.Engine, R = root.Render, Sim = root.Sim;

  var FIELDS = {
    battery: [['V', 0.1, 100, 'u.V']],
    mains: [['V', 1, 400, 'u.V']],
    lamp: [['Un', 0.1, 400, 'u.V'], ['Pn', 0.01, 1000, 'u.W']],
    heater: [['Un', 1, 400, 'u.V'], ['Pn', 1, 10000, 'u.W']],
    resistor: [['R', 0.1, 100000, 'u.Om']],
    rheostat: [['Rmax', 1, 10000, 'u.Om']],
    fuse: [['Imax', 0.05, 200, 'u.A']]
  };

  function tabs(active) {
    return '<div class="tabs">' +
      '<a href="#/sim" class="' + (active === 'free' ? 'on' : '') + '">' + icon('chip') + ' ' + esc(t('sim.tab.free')) + '</a>' +
      '<a href="#/sim/tasks" class="' + (active === 'tasks' ? 'on' : '') + '">' + icon('list') + ' ' + esc(t('sim.tab.tasks')) + '</a>' +
      (LAB.isStaff() ? '' : '<a href="#/sim/mine" class="' + (active === 'mine' ? 'on' : '') + '">' + icon('folder') + ' ' + esc(t('sim.tab.mine')) + '</a>') + '</div>';
  }
  function taskById(id) { return LAB.content.tasks.filter(function (x) { return x.id === id; })[0]; }
  function stars(n) { var s = ''; for (var i = 0; i < 3; i++) s += '<span style="color:' + (i < n ? 'var(--amber)' : 'var(--surface3)') + '">★</span>'; return s; }

  LAB.pages.sim = function (args, box) {
    var mode = args[0];
    if (mode === 'tasks') return tasksPage(box);
    if (mode === 'mine') return minePage(box);
    if (mode === 'task') return editorPage(box, { task: taskById(args[1]) });
    if (mode === 'c') return loadCircuitPage(box, args[1]);
    return editorPage(box, {});
  };

  /* ---------- список заданий ---------- */
  function tasksPage(box) {
    var ct = LAB.content, p = LAB.progress.get();
    box.innerHTML = '<div class="pagehead"><div><h1>' + esc(t('nav.sim')) + '</h1></div></div>' + tabs('tasks') +
      '<p class="muted">' + esc(t('sim.tasks.lead')) + '</p><div class="grid auto">' +
      ct.tasks.map(function (k) {
        var done = ((p.tasks || {})[k.id] || {}).ok;
        return '<a class="card link" href="#/sim/task/' + k.id + '"><div class="row between"><span class="mod"><span class="ic" style="margin:0">' + icon(k.icon) + '</span></span><span>' + stars(k.level) + '</span></div>' +
          '<h3 style="margin-top:10px">' + esc(L(k.t)) + '</h3><p class="muted small" style="margin:0 0 8px">' + esc(L(k.text).slice(0, 118)) + '…</p>' +
          (done ? '<span class="chip good">' + icon('check') + esc(t('sim.solved')) + '</span>' : '<span class="chip">' + esc(t('sim.todo')) + '</span>') + '</a>';
      }).join('') + '</div>';
  }

  /* ---------- мои схемы ---------- */
  function circCard(c, o) {
    o = o || {};
    var svg;
    try { svg = R.staticSVG(E.sanitize(JSON.parse(c.json || '{}')), { theme: LAB.state.theme, noLabels: false, uid: 'k' + c.id, bg: false }); } catch (e) { svg = ''; }
    var task = taskById(c.taskId);
    return '<div class="card" data-id="' + esc(c.id) + '"><div class="thumb">' + svg + '</div><h3 style="margin:10px 0 4px">' + esc(c.title) + '</h3>' +
      '<div class="row" style="gap:6px">' + (task ? '<span class="chip acc">' + esc(L(task.t)) + '</span>' : '') + (c.ok ? '<span class="chip good">' + icon('check') + esc(t('sim.solved')) + '</span>' : '') + (c.public ? '<span class="chip amb">' + icon('eye') + esc(t('sim.public')) + '</span>' : '') + '</div>' +
      (o.by ? '<p class="muted small" style="margin:6px 0 0">' + esc(c.name || '') + (c.cls && c.cls !== '-' ? ' · ' + esc(c.cls) : '') + '</p>' : '') +
      '<p class="muted tiny" style="margin:4px 0 8px">' + esc(LAB.date(c.created)) + '</p>' +
      '<div class="row" style="gap:6px"><a class="btn sm primary" href="#/sim/c/' + esc(c.id) + '">' + icon('eye') + esc(t('common.open')) + '</a>' +
      (o.own ? '<button class="btn sm" data-a="pub">' + icon('globe') + esc(c.public ? t('sim.unpublish') : t('sim.publish')) + '</button><button class="btn sm danger" data-a="del">' + icon('trash') + '</button>' : '') + '</div></div>';
  }
  LAB.circCard = circCard;

  function minePage(box) {
    if (!LAB.state.user) { box.innerHTML = '<div class="pagehead"><h1>' + esc(t('nav.sim')) + '</h1></div>' + tabs('mine'); var d = document.createElement('div'); box.appendChild(d); LAB.needLogin(d); return; }
    box.innerHTML = '<div class="pagehead"><h1>' + esc(t('nav.sim')) + '</h1></div>' + tabs('mine') + '<div id="list">' + LAB.loading() + '</div>';
    LAB.api('circuitsList').then(function (d) {
      var host = box.querySelector('#list');
      if (!d.circuits.length) { host.innerHTML = '<div class="empty">' + esc(t('sim.mine.empty')) + '<br><br><a class="btn primary" href="#/sim/tasks">' + esc(t('sim.tab.tasks')) + '</a></div>'; return; }
      var items = d.circuits;
      function draw() {
        host.innerHTML = '<div class="grid auto">' + items.map(function (c) { return circCard(c, { own: true }); }).join('') + '</div>';
      }
      draw();
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        var id = b.closest('[data-id]').getAttribute('data-id'), c = items.filter(function (x) { return x.id === id; })[0];
        if (b.getAttribute('data-a') === 'del') {
          LAB.confirm(t('sim.del.confirm')).then(function (yes) { if (!yes) return; LAB.api('circuitDelete', { id: id }).then(function () { items = items.filter(function (x) { return x.id !== id; }); draw(); }).catch(LAB.fail); });
        } else {
          LAB.api('circuitSave', { id: id, title: c.title, taskId: c.taskId, projectId: c.projectId, json: c.json, ok: c.ok, public: !c.public }).then(function () { c.public = !c.public; draw(); }).catch(LAB.fail);
        }
      });
    }).catch(function (e) { box.querySelector('#list').innerHTML = '<div class="empty">' + esc(LAB.errMsg(e)) + '</div>'; });
  }

  /* ---------- открыть сохранённую схему ---------- */
  function loadCircuitPage(box, id) {
    if (!LAB.state.user) { LAB.needLogin(box); return; }
    return LAB.api('circuitGet', { id: id }).then(function (d) {
      var c = d.circuit, own = c.userId === LAB.state.user.id;
      return editorPage(box, { circuit: c, readonly: !own, own: own, task: taskById(c.taskId) });
    }).catch(function (e) { box.innerHTML = '<div class="empty">' + esc(LAB.errMsg(e)) + '</div>'; });
  }

  /* ---------- редактор ---------- */
  function editorPage(box, o) {
    var task = o.task || null, readonly = !!o.readonly, cir = o.circuit || null;
    var curId = cir && o.own ? cir.id : null, taskOk = cir ? !!cir.ok : false;
    var draftKey = 'draft_' + (task ? task.id : 'free');
    var comps = ['battery', 'mains', 'lamp', 'heater', 'resistor', 'rheostat', 'switch', 'fuse', 'ammeter', 'voltmeter'];
    var title = cir ? cir.title : (task ? L(task.t) : t('sim.free'));

    box.innerHTML =
      '<div class="pagehead"><div>' + (task ? '<div class="crumbs"><a href="#/sim/tasks">' + esc(t('sim.tab.tasks')) + '</a></div>' : '') + '<h1>' + esc(title) + '</h1>' +
      (cir && !o.own ? '<p class="muted" style="margin:6px 0 0">' + icon('user') + ' ' + esc(cir.name || '') + (cir.cls && cir.cls !== '-' ? ' · ' + esc(cir.cls) : '') + ' — ' + esc(t('sim.viewonly')) + '</p>' : '') + '</div></div>' +
      (cir ? '' : tabs(task ? 'tasks' : 'free')) +
      '<div class="simgrid' + (readonly ? ' ro' : '') + '">' +
      (readonly ? '' : '<aside class="palette"><div class="card" style="padding:10px"><div class="lbl">' + esc(t('sim.tools')) + '</div><div class="grp tools3">' +
        '<button class="pi tl on" data-tool="select" title="V">' + icon('pointer') + esc(t('sim.t.select')) + '</button>' +
        '<button class="pi tl" data-tool="wire" title="W">' + icon('wire') + esc(t('sim.t.wire')) + '</button>' +
        '<button class="pi tl" data-tool="erase">' + icon('eraser') + esc(t('sim.t.erase')) + '</button></div></div>' +
        '<div class="card" style="padding:10px"><div class="lbl">' + esc(t('sim.parts')) + '</div><div class="grp" id="parts"></div></div>' +
        (task ? '' : '<div class="card" style="padding:10px"><div class="lbl">' + esc(t('sim.examples')) + '</div><select id="examples"><option value="">—</option><option value="simple">' + esc(t('sim.ex.simple')) + '</option><option value="series">' + esc(t('sim.ex.series')) + '</option><option value="parallel">' + esc(t('sim.ex.parallel')) + '</option><option value="measure">' + esc(t('sim.ex.measure')) + '</option></select></div>') +
        '</aside>') +
      '<section class="stage"><div class="stagebar">' +
      (readonly ? '' : '<button class="btn sm" data-a="undo">' + icon('undo') + '<span>' + esc(t('sim.undo')) + '</span></button><button class="btn sm" data-a="rotate">' + icon('rotate') + '<span>' + esc(t('sim.rotate')) + '</span></button><button class="btn sm danger" data-a="del">' + icon('trash') + '<span>' + esc(t('sim.delete')) + '</span></button><button class="btn sm danger" data-a="clear">' + esc(t('sim.clear')) + '</button>') +
      '<span class="sp1"></span><button class="btn sm" data-a="png">' + icon('download') + '<span>PNG</span></button>' +
      (readonly ? '' : '<button class="btn sm primary" data-a="save">' + icon('save') + '<span>' + esc(t('sim.save')) + '</span></button>') + '</div>' +
      '<div class="canvas-wrap"><svg id="simsvg" class="sim" viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(t('sim.canvas')) + '"></svg></div>' +
      '<div class="warns" id="warns"></div><p class="hint" id="thint"></p></section>' +
      '<aside class="side"><div id="taskpanel"></div><div id="props"></div><div class="card" id="readings"></div></aside></div>';

    var svg = box.querySelector('#simsvg');
    var ed = new Sim.Editor(svg, {
      readonly: readonly,
      theme: function () { return LAB.state.theme; },
      defaults: function (type) { return (task && task.defaults && task.defaults[type]) || {}; },
      onChange: function () { refresh(); },
      onSelect: function () { renderProps(); refresh(); },
      onTool: function (tool, type) { markTool(tool, type); }
    });

    LAB.debugEditor = ed;          // для отладки и автотестов
    var saveDraft = LAB.debounce(function () { if (!readonly && !cir) LAB.session.set(draftKey, ed.toJSON()); }, 300);

    /* палитра */
    function markTool(tool, type) {
      box.querySelectorAll('[data-tool]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tool') === tool); });
      box.querySelectorAll('[data-comp]').forEach(function (b) { b.classList.toggle('on', tool === 'place' && b.getAttribute('data-comp') === type); });
      var h = box.querySelector('#thint');
      if (h) h.textContent = readonly ? t('sim.hint.ro') : t('sim.hint.' + tool);
    }
    function drawParts() {
      var host = box.querySelector('#parts'); if (!host) return;
      host.innerHTML = comps.map(function (c) { return '<button class="pi" data-comp="' + c + '" title="' + esc(t('sim.c.' + c)) + '">' + R.icon(c, LAB.state.theme) + '<span>' + esc(t('sim.c.' + c)) + '</span></button>'; }).join('');
    }
    drawParts();
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tool]');
      if (b) { ed.setTool(b.getAttribute('data-tool')); return; }
      b = e.target.closest('[data-comp]');
      if (b) { ed.setTool('place', b.getAttribute('data-comp')); return; }
      b = e.target.closest('[data-a]');
      if (!b || !box.contains(b)) return;
      var a = b.getAttribute('data-a');
      if (a === 'undo') ed.undo();
      else if (a === 'rotate') ed.rotateSel();
      else if (a === 'del') ed.deleteSel();
      else if (a === 'clear') LAB.confirm(t('sim.clear.confirm')).then(function (y) { if (y) ed.clear(); });
      else if (a === 'png') exportPng();
      else if (a === 'save') saveCircuit();
      else if (a === 'check') runCheck(true);
      else if (a === 'pos') {}
    });
    var ex = box.querySelector('#examples');
    if (ex) ex.onchange = function () { if (ex.value) ed.replace(Sim.examples[ex.value]()); ex.value = ''; };
    markTool('select');

    /* загрузка схемы: сохранённая / черновик */
    if (cir) ed.load(JSON.parse(cir.json || '{}'));
    else { var dr = LAB.session.get(draftKey, null); if (dr) ed.load(dr); }

    /* свойства выбранного элемента */
    function renderProps() {
      var host = box.querySelector('#props'); if (!host) return;
      var c = ed.selectedComp();
      if (!c) {
        host.innerHTML = ed.sel && ed.sel.k === 'w' && !readonly ? '<div class="card"><h4>' + esc(t('sim.wire')) + '</h4><button class="btn sm danger" data-a="del">' + icon('trash') + esc(t('sim.delete')) + '</button></div>' : '';
        return;
      }
      var f = (FIELDS[c.type] || []).map(function (fd) {
        return '<label class="field" style="margin-bottom:8px"><span>' + esc(t('sim.p.' + fd[0])) + ', ' + esc(t(fd[3])) + '</span><input type="text" inputmode="decimal" data-p="' + fd[0] + '" value="' + esc(R.fmt(c.p[fd[0]])) + '"' + (readonly ? ' disabled' : '') + '></label>';
      }).join('');
      var extra = '';
      if (c.type === 'lamp' || c.type === 'heater') extra += '<label class="check"><input type="checkbox" data-p="broken"' + (c.p.broken ? ' checked' : '') + (readonly ? ' disabled' : '') + '><span>' + esc(t('sim.p.broken')) + '</span></label>';
      if (c.type === 'rheostat') extra += '<label class="field"><span>' + esc(t('sim.p.pos')) + '</span><input type="range" min="0" max="100" step="1" data-p="pos" value="' + Math.round(c.p.pos * 100) + '"></label>';
      if (c.type === 'switch') extra += '<button class="btn sm ' + (c.p.closed ? 'primary' : '') + '" data-sw="1">' + esc(c.p.closed ? t('sim.sw.close') : t('sim.sw.open')) + '</button>';
      host.innerHTML = '<div class="card"><h4>' + esc(t('sim.c.' + c.type)) + '</h4>' +
        (readonly ? '' : '<label class="field" style="margin-bottom:8px"><span>' + esc(t('sim.p.label')) + '</span><input type="text" maxlength="12" data-p="label" value="' + esc(c.label) + '"></label>') +
        f + extra + '<div class="live" id="live"></div></div>';
      host.querySelectorAll('input[data-p]').forEach(function (inp) {
        var key = inp.getAttribute('data-p');
        if (inp.type === 'checkbox') inp.onchange = function () { ed.setProp(c.id, key, inp.checked); };
        else if (inp.type === 'range') inp.oninput = function () { ed.setProp(c.id, 'pos', +inp.value / 100, true); };
        else if (key === 'label') inp.onchange = function () { ed.setProp(c.id, 'label', inp.value); };
        else inp.onchange = function () {
          var fd = FIELDS[c.type].filter(function (x) { return x[0] === key; })[0];
          var v = parseFloat(String(inp.value).replace(',', '.'));
          if (!isFinite(v)) v = c.p[key];
          v = Math.min(fd[2], Math.max(fd[1], v));
          inp.value = R.fmt(v);
          ed.setProp(c.id, key, v);
        };
      });
      var sw = host.querySelector('[data-sw]');
      if (sw) sw.onclick = function () { ed.toggleSwitch(c.id); };
    }

    /* живые значения, предупреждения, таблица показаний */
    function refresh() {
      var sim = ed.sim, circ = ed.circ, c = ed.selectedComp();
      var live = box.querySelector('#live');
      if (live && c && sim.comps[c.id]) {
        var r = sim.comps[c.id], Ival = c.type === 'battery' || c.type === 'mains' ? r.Iout : r.I;
        live.innerHTML = '<div><b>' + R.fmt(Math.abs(r.V)) + '</b>' + esc(t('u.V')) + '</div><div><b>' + R.fmt(Math.abs(Ival)) + '</b>' + esc(t('u.A')) + '</div><div><b>' + R.fmt(Math.abs(r.P)) + '</b>' + esc(t('u.W')) + '</div>';
      }
      // предупреждения
      var w = sim.warnings || {}, out = [];
      if (sim.error) out.push(['bad', t('sim.w.err')]);
      if (w.noSource) out.push(['info', t('sim.w.nosrc')]);
      if (w.short) out.push(['bad', t('sim.w.short')]);
      (w.blown || []).forEach(function (id) {
        var k = circ.comps.filter(function (x) { return x.id === id; })[0]; if (!k) return;
        if (k.type === 'fuse') out.push(['bad', t('sim.w.fuseblown', { n: k.label })]);
        else if (k.p.broken) out.push(['info', t('sim.w.brokenman', { n: k.label })]);
        else out.push(['bad', t('sim.w.lampblown', { n: k.label })]);
      });
      if (w.open && !w.noSource && circ.comps.length > 1 && !(w.blown || []).length) out.push(['info', t('sim.w.open')]);
      box.querySelector('#warns').innerHTML = out.map(function (x) { return '<div class="warn ' + x[0] + '">' + icon(x[0] === 'bad' ? 'alert' : 'info') + '<span>' + esc(x[1]) + '</span></div>'; }).join('');
      // показания
      var rows = circ.comps.map(function (k) {
        var r = sim.comps[k.id]; if (!r) return '';
        var I = k.type === 'battery' || k.type === 'mains' ? r.Iout : r.I;
        return '<tr><td><b>' + esc(k.label) + '</b></td><td>' + R.fmt(Math.abs(r.V)) + '</td><td>' + R.fmt(Math.abs(I)) + '</td><td>' + R.fmt(Math.abs(r.P)) + '</td></tr>';
      }).join('');
      box.querySelector('#readings').innerHTML = '<h4>' + esc(t('sim.readings')) + '</h4>' + (rows ? '<table class="tbl" style="font-size:.84rem"><thead><tr><th></th><th>' + esc(t('u.V')) + '</th><th>' + esc(t('u.A')) + '</th><th>' + esc(t('u.W')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p class="muted small">' + esc(t('sim.readings.empty')) + '</p>') +
        '<p class="hint">' + esc(t('sim.dir.hint')) + '</p>';
      if (task) renderTask();
      saveDraft();
    }

    /* панель задания */
    var ansVal = null;
    function evalTask() {
      var x = E.makeCtx(ed.circ), res = task.check(x, ansVal);
      return res;
    }
    function renderTask() {
      var host = box.querySelector('#taskpanel'); if (!host || !task) return;
      var res = evalTask(), all = task.reqs.every(function (q) { return res[q.k]; });
      var focus = document.activeElement && document.activeElement.id === 'ansin';
      if (!host.firstChild) {
        host.innerHTML = '<div class="card"><div class="row between"><h4 style="margin:0">' + esc(t('sim.task')) + '</h4><span>' + stars(task.level) + '</span></div><p style="margin:8px 0">' + esc(L(task.text)) + '</p>' +
          '<details><summary class="small" style="cursor:pointer;color:var(--accent)">' + esc(t('sim.hint')) + '</summary><p class="muted small" style="margin-top:6px">' + esc(L(task.hint)) + '</p></details>' +
          '<div id="reqs" style="margin-top:10px"></div>' +
          (task.answer ? '<label class="field" style="margin-top:8px"><span>' + esc(L(task.answer.label)) + ', ' + esc(L(task.answer.unit)) + '</span><input type="text" id="ansin" inputmode="decimal"' + (readonly ? ' disabled' : '') + '></label>' : '') +
          '<div id="tres"></div>' + (readonly ? '' : '<button class="btn primary" data-a="check" style="width:100%;margin-top:8px">' + icon('check') + esc(t('sim.check')) + '</button>') + '</div>';
        var ai = host.querySelector('#ansin');
        if (ai) ai.oninput = function () { var v = parseFloat(String(ai.value).replace(',', '.')); ansVal = isFinite(v) ? v : null; renderTask(); };
      }
      host.querySelector('#reqs').innerHTML = task.reqs.map(function (q) { return '<div class="req ' + (res[q.k] ? 'ok' : '') + '"><span class="m">' + (res[q.k] ? icon('check') : '') + '</span><span>' + esc(L(q.t)) + '</span></div>'; }).join('');
      host.querySelector('#tres').innerHTML = all ? '<div class="warn good" style="margin-top:8px">' + icon('check') + '<span>' + esc(t('sim.allok')) + '</span></div>' : '';
      taskOk = all;
    }
    function runCheck() {
      if (!task) return;
      var res = evalTask(), all = task.reqs.every(function (q) { return res[q.k]; });
      renderTask();
      if (all) {
        LAB.progress.update(function (p) { p.tasks[task.id] = { ok: true, at: Date.now() }; });
        LAB.toast(t('sim.task.done'), 'good');
        var cta = box.querySelector('#tres');
        cta.innerHTML += '<div style="margin-top:8px"><button class="btn amber" style="width:100%" data-a="save">' + icon('save') + esc(t('sim.save.mine')) + '</button></div>';
      } else LAB.toast(t('sim.task.notyet'), 'bad');
    }

    /* экспорт и сохранение */
    function exportPng() {
      ed.exportPNG('light').then(function (url) {
        var a = document.createElement('a'); a.href = url; a.download = (title || 'circuit').replace(/[^\wА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүІіҺһ -]/g, '') + '.png';
        document.body.appendChild(a); a.click(); a.remove();
      }).catch(function () { LAB.toast(t('sim.png.fail'), 'bad'); });
    }
    function saveCircuit() {
      if (!LAB.state.user) { LAB.auth.open('login'); return; }
      if (!LAB.isStudent()) { LAB.toast(t('sim.save.student'), 'bad'); return; }
      if (!ed.circ.comps.length) { LAB.toast(t('sim.save.empty'), 'bad'); return; }
      LAB.api('projectsList').catch(function () { return { projects: [] }; }).then(function (d) {
        var opts = '<option value="">' + esc(t('sim.save.noproj')) + '</option>' + d.projects.map(function (p) { return '<option value="' + esc(p.id) + '"' + (cir && cir.projectId === p.id ? ' selected' : '') + '>' + esc(p.title) + '</option>'; }).join('');
        var m = LAB.modal.open('<h3>' + esc(t('sim.save.title')) + '</h3><label class="field"><span>' + esc(t('sim.save.name')) + '</span><input type="text" id="sname" maxlength="100" value="' + esc(cir ? cir.title : (task ? L(task.t) : t('sim.save.default'))) + '"></label>' +
          '<label class="field"><span>' + esc(t('sim.save.project')) + '</span><select id="sproj">' + opts + '</select></label>' +
          '<label class="check"><input type="checkbox" id="spub"' + (cir && cir.public ? ' checked' : '') + '><span>' + esc(t('sim.save.public')) + '</span></label><div class="err" id="serr"></div>' +
          '<div class="row" style="justify-content:flex-end"><button class="btn primary" id="sgo">' + icon('save') + esc(t('sim.save')) + '</button></div>');
        m.querySelector('#sgo').onclick = function () {
          var btn = this; btn.disabled = true;
          var payload = { id: curId || undefined, title: m.querySelector('#sname').value, taskId: task ? task.id : '', projectId: m.querySelector('#sproj').value, json: JSON.stringify(ed.toJSON()), ok: task ? taskOk : false, public: m.querySelector('#spub').checked };
          LAB.api('circuitSave', payload).then(function (r) {
            curId = r.id; cir = cir || { id: r.id, projectId: payload.projectId, public: payload.public, title: payload.title };
            cir.title = payload.title; cir.projectId = payload.projectId; cir.public = payload.public;
            LAB.modal.close(); LAB.toast(t('sim.saved'), 'good');
          }).catch(function (e) { m.querySelector('#serr').textContent = LAB.errMsg(e); btn.disabled = false; });
        };
      });
    }

    renderProps();
    refresh();
    LAB.themeHook = function () { ed.render(); drawParts(); markTool(ed.tool, ed.placeType); };
    return function () { ed.destroy(); LAB.themeHook = null; };
  }
})(window);
