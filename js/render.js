/* ============================================================
 * render.js — рисование схем в SVG (строки, без DOM).
 * Условные обозначения по школьным (ГОСТ) правилам.
 * ============================================================ */
(function (root) {
  'use strict';
  var E = root.Engine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  var G = E.G;
  var DEC = '.';
  var UNITS = { V: 'В', A: 'А', W: 'Вт', Om: 'Ом' };
  var WORDS = { broken: 'сгорела', blownFuse: 'сгорел', on: 'вкл', off: 'откл' };

  var THEMES = {
    light: { bg: '#ffffff', grid: '#cbd5e1', ink: '#0f172a', wire: '#334155', accent: '#0369a1', flow: '#d97706', lit: '#facc15', heat: '#f97316', bad: '#dc2626', text: '#0f172a', muted: '#64748b' },
    dark: { bg: '#0d1526', grid: '#26334d', ink: '#e2e8f0', wire: '#94a3b8', accent: '#22d3ee', flow: '#fbbf24', lit: '#fde047', heat: '#fb923c', bad: '#f87171', text: '#e2e8f0', muted: '#8b9bb8' }
  };
  function themeStyle(name) {
    var t = THEMES[name] || THEMES.light, s = '';
    for (var k in t) s += '--s-' + k + ':' + t[k] + ';';
    return s;
  }

  var CSS =
    '.sim .wire{stroke:var(--s-wire);stroke-width:3;fill:none;stroke-linecap:round}' +
    '.sim .wire.sel{stroke:var(--s-accent);stroke-width:4}' +
    '.sim .hitw{stroke:transparent;stroke-width:14;fill:none;cursor:pointer}' +
    '.sim .sym{stroke:var(--s-ink);stroke-width:2.4;fill:none;stroke-linecap:round;stroke-linejoin:round}' +
    '.sim .sym.bad{stroke:var(--s-bad)}' +
    '.sim .fillink{fill:var(--s-ink);stroke:none}' +
    '.sim .term{fill:var(--s-bg);stroke:var(--s-wire);stroke-width:2}' +
    '.sim .term.hot{stroke:var(--s-accent);stroke-width:3}' +
    '.sim .jn{fill:var(--s-wire);stroke:none}' +
    '.sim .flow{fill:none;stroke:var(--s-flow);stroke-linecap:round;stroke-dasharray:.01 9.99;animation:simflow .7s linear infinite;pointer-events:none}' +
    '.sim .flow.rev{animation-direction:reverse}' +
    '.sim .flow.ac{animation:simac .9s ease-in-out infinite alternate}' +
    '.sim.noanim .flow{animation:none}' +
    '@keyframes simflow{to{stroke-dashoffset:-10}}' +
    '@keyframes simac{from{stroke-dashoffset:-3}to{stroke-dashoffset:3}}' +
    '.sim .txt{font:700 12px Inter,system-ui,Segoe UI,Arial,sans-serif;fill:var(--s-text)}' +
    '.sim .val{font:500 11px Inter,system-ui,Segoe UI,Arial,sans-serif;fill:var(--s-muted)}' +
    '.sim .rd{font:700 13px Inter,system-ui,Segoe UI,Arial,sans-serif;fill:var(--s-accent)}' +
    '.sim .mtr{font:700 17px Inter,system-ui,Segoe UI,Arial,sans-serif;fill:var(--s-ink)}' +
    '.sim .warn{font:700 11px Inter,system-ui,Segoe UI,Arial,sans-serif;fill:var(--s-bad)}' +
    '.sim .selbox{fill:none;stroke:var(--s-accent);stroke-dasharray:4 3;stroke-width:1.5}' +
    '.sim .ghost{opacity:.55;pointer-events:none}' +
    '.sim .prev{stroke:var(--s-accent);stroke-width:3;stroke-dasharray:6 4;fill:none;pointer-events:none}' +
    '.sim .cursor{fill:none;stroke:var(--s-accent);stroke-width:2;pointer-events:none}';

  function setDecimal(d) { DEC = d; }
  function setWords(u, w) { if (u) UNITS = u; if (w) WORDS = w; }
  function fmt(x) {
    if (x === undefined || x === null || !isFinite(x)) return '—';
    if (Math.abs(x) < 1e-4) return '0';
    var s = String(parseFloat(Math.abs(x).toPrecision(3)));
    if (s.indexOf('e') >= 0) s = Math.abs(x).toFixed(0);
    if (x < 0) s = '-' + s;
    return DEC === ',' ? s.replace('.', ',') : s;
  }
  function n(x) { return Math.round(x * 100) / 100; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function lead(l, r) { return '<path class="sym' + '" d="M-40 0H' + (-l) + 'M' + r + ' 0H40"/>'; }

  /* Символ элемента в локальных координатах (центр в 0,0, вдоль оси X) */
  function body(c, r, o) {
    var p = c.p, U = o.uid || 'x', b = r ? r.b || 0 : 0, cls = 'sym', s = '';
    var bad = r && r.blown;
    switch (c.type) {
      case 'battery': {
        var cells = Math.max(1, Math.min(4, Math.round((+p.V || 1.5) / 1.5))), a = 6 * cells, i;
        s += lead(a, a - 6);
        for (i = 0; i < cells; i++) {
          var xl = -a + 12 * i;
          s += '<path class="sym" style="stroke-width:3" d="M' + xl + ' -13V13"/>';
          s += '<path class="sym" style="stroke-width:5" d="M' + (xl + 6) + ' -7V7"/>';
        }
        return s;
      }
      case 'mains':
        return lead(20, 20) + '<circle class="sym" r="20"/>';
      case 'lamp': {
        var lit = r && r.lit ? Math.min(1, Math.sqrt(Math.max(r.b, 0))) : 0;
        s += lead(17, 17);
        if (lit > 0) s += '<circle r="40" fill="url(#gLamp' + U + ')" opacity="' + n(lit) + '"/>';
        s += '<circle class="' + cls + '" r="17" style="fill:var(--s-lit);fill-opacity:' + n(lit * 0.85) + '"/>';
        s += '<path class="sym' + (bad ? ' bad' : '') + '" d="M-12 -12L12 12M-12 12L12 -12"' + (bad ? ' stroke-dasharray="4 3"' : '') + '/>';
        return s;
      }
      case 'heater': {
        var hl = r && r.lit ? Math.min(1, Math.sqrt(Math.max(r.b, 0))) : 0;
        s += lead(24, 24);
        if (hl > 0) s += '<circle r="44" fill="url(#gHeat' + U + ')" opacity="' + n(hl) + '"/>';
        s += '<rect class="sym" x="-24" y="-10" width="48" height="20" rx="2" style="fill:var(--s-heat);fill-opacity:' + n(hl * 0.8) + '"/>';
        s += '<path class="sym' + (bad ? ' bad' : '') + '" d="M-18 3L-14 -5L-8 5L-2 -5L4 5L10 -5L14 3L18 -3"/>';
        return s;
      }
      case 'resistor':
        return lead(24, 24) + '<rect class="sym" x="-24" y="-8" width="48" height="16"/>';
      case 'rheostat': {
        var xw = -24 + 48 * Math.max(0, Math.min(1, +p.pos || 0));
        return lead(24, 24) + '<rect class="sym" x="-24" y="-8" width="48" height="16"/>' +
          '<path class="sym" d="M-14 17L14 -17"/><path class="fillink" d="M14 -17L6 -14L11 -9Z"/>' +
          '<path class="sym" style="stroke-width:1.6" d="M' + n(xw) + ' -8V-20"/><path class="fillink" d="M' + n(xw) + ' -8L' + n(xw - 3.5) + ' -14L' + n(xw + 3.5) + ' -14Z"/>';
      }
      case 'switch': {
        s += lead(20, 20);
        s += '<circle class="fillink" cx="-20" cy="0" r="3.2"/><circle class="fillink" cx="20" cy="0" r="3.2"/>';
        s += p.closed ? '<path class="sym" style="stroke-width:3" d="M-20 0L20 0"/>' : '<path class="sym" style="stroke-width:3" d="M-20 0L15 -17"/>';
        return s;
      }
      case 'ammeter':
      case 'voltmeter':
        return lead(18, 18) + '<circle class="sym" r="18" style="fill:var(--s-bg)"/>';
      case 'fuse': {
        s += lead(22, 22) + '<rect class="sym' + (bad ? ' bad' : '') + '" x="-22" y="-7" width="44" height="14"' + (bad ? ' stroke-dasharray="5 4"' : '') + ' style="fill:var(--s-bg)"/>';
        s += bad ? '<path class="sym bad" d="M-22 0H-7M7 0H22"/>' : '<path class="sym" d="M-22 0H22"/>';
        return s;
      }
    }
    return '';
  }

  function mainText(c, r) {
    var p = c.p, u = UNITS;
    switch (c.type) {
      case 'battery': return fmt(p.V) + ' ' + u.V;
      case 'mains': return '~' + fmt(p.V) + ' ' + u.V;
      case 'lamp': return fmt(p.Un) + ' ' + u.V + ' · ' + fmt(p.Pn) + ' ' + u.W;
      case 'heater': return fmt(p.Pn) + ' ' + u.W;
      case 'resistor': return fmt(p.R) + ' ' + u.Om;
      case 'rheostat': return '0…' + fmt(p.Rmax) + ' ' + u.Om;
      case 'fuse': return fmt(p.Imax) + ' ' + u.A;
      case 'ammeter': return r ? fmt(r.reading) + ' ' + u.A : '';
      case 'voltmeter': return r ? fmt(r.reading) + ' ' + u.V : '';
    }
    return '';
  }

  function comp(c, r, o) {
    var rt = c.rot || 0, vertical = (rt % 180) !== 0, out = '';
    var tr = 'translate(' + c.x + ',' + c.y + ') rotate(' + rt + ')';
    out += '<g class="' + (o.ghost ? 'ghost' : '') + '" data-cid="' + esc(c.id) + '">';
    out += '<g transform="' + tr + '">';
    if (o.selected) out += '<rect class="selbox" x="-46" y="-26" width="92" height="52" rx="9"/>';
    out += body(c, r, o);
    out += '<rect x="-40" y="-24" width="80" height="48" fill="transparent" style="cursor:pointer"/>';
    out += '</g>';
    // подписи (не вращаются)
    var lx, ly, vx, vy, anchor;
    if (vertical) { lx = c.x + 30; ly = c.y - 3; vx = lx; vy = c.y + 12; anchor = 'start'; }
    else { lx = c.x; ly = c.y - 30; vx = c.x; vy = c.y + 40; anchor = 'middle'; }
    if (c.type === 'ammeter' || c.type === 'voltmeter') {
      out += '<text class="mtr" x="' + c.x + '" y="' + (c.y + 6) + '" text-anchor="middle">' + (c.type === 'ammeter' ? UNITS.A : UNITS.V) + '</text>';
    }
    if (c.type === 'mains') out += '<text class="mtr" x="' + c.x + '" y="' + (c.y + 6) + '" text-anchor="middle">~</text>';
    if (c.type === 'battery') {
      var cells0 = Math.max(1, Math.min(4, Math.round((+c.p.V || 1.5) / 1.5)));
      var pl = E.rot(-(6 * cells0) - 9, -15, rt), mi = E.rot(6 * cells0 + 4, -15, rt);
      out += '<text class="txt" x="' + (c.x + pl[0]) + '" y="' + (c.y + pl[1] + 4) + '" text-anchor="middle">+</text>';
      out += '<text class="txt" x="' + (c.x + mi[0]) + '" y="' + (c.y + mi[1] + 4) + '" text-anchor="middle">−</text>';
    }
    if (!o.noLabels) {
      out += '<text class="txt" x="' + lx + '" y="' + ly + '" text-anchor="' + anchor + '">' + esc(c.label) + '</text>';
      var mt = mainText(c, r);
      var meter = (c.type === 'ammeter' || c.type === 'voltmeter');
      if (mt) out += '<text class="' + (meter ? 'rd' : 'val') + '" x="' + vx + '" y="' + vy + '" text-anchor="' + anchor + '">' + esc(mt) + '</text>';
      if (r && r.blown && (c.type === 'lamp' || c.type === 'heater' || c.type === 'fuse')) {
        out += '<text class="warn" x="' + vx + '" y="' + (vy + 13) + '" text-anchor="' + anchor + '">' + esc(c.type === 'fuse' ? WORDS.blownFuse : WORDS.broken) + '</text>';
      }
      if (c.type === 'switch') {
        out += '<text class="val" x="' + vx + '" y="' + vy + '" text-anchor="' + anchor + '">' + (c.p.closed ? WORDS.on : WORDS.off) + '</text>';
      }
    }
    out += '</g>';
    return out;
  }

  function defs(U) {
    return '<defs>' +
      '<radialGradient id="gLamp' + U + '"><stop offset="0" stop-color="#fde047" stop-opacity=".95"/><stop offset=".5" stop-color="#facc15" stop-opacity=".35"/><stop offset="1" stop-color="#facc15" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="gHeat' + U + '"><stop offset="0" stop-color="#fb923c" stop-opacity=".95"/><stop offset=".5" stop-color="#f97316" stop-opacity=".4"/><stop offset="1" stop-color="#ef4444" stop-opacity="0"/></radialGradient>' +
      '<pattern id="grid' + U + '" width="' + G + '" height="' + G + '" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1.1" fill="var(--s-grid)"/></pattern>' +
      '</defs>';
  }

  /* Основной рендер содержимого SVG */
  function content(circ, sim, o) {
    o = o || {};
    var U = o.uid || 'x', out = '<style>' + CSS + '</style>' + defs(U), i;
    if (o.grid) out += '<rect x="0" y="0" width="' + (o.w || 1000) + '" height="' + (o.h || 600) + '" fill="url(#grid' + U + ')" data-bg="1"/>';
    // провода
    circ.wires.forEach(function (w) {
      var sel = o.selWire === w.id;
      out += '<g data-wid="' + esc(w.id) + '"><line class="wire' + (sel ? ' sel' : '') + '" x1="' + w.x1 + '" y1="' + w.y1 + '" x2="' + w.x2 + '" y2="' + w.y2 + '"/>' +
        (o.edit ? '<line class="hitw" x1="' + w.x1 + '" y1="' + w.y1 + '" x2="' + w.x2 + '" y2="' + w.y2 + '"/>' : '') + '</g>';
    });
    // узлы (точки соединения)
    var deg = {};
    function bump(x, y) { var k = x + ',' + y; deg[k] = (deg[k] || 0) + 1; }
    circ.wires.forEach(function (w) {
      var pts = E.wirePoints(w);
      for (i = 0; i + 1 < pts.length; i++) { bump(pts[i][0], pts[i][1]); bump(pts[i + 1][0], pts[i + 1][1]); }
    });
    circ.comps.forEach(function (c) { var t = E.terminals(c); bump(t[0].x, t[0].y); bump(t[1].x, t[1].y); });
    Object.keys(deg).forEach(function (k) {
      if (deg[k] >= 3) { var xy = k.split(','); out += '<circle class="jn" cx="' + xy[0] + '" cy="' + xy[1] + '" r="4.6"/>'; }
    });
    // ток
    if (sim && !o.noflow) {
      var ac = sim.ac, maxI = 0;
      sim.segs.forEach(function (s) {
        var a = Math.abs(s.I);
        if (a < 2e-3) return;
        var wdt = n(2.6 + 2.2 * Math.min(1, Math.sqrt(a)));
        out += '<line class="flow' + (ac ? ' ac' : (s.I < 0 ? ' rev' : '')) + '" style="stroke-width:' + wdt + '" x1="' + s.x1 + '" y1="' + s.y1 + '" x2="' + s.x2 + '" y2="' + s.y2 + '"/>';
      });
      circ.comps.forEach(function (c) {
        var r = sim.comps[c.id];
        if (!r || Math.abs(r.I) < 2e-3) return;
        var half = E.TYPES[c.type].half, rt = c.rot || 0, h1 = half, h2 = half;
        if (c.type === 'battery') { var cells = Math.max(1, Math.min(4, Math.round((+c.p.V || 1.5) / 1.5))); h1 = 6 * cells; h2 = 6 * cells - 6; }
        var p1 = E.rot(-40, 0, rt), p2 = E.rot(-h1, 0, rt), p3 = E.rot(h2, 0, rt), p4 = E.rot(40, 0, rt);
        var cls = 'flow' + (sim.ac ? ' ac' : (r.I < 0 ? ' rev' : ''));
        var wd = n(2.6 + 2.2 * Math.min(1, Math.sqrt(Math.abs(r.I))));
        out += '<line class="' + cls + '" style="stroke-width:' + wd + '" x1="' + (c.x + p1[0]) + '" y1="' + (c.y + p1[1]) + '" x2="' + (c.x + p2[0]) + '" y2="' + (c.y + p2[1]) + '"/>';
        out += '<line class="' + cls + '" style="stroke-width:' + wd + '" x1="' + (c.x + p3[0]) + '" y1="' + (c.y + p3[1]) + '" x2="' + (c.x + p4[0]) + '" y2="' + (c.y + p4[1]) + '"/>';
      });
    }
    // элементы
    circ.comps.forEach(function (c) {
      out += comp(c, sim ? sim.comps[c.id] : null, { uid: U, selected: o.sel === c.id, noLabels: o.noLabels });
    });
    // выводы
    circ.comps.forEach(function (c) {
      var t = E.terminals(c);
      out += '<circle class="term' + (o.hotTerms ? ' hot' : '') + '" cx="' + t[0].x + '" cy="' + t[0].y + '" r="4"/><circle class="term' + (o.hotTerms ? ' hot' : '') + '" cx="' + t[1].x + '" cy="' + t[1].y + '" r="4"/>';
    });
    // тень-предпросмотр
    if (o.ghost) out += comp(o.ghost, null, { uid: U, ghost: true, noLabels: true });
    if (o.preview) {
      o.preview.forEach(function (s) { out += '<line class="prev" x1="' + s.x1 + '" y1="' + s.y1 + '" x2="' + s.x2 + '" y2="' + s.y2 + '"/>'; });
    }
    if (o.start) out += '<circle class="cursor" cx="' + o.start.x + '" cy="' + o.start.y + '" r="7"/>';
    if (o.hover) out += '<circle class="cursor" cx="' + o.hover.x + '" cy="' + o.hover.y + '" r="5"/>';
    return out;
  }

  /* Полный самостоятельный SVG (миниатюры, экспорт) */
  function staticSVG(circ, o) {
    o = o || {};
    var sim = E.solve(circ), bb = E.bbox(circ), pad = 24;
    var x = bb.x1 - pad, y = bb.y1 - pad, w = bb.x2 - bb.x1 + 2 * pad, h = bb.y2 - bb.y1 + 2 * pad;
    var theme = o.theme || 'light';
    var uid = o.uid || ('s' + Math.floor(Math.random() * 1e6));
    var body = content(circ, sim, { uid: uid, noflow: !o.flow, noLabels: o.noLabels });
    var sc = o.scale || 1;
    return '<svg xmlns="http://www.w3.org/2000/svg" class="sim' + (o.animate ? '' : ' noanim') + '" viewBox="' + x + ' ' + y + ' ' + w + ' ' + h + '"' +
      (o.width ? ' width="' + o.width + '"' : '') + (o.height ? ' height="' + o.height + '"' : '') +
      ' style="' + themeStyle(theme) + (o.bg === false ? '' : 'background:' + THEMES[theme].bg + ';') + '">' +
      (o.bg === false ? '' : '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + THEMES[theme].bg + '"/>') +
      body + '</svg>';
  }

  /* маленькая иконка элемента для палитры */
  function icon(type, theme) {
    var circ = E.emptyCircuit(), c = E.newComp(type, 0, 0, circ);
    if (type === 'lamp' || type === 'heater') c.p.broken = false;
    var r = null;
    return '<svg xmlns="http://www.w3.org/2000/svg" class="sim noanim" viewBox="-46 -30 92 60" width="72" height="47" style="' + themeStyle(theme || 'light') + '">' +
      '<style>' + CSS + '</style>' + '<g>' + body(c, r, { uid: 'ic' }) +
      (type === 'ammeter' ? '<text class="mtr" x="0" y="6" text-anchor="middle">' + UNITS.A + '</text>' : '') +
      (type === 'voltmeter' ? '<text class="mtr" x="0" y="6" text-anchor="middle">' + UNITS.V + '</text>' : '') +
      (type === 'mains' ? '<text class="mtr" x="0" y="6" text-anchor="middle">~</text>' : '') + '</g></svg>';
  }

  var R = { content: content, staticSVG: staticSVG, icon: icon, themeStyle: themeStyle, THEMES: THEMES, CSS: CSS, fmt: fmt, setDecimal: setDecimal, setWords: setWords, comp: comp, defs: defs };
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
  root.Render = R;
})(typeof window !== 'undefined' ? window : globalThis);
