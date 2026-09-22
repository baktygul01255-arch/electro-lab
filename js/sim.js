/* ============================================================
 * sim.js — редактор схем (SVG): расстановка элементов, провода,
 * перетаскивание, отмена, экспорт PNG, примеры цепей.
 * ============================================================ */
(function (root) {
  'use strict';
  var E = root.Engine, R = root.Render, G = E.G;
  var W = 1000, H = 600;

  function Editor(svg, opts) {
    this.svg = svg;
    this.o = Object.assign({ readonly: false, theme: function () { return 'dark'; }, onChange: function () {}, onSelect: function () {}, defaults: function () { return {}; } }, opts || {});
    this.circ = E.emptyCircuit();
    this.sim = E.solve(this.circ);
    this.tool = 'select';
    this.placeType = null;
    this.placeRot = 0;
    this.sel = null;              // {k:'c'|'w', id}
    this.hist = [];
    this.wireStart = null;
    this.hover = null;
    this.drag = null;
    this.uid = 'ed' + Math.floor(Math.random() * 1e6);
    this._bind();
    this.render();
  }

  var P = Editor.prototype;

  P.json = function () { return JSON.stringify(this.circ); };
  P.toJSON = function () { return JSON.parse(JSON.stringify(this.circ)); };

  P.load = function (obj) {
    this.circ = E.sanitize(obj);
    this.hist = [];
    this.sel = null;
    this.wireStart = null;
    this.recompute(true);
    this.o.onSelect(null);
  };

  P.recompute = function (silent) {
    this.sim = E.solve(this.circ);
    this.render();
    if (!silent) this.o.onChange(this);
  };

  P.render = function () {
    var o = { uid: this.uid, grid: true, w: W, h: H, edit: !this.o.readonly };
    if (this.sel) { if (this.sel.k === 'c') o.sel = this.sel.id; else o.selWire = this.sel.id; }
    o.hotTerms = this.tool === 'wire';
    if (!this.o.readonly) {
      if (this.tool === 'wire') {
        if (this.wireStart) { o.start = this.wireStart; if (this.hover) o.preview = this.pathSegs(this.wireStart, this.hover); }
        else if (this.hover) o.hover = this.hover;
      }
      if (this.tool === 'place' && this.hover) {
        var g = E.newComp(this.placeType, this.hover.x, this.hover.y, this.circ);
        g.rot = this.placeRot; g.label = '';
        o.ghost = g;
      }
    }
    this.svg.setAttribute('style', R.themeStyle(this.o.theme()) + 'touch-action:none;');
    this.svg.setAttribute('class', 'sim' + (this.tool === 'place' || this.tool === 'wire' ? ' tool-' + this.tool : ''));
    this.svg.innerHTML = R.content(this.circ, this.sim, o);
  };

  /* ---------- геометрия ---------- */
  P.pt = function (e) {
    var p = this.svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    var m = this.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    var q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  };
  function snap(q) {
    return {
      x: Math.max(0, Math.min(W, Math.round(q.x / G) * G)),
      y: Math.max(0, Math.min(H, Math.round(q.y / G) * G))
    };
  }
  P.pathSegs = function (a, b) {
    if (a.x === b.x && a.y === b.y) return [];
    if (a.x === b.x || a.y === b.y) return [{ x1: a.x, y1: a.y, x2: b.x, y2: b.y }];
    var dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y), c;
    c = dx >= dy ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
    return [{ x1: a.x, y1: a.y, x2: c.x, y2: c.y }, { x1: c.x, y1: c.y, x2: b.x, y2: b.y }];
  };
  P.isOccupied = function (pt) {
    var i, j, k;
    for (i = 0; i < this.circ.comps.length; i++) {
      var t = E.terminals(this.circ.comps[i]);
      if ((t[0].x === pt.x && t[0].y === pt.y) || (t[1].x === pt.x && t[1].y === pt.y)) return true;
    }
    for (i = 0; i < this.circ.wires.length; i++) {
      var pts = E.wirePoints(this.circ.wires[i]);
      for (j = 0; j < pts.length; j++) if (pts[j][0] === pt.x && pts[j][1] === pt.y) return true;
    }
    return false;
  };

  /* ---------- история ---------- */
  P.mutate = function (fn, noHist) {
    if (!noHist) { this.hist.push(this.json()); if (this.hist.length > 100) this.hist.shift(); }
    fn();
    this.recompute();
  };
  P.undo = function () {
    if (!this.hist.length) return false;
    this.circ = JSON.parse(this.hist.pop());
    if (this.sel && !this.exists(this.sel)) { this.sel = null; this.o.onSelect(null); }
    this.wireStart = null;
    this.recompute();
    return true;
  };
  P.exists = function (s) {
    return (s.k === 'c' ? this.circ.comps : this.circ.wires).some(function (x) { return x.id === s.id; });
  };

  /* ---------- операции ---------- */
  P.setTool = function (tool, type) {
    this.tool = tool; this.placeType = type || null; this.wireStart = null; this.hover = null;
    if (tool === 'place') this.placeRot = 0;
    this.render();
    if (this.o.onTool) this.o.onTool(tool, type);
  };
  P.addComp = function (type, x, y, rot) {
    var self = this, c;
    this.mutate(function () {
      c = E.newComp(type, x, y, self.circ, self.o.defaults(type));
      c.rot = rot || 0;
      self.circ.comps.push(c);
    });
    return c;
  };
  P.select = function (s) {
    this.sel = s;
    this.render();
    this.o.onSelect(s);
  };
  P.selectedComp = function () {
    if (!this.sel || this.sel.k !== 'c') return null;
    var id = this.sel.id;
    return this.circ.comps.filter(function (c) { return c.id === id; })[0] || null;
  };
  P.deleteSel = function () {
    if (!this.sel || this.o.readonly) return;
    var s = this.sel, self = this;
    this.mutate(function () {
      if (s.k === 'c') self.circ.comps = self.circ.comps.filter(function (c) { return c.id !== s.id; });
      else self.circ.wires = self.circ.wires.filter(function (w) { return w.id !== s.id; });
    });
    this.sel = null;
    this.render();
    this.o.onSelect(null);
  };
  P.rotateSel = function () {
    if (this.tool === 'place') { this.placeRot = (this.placeRot + 90) % 360; this.render(); return; }
    var c = this.selectedComp();
    if (!c || this.o.readonly) return;
    this.mutate(function () { c.rot = ((c.rot || 0) + 90) % 360; });
    this.o.onSelect(this.sel);
  };
  P.setProp = function (id, key, val, noHist) {
    var c = this.circ.comps.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    this.mutate(function () { if (key === 'label') c.label = String(val).slice(0, 12); else c.p[key] = val; }, noHist);
  };
  P.toggleSwitch = function (id) {
    var c = this.circ.comps.filter(function (x) { return x.id === id; })[0];
    if (!c || c.type !== 'switch') return;
    this.mutate(function () { c.p.closed = !c.p.closed; }, true);
    this.o.onSelect(this.sel);
  };
  P.replace = function (obj) {
    var self = this;
    this.mutate(function () { self.circ = E.sanitize(obj); });
    this.sel = null; this.wireStart = null;
    this.render();
    this.o.onSelect(null);
  };
  P.clear = function () {
    if (!this.circ.comps.length && !this.circ.wires.length) return;
    var self = this;
    this.mutate(function () { self.circ = E.emptyCircuit(); });
    this.sel = null; this.wireStart = null;
    this.render();
    this.o.onSelect(null);
  };
  P.addWirePath = function (a, b) {
    var self = this, segs = this.pathSegs(a, b);
    if (!segs.length) return;
    this.mutate(function () {
      segs.forEach(function (s) {
        var dup = self.circ.wires.some(function (w) {
          return (w.x1 === s.x1 && w.y1 === s.y1 && w.x2 === s.x2 && w.y2 === s.y2) || (w.x1 === s.x2 && w.y1 === s.y2 && w.x2 === s.x1 && w.y2 === s.y1);
        });
        if (dup) return;
        var ids = self.circ.wires;
        var n = ids.length + 1, used = {};
        ids.forEach(function (w) { used[w.id] = 1; });
        while (used['w' + n]) n++;
        self.circ.wires.push({ id: 'w' + n, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 });
      });
    });
  };

  /* ---------- события ---------- */
  P._bind = function () {
    var self = this, svg = this.svg;
    svg.style.touchAction = 'none';
    svg.addEventListener('pointerdown', function (e) { self.down(e); });
    svg.addEventListener('pointermove', function (e) { self.move(e); });
    svg.addEventListener('pointerup', function (e) { self.up(e); });
    svg.addEventListener('pointerleave', function () { if (self.hover && !self.drag) { self.hover = null; self.render(); } });
    svg.addEventListener('contextmenu', function (e) { e.preventDefault(); if (self.wireStart) { self.wireStart = null; self.render(); } });
    this._key = function (e) {
      if (!svg.isConnected) return;
      var tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); self.undo(); return; }
      if (self.o.readonly) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { if (self.sel) { e.preventDefault(); self.deleteSel(); } }
      else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') self.rotateSel();
      else if (e.key === 'Escape') { if (self.wireStart) { self.wireStart = null; self.render(); } else self.setTool('select'); }
      else if (e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') self.setTool('wire');
    };
    window.addEventListener('keydown', this._key);
  };
  P.destroy = function () { window.removeEventListener('keydown', this._key); };

  P.down = function (e) {
    if (e.button === 2) return;
    var q = this.pt(e), pt = snap(q), t = e.target;
    var cEl = t.closest ? t.closest('[data-cid]') : null;
    var wEl = t.closest ? t.closest('[data-wid]') : null;
    if (this.o.readonly) {
      if (cEl) {
        var cid = cEl.getAttribute('data-cid');
        this.select({ k: 'c', id: cid });
        this.toggleSwitch(cid);
      } else { this.select(null); }
      return;
    }
    if (this.tool === 'wire') { this.wireClick(pt); return; }
    if (this.tool === 'place') {
      var c = this.addComp(this.placeType, pt.x, pt.y, this.placeRot);
      this.tool = 'select'; this.placeType = null; this.hover = null;
      this.sel = { k: 'c', id: c.id };
      this.render();
      this.o.onSelect(this.sel);
      if (this.o.onTool) this.o.onTool('select');
      return;
    }
    if (this.tool === 'erase') {
      if (cEl) { this.sel = { k: 'c', id: cEl.getAttribute('data-cid') }; this.deleteSel(); }
      else if (wEl) { this.sel = { k: 'w', id: wEl.getAttribute('data-wid') }; this.deleteSel(); }
      return;
    }
    // select
    if (cEl) {
      var id = cEl.getAttribute('data-cid');
      var comp = this.circ.comps.filter(function (x) { return x.id === id; })[0];
      if (!comp) return;
      this.drag = { id: id, dx: q.x - comp.x, dy: q.y - comp.y, sx: q.x, sy: q.y, moved: false, before: this.json(), pid: e.pointerId };
      try { this.svg.setPointerCapture(e.pointerId); } catch (err) {}
      this.sel = { k: 'c', id: id };
      this.render();
      this.o.onSelect(this.sel);
    } else if (wEl) {
      this.select({ k: 'w', id: wEl.getAttribute('data-wid') });
    } else {
      this.select(null);
    }
  };

  P.wireClick = function (pt) {
    if (!this.wireStart) { this.wireStart = pt; this.render(); return; }
    if (pt.x === this.wireStart.x && pt.y === this.wireStart.y) { this.wireStart = null; this.render(); return; }
    var occ = this.isOccupied(pt);
    this.addWirePath(this.wireStart, pt);
    this.wireStart = occ ? null : pt;
    this.render();
  };

  P.move = function (e) {
    var q = this.pt(e), pt = snap(q);
    if (this.drag) {
      var d = this.drag;
      if (!d.moved && Math.hypot(q.x - d.sx, q.y - d.sy) > 5) d.moved = true;
      if (d.moved) {
        var comp = this.circ.comps.filter(function (x) { return x.id === d.id; })[0];
        var np = snap({ x: q.x - d.dx, y: q.y - d.dy });
        if (comp && (comp.x !== np.x || comp.y !== np.y)) {
          comp.x = np.x; comp.y = np.y;
          this.sim = E.solve(this.circ);
          this.render();
        }
      }
      return;
    }
    if (this.tool === 'wire' || this.tool === 'place') {
      if (!this.hover || this.hover.x !== pt.x || this.hover.y !== pt.y) { this.hover = pt; this.render(); }
    }
  };

  P.up = function (e) {
    if (!this.drag) return;
    var d = this.drag;
    this.drag = null;
    try { this.svg.releasePointerCapture(e.pointerId); } catch (err) {}
    if (d.moved) {
      this.hist.push(d.before);
      if (this.hist.length > 100) this.hist.shift();
      this.recompute();
    } else {
      var c = this.circ.comps.filter(function (x) { return x.id === d.id; })[0];
      if (c && c.type === 'switch') this.toggleSwitch(c.id);
    }
  };

  /* ---------- экспорт ---------- */
  P.svgString = function (theme) {
    var bb = E.bbox(this.circ), w = (bb.x2 - bb.x1 + 48) * 2, h = (bb.y2 - bb.y1 + 48) * 2;
    return R.staticSVG(this.circ, { theme: theme || 'light', width: w, height: h });
  };
  P.exportPNG = function (theme) {
    var svg = this.svgString(theme);
    return svgToPng(svg);
  };
  function svgToPng(svgStr) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
      img.onload = function () {
        var cv = document.createElement('canvas');
        cv.width = img.naturalWidth || 800; cv.height = img.naturalHeight || 500;
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0);
        try { resolve(cv.toDataURL('image/png')); } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /* ---------- готовые примеры ---------- */
  function W_(c, x1, y1, x2, y2) { c.wires.push({ id: 'w' + (c.wires.length + 1), x1: x1, y1: y1, x2: x2, y2: y2 }); }
  function add(c, type, x, y, rot, p) { var k = E.newComp(type, x, y, c, p); k.rot = rot || 0; c.comps.push(k); return k; }
  var examples = {
    simple: function () {
      var c = E.emptyCircuit();
      add(c, 'battery', 160, 280, 90); add(c, 'lamp', 360, 180, 0); add(c, 'switch', 560, 280, 90, { closed: true });
      W_(c, 160, 240, 160, 180); W_(c, 160, 180, 320, 180); W_(c, 400, 180, 560, 180); W_(c, 560, 180, 560, 240);
      W_(c, 560, 320, 560, 380); W_(c, 560, 380, 160, 380); W_(c, 160, 380, 160, 320);
      return c;
    },
    series: function () {
      var c = E.emptyCircuit();
      add(c, 'battery', 160, 280, 90, { V: 9 }); add(c, 'lamp', 300, 180, 0); add(c, 'lamp', 460, 180, 0); add(c, 'switch', 640, 280, 90, { closed: true });
      W_(c, 160, 240, 160, 180); W_(c, 160, 180, 260, 180); W_(c, 340, 180, 420, 180); W_(c, 500, 180, 640, 180); W_(c, 640, 180, 640, 240);
      W_(c, 640, 320, 640, 380); W_(c, 640, 380, 160, 380); W_(c, 160, 380, 160, 320);
      return c;
    },
    parallel: function () {
      var c = E.emptyCircuit();
      add(c, 'battery', 160, 280, 90); add(c, 'lamp', 300, 280, 90); add(c, 'lamp', 460, 280, 90); add(c, 'ammeter', 600, 280, 90);
      W_(c, 160, 240, 160, 180); W_(c, 160, 180, 600, 180); W_(c, 300, 180, 300, 240); W_(c, 460, 180, 460, 240); W_(c, 600, 180, 600, 240);
      W_(c, 160, 320, 160, 380); W_(c, 160, 380, 600, 380); W_(c, 300, 320, 300, 380); W_(c, 460, 320, 460, 380); W_(c, 600, 320, 600, 380);
      return c;
    },
    measure: function () {
      var c = E.emptyCircuit();
      add(c, 'battery', 160, 280, 90); add(c, 'ammeter', 300, 180, 0); add(c, 'lamp', 480, 180, 0);
      add(c, 'voltmeter', 480, 300, 0); add(c, 'switch', 640, 280, 90, { closed: true });
      W_(c, 160, 240, 160, 180); W_(c, 160, 180, 260, 180); W_(c, 340, 180, 440, 180); W_(c, 520, 180, 640, 180); W_(c, 640, 180, 640, 240);
      W_(c, 640, 320, 640, 380); W_(c, 640, 380, 160, 380); W_(c, 160, 380, 160, 320);
      W_(c, 440, 180, 440, 300); W_(c, 520, 180, 520, 300);
      return c;
    }
  };

  root.Sim = { Editor: Editor, examples: examples, svgToPng: svgToPng, W: W, H: H };
})(window);
