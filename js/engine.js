/* ============================================================
 * engine.js — физика цепей (без DOM). Работает в браузере и в Node.
 * Метод: модифицированный узловой анализ (MNA).
 * Цепь: { v:1, comps:[{id,type,x,y,rot,label,p:{...}}], wires:[{id,x1,y1,x2,y2}] }
 * Узлы определяются координатами сетки: всё, что находится в одной точке
 * сетки (вывод элемента, конец провода, точка на проводе), соединено.
 * ============================================================ */
(function (root) {
  'use strict';

  var G = 20;            // шаг сетки, px
  var RW = 0.00001;        // сопротивление провода, Ом
  var GMIN = 1e-9;       // утечка на «землю» (защита от вырожденности)
  var R_OPEN = 1e9;
  var R_SW = 0.0001;
  var R_AMM = 0.001;
  var R_VOLT = 1e6;
  var R_FUSE = 0.01;
  var R_SRC = 0.0001;    // внутреннее сопротивление источника
  var SHORT_A = 15;      // ток короткого замыкания, А
  var BURN = 2.0;        // лампа/нагреватель перегорает при P > BURN * Pn

  var TYPES = {
    battery:   { prefix: 'G',  src: true,  def: { V: 4.5 },                       half: 8 },
    mains:     { prefix: 'G',  src: true,  ac: true, def: { V: 220 },              half: 20 },
    lamp:      { prefix: 'L',  load: true, def: { Un: 4.5, Pn: 1.5, broken: false }, half: 17 },
    heater:    { prefix: 'H',  load: true, def: { Un: 220, Pn: 2000, broken: false }, half: 26 },
    resistor:  { prefix: 'R',  def: { R: 10 },                                    half: 26 },
    rheostat:  { prefix: 'Rh', def: { Rmax: 50, pos: 0.5 },                       half: 26 },
    'switch':  { prefix: 'S',  def: { closed: false },                            half: 20 },
    ammeter:   { prefix: 'A',  def: {},                                            half: 18 },
    voltmeter: { prefix: 'V',  def: {},                                            half: 18 },
    fuse:      { prefix: 'F',  def: { Imax: 1 },                                   half: 22 }
  };
  var ORDER = ['battery', 'mains', 'lamp', 'heater', 'resistor', 'rheostat', 'switch', 'fuse', 'ammeter', 'voltmeter'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function emptyCircuit() { return { v: 1, comps: [], wires: [] }; }

  function rot(dx, dy, r) {
    switch (((r % 360) + 360) % 360) {
      case 90: return [-dy, dx];
      case 180: return [-dx, -dy];
      case 270: return [dy, -dx];
      default: return [dx, dy];
    }
  }
  function terminals(c) {
    var a = rot(-40, 0, c.rot || 0), b = rot(40, 0, c.rot || 0);
    return [{ x: c.x + a[0], y: c.y + a[1] }, { x: c.x + b[0], y: c.y + b[1] }];
  }

  function uid(prefix, list) {
    var n = list.length + 1, ids = {};
    list.forEach(function (o) { ids[o.id] = 1; });
    while (ids[prefix + n]) n++;
    return prefix + n;
  }
  function nextLabel(type, comps) {
    var pre = TYPES[type].prefix, used = {};
    comps.forEach(function (c) { used[c.label] = 1; });
    var n = 1;
    while (used[pre + n]) n++;
    return pre + n;
  }
  function newComp(type, x, y, circ, overrides) {
    var def = clone(TYPES[type].def);
    if (overrides) for (var k in overrides) def[k] = overrides[k];
    return { id: uid('c', circ.comps), type: type, x: x, y: y, rot: 0, label: nextLabel(type, circ.comps), p: def };
  }

  function ratedR(c) { return (c.p.Un * c.p.Un) / Math.max(c.p.Pn, 1e-6); }
  function resistanceOf(c, blown) {
    var p = c.p;
    switch (c.type) {
      case 'lamp': case 'heater':
        return (p.broken || blown) ? R_OPEN : Math.max(ratedR(c), 0.01);
      case 'resistor': return Math.max(+p.R || 0, 0.01);
      case 'rheostat': return Math.max(0.05, (+p.Rmax || 0) * (+p.pos || 0));
      case 'switch': return p.closed ? R_SW : R_OPEN;
      case 'ammeter': return R_AMM;
      case 'voltmeter': return R_VOLT;
      case 'fuse': return blown ? R_OPEN : R_FUSE;
    }
    return 1;
  }

  /* точки провода по сетке */
  function wirePoints(w) {
    var pts = [], i, n;
    if (w.x1 === w.x2) {
      n = Math.abs(w.y2 - w.y1) / G;
      if (n === Math.round(n) && n <= 400) {
        var sy = Math.sign(w.y2 - w.y1) || 1;
        for (i = 0; i <= n; i++) pts.push([w.x1, w.y1 + sy * G * i]);
        return pts;
      }
    } else if (w.y1 === w.y2) {
      n = Math.abs(w.x2 - w.x1) / G;
      if (n === Math.round(n) && n <= 400) {
        var sx = Math.sign(w.x2 - w.x1) || 1;
        for (i = 0; i <= n; i++) pts.push([w.x1 + sx * G * i, w.y1]);
        return pts;
      }
    }
    return [[w.x1, w.y1], [w.x2, w.y2]];
  }

  /* --- линейная система: гауссово исключение с выбором главного элемента --- */
  function gauss(A, b) {
    var n = b.length, i, j, k;
    for (i = 0; i < n; i++) {
      var piv = i, mx = Math.abs(A[i][i]);
      for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > mx) { mx = Math.abs(A[j][i]); piv = j; }
      if (mx < 1e-20) return null;
      if (piv !== i) { var t = A[i]; A[i] = A[piv]; A[piv] = t; var tb = b[i]; b[i] = b[piv]; b[piv] = tb; }
      var d = A[i][i];
      for (j = i + 1; j < n; j++) {
        var f = A[j][i] / d;
        if (f === 0) continue;
        for (k = i; k < n; k++) A[j][k] -= f * A[i][k];
        b[j] -= f * b[i];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var s = b[i];
      for (k = i + 1; k < n; k++) s -= A[i][k] * x[k];
      x[i] = s / A[i][i];
    }
    return x;
  }

  function solveOnce(circ, blownSet) {
    var map = {}, nn = 0;
    function node(x, y) {
      var k = x + ',' + y;
      if (map[k] === undefined) map[k] = nn++;
      return map[k];
    }
    var res = [];   // резисторы {a,b,r,...}
    var vs = [];    // источники {p,q,E}
    var cn = {};
    circ.comps.forEach(function (c) {
      var t = terminals(c);
      cn[c.id] = { a: node(t[0].x, t[0].y), b: node(t[1].x, t[1].y) };
    });
    var segs = [];
    circ.wires.forEach(function (w) {
      var pts = wirePoints(w);
      for (var i = 0; i + 1 < pts.length; i++) {
        var a = node(pts[i][0], pts[i][1]), b = node(pts[i + 1][0], pts[i + 1][1]);
        if (a === b) continue;
        var s = { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1], wid: w.id, a: a, b: b };
        segs.push(s);
        res.push({ a: a, b: b, r: RW });
      }
    });
    var ground = -1;
    circ.comps.forEach(function (c) {
      var info = cn[c.id];
      if (TYPES[c.type].src) {
        var m = nn++;
        info.m = m;
        vs.push({ p: m, q: info.b, E: +c.p.V || 0 });
        res.push({ a: m, b: info.a, r: R_SRC });
        if (ground < 0) ground = info.b;
      } else {
        res.push({ a: info.a, b: info.b, r: resistanceOf(c, blownSet.has(c.id)) });
      }
    });
    if (nn === 0) return { V: [], cn: cn, segs: segs, ground: -1, vsCount: 0 };
    if (ground < 0) ground = 0;

    var N = (nn - 1) + vs.length;
    var A = [], b = new Array(N), i, j;
    for (i = 0; i < N; i++) { A[i] = new Float64Array(N); b[i] = 0; }
    function ix(n) { return n === ground ? -1 : (n < ground ? n : n - 1); }
    function stampG(a, c, g) {
      var ia = ix(a), ic = ix(c);
      if (ia >= 0) A[ia][ia] += g;
      if (ic >= 0) A[ic][ic] += g;
      if (ia >= 0 && ic >= 0) { A[ia][ic] -= g; A[ic][ia] -= g; }
    }
    res.forEach(function (r) { stampG(r.a, r.b, 1 / r.r); });
    for (i = 0; i < nn; i++) if (i !== ground) A[ix(i)][ix(i)] += GMIN;
    vs.forEach(function (v, k) {
      var row = (nn - 1) + k, ip = ix(v.p), iq = ix(v.q);
      if (ip >= 0) { A[row][ip] += 1; A[ip][row] += 1; }
      if (iq >= 0) { A[row][iq] -= 1; A[iq][row] -= 1; }
      b[row] = v.E;
    });
    var x = gauss(A, b);
    if (!x) return { error: 'singular', V: [], cn: cn, segs: segs, ground: ground, vsCount: vs.length };
    var V = new Array(nn);
    for (i = 0; i < nn; i++) V[i] = i === ground ? 0 : x[ix(i)];
    return { V: V, cn: cn, segs: segs, ground: ground, vsCount: vs.length };
  }

  function evaluate(circ, blownSet, raw) {
    var V = raw.V, out = { comps: {}, segs: [] }, anyAC = false;
    circ.comps.forEach(function (c) {
      var info = raw.cn[c.id], T = TYPES[c.type], r = {};
      if (!V.length) { out.comps[c.id] = { V: 0, I: 0, P: 0, r: 0, b: 0, lit: false }; return; }
      var va = V[info.a], vb = V[info.b];
      if (T.src) {
        var iout = (V[info.m] - va) / R_SRC;
        r = { V: va - vb, I: -iout, Iout: iout, P: (va - vb) * iout, E: +c.p.V || 0, r: R_SRC };
        if (T.ac) anyAC = true;
      } else {
        var R = resistanceOf(c, blownSet.has(c.id));
        var I = (va - vb) / R;
        r = { V: va - vb, I: I, P: (va - vb) * I, r: R };
        if (T.load) {
          r.b = r.P / Math.max(c.p.Pn, 1e-9);
          r.lit = !blownSet.has(c.id) && !c.p.broken && r.b > 0.02;
        }
        if (c.type === 'ammeter') r.reading = Math.abs(I);
        if (c.type === 'voltmeter') r.reading = Math.abs(va - vb);
      }
      r.blown = blownSet.has(c.id) || !!c.p.broken;
      out.comps[c.id] = r;
    });
    raw.segs.forEach(function (s) {
      out.segs.push({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, wid: s.wid, I: V.length ? (V[s.a] - V[s.b]) / RW : 0 });
    });
    out.ac = anyAC;
    return out;
  }

  /* Полное решение: с перегоранием ламп/нагревателей и плавких предохранителей */
  function solve(circ) {
    var blown = new Set(), hadShort = false, out = null, raw;
    for (var it = 0; it < 10; it++) {
      raw = solveOnce(circ, blown);
      if (raw.error) return { error: raw.error, comps: {}, segs: [], warnings: {}, ac: false };
      out = evaluate(circ, blown, raw);
      var added = false;
      circ.comps.forEach(function (c) {
        var T = TYPES[c.type], r = out.comps[c.id];
        if (T.src && Math.abs(r.Iout) > SHORT_A && c.type === 'battery') hadShort = true;
        if (T.src && Math.abs(r.Iout) > 3 * SHORT_A) hadShort = true;
        if (blown.has(c.id)) return;
        if (T.load && !c.p.broken && r.P > BURN * c.p.Pn) { blown.add(c.id); added = true; }
        if (c.type === 'fuse' && Math.abs(r.I) > c.p.Imax) { blown.add(c.id); added = true; }
      });
      if (!added) break;
    }
    var open = false, hasSrc = false, maxI = 0;
    circ.comps.forEach(function (c) {
      if (TYPES[c.type].src) { hasSrc = true; maxI = Math.max(maxI, Math.abs(out.comps[c.id].Iout)); }
    });
    if (hasSrc && maxI < 1e-4) open = true;
    var bl = [];
    blown.forEach(function (id) { bl.push(id); });
    out.warnings = { short: hadShort, open: open, blown: bl, noSource: !hasSrc && circ.comps.length > 0 };
    circ.comps.forEach(function (c) {
      if (c.p && c.p.broken && TYPES[c.type].load) out.warnings.blown.push(c.id);
    });
    return out;
  }

  /* --- контекст для проверки заданий --- */
  function makeCtx(circ) {
    var sim = solve(circ);
    function comps(type) { return circ.comps.filter(function (c) { return c.type === type; }); }
    function withMut(fn) { var c2 = clone(circ); fn(c2); return { circ: c2, sim: solve(c2) }; }
    function isOn(s, c) {
      var r = s.comps[c.id];
      if (!r) return false;
      if (TYPES[c.type].load) return !!r.lit && r.b > 0.05;
      return Math.abs(r.I) > 1e-4;
    }
    var api = {
      circ: circ, sim: sim, comps: comps, TYPES: TYPES,
      count: function (t) { return comps(t).length; },
      loads: function () { return circ.comps.filter(function (c) { return TYPES[c.type].load; }); },
      src: function () { return circ.comps.filter(function (c) { return TYPES[c.type].src; })[0]; },
      E: function () { var s = api.src(); return s ? (+s.p.V || 0) : 0; },
      isOn: isOn,
      /* все ключи замкнуты / разомкнуты */
      allSwitches: function (closed) { return withMut(function (c2) { c2.comps.forEach(function (c) { if (c.type === 'switch') c.p.closed = closed; }); }); },
      /* ключи заданы массивом (по порядку в схеме) */
      switches: function (arr) {
        return withMut(function (c2) {
          var k = 0;
          c2.comps.forEach(function (c) { if (c.type === 'switch') { c.p.closed = !!arr[k]; k++; } });
        });
      },
      mut: withMut,
      near: function (a, b, tol) { tol = tol || 0.03; return Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1e-9); }
    };
    return api;
  }

  /* --- ограничивающий прямоугольник --- */
  function bbox(circ) {
    var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    function add(x, y) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
    circ.comps.forEach(function (c) {
      var t = terminals(c);
      add(t[0].x, t[0].y); add(t[1].x, t[1].y);
      add(c.x - 30, c.y - 40); add(c.x + 30, c.y + 50);
    });
    circ.wires.forEach(function (w) { add(w.x1, w.y1); add(w.x2, w.y2); });
    if (x1 > x2) { x1 = 0; y1 = 0; x2 = 400; y2 = 300; }
    return { x1: x1, y1: y1, x2: x2, y2: y2 };
  }


  /* --- очистка данных схемы (в том числе пришедших с сервера) --- */
  function num(v, d, lo, hi) { v = Number(v); if (!isFinite(v)) v = d; return Math.min(hi, Math.max(lo, v)); }
  function sanitize(c) {
    var out = emptyCircuit(), ids = {};
    if (!c || typeof c !== 'object') return out;
    (Array.isArray(c.comps) ? c.comps : []).slice(0, 200).forEach(function (k) {
      if (!k || !TYPES[k.type]) return;
      var def = clone(TYPES[k.type].def), p = {};
      Object.keys(def).forEach(function (key) {
        var raw = k.p ? k.p[key] : undefined;
        if (typeof def[key] === 'boolean') p[key] = !!raw;
        else if (key === 'pos') p[key] = num(raw, def[key], 0, 1);
        else p[key] = num(raw, def[key], 0.001, 1e6);
      });
      var id = String(k.id || '').replace(/[^\w-]/g, '').slice(0, 20) || ('c' + (out.comps.length + 1));
      while (ids[id]) id += 'x';
      ids[id] = 1;
      var r = Number(k.rot);
      out.comps.push({
        id: id, type: k.type,
        x: Math.round(num(k.x, 0, -2000, 4000) / G) * G, y: Math.round(num(k.y, 0, -2000, 4000) / G) * G,
        rot: [0, 90, 180, 270].indexOf(r) >= 0 ? r : 0,
        label: String(k.label == null ? '' : k.label).slice(0, 12), p: p
      });
    });
    var wids = {};
    (Array.isArray(c.wires) ? c.wires : []).slice(0, 1500).forEach(function (w) {
      if (!w) return;
      var x1 = Math.round(num(w.x1, 0, -2000, 4000) / G) * G, y1 = Math.round(num(w.y1, 0, -2000, 4000) / G) * G;
      var x2 = Math.round(num(w.x2, 0, -2000, 4000) / G) * G, y2 = Math.round(num(w.y2, 0, -2000, 4000) / G) * G;
      if (x1 === x2 && y1 === y2) return;
      if (x1 !== x2 && y1 !== y2) return;
      var id = String(w.id || '').replace(/[^\w-]/g, '').slice(0, 20) || ('w' + (out.wires.length + 1));
      while (wids[id]) id += 'x';
      wids[id] = 1;
      out.wires.push({ id: id, x1: x1, y1: y1, x2: x2, y2: y2 });
    });
    return out;
  }

  var E = {
    sanitize: sanitize,
    G: G, TYPES: TYPES, ORDER: ORDER, clone: clone, emptyCircuit: emptyCircuit,
    terminals: terminals, rot: rot, newComp: newComp, solve: solve, makeCtx: makeCtx,
    wirePoints: wirePoints, bbox: bbox, resistanceOf: resistanceOf, ratedR: ratedR,
    SHORT_A: SHORT_A
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
  root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
