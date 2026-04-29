var graphEditor = (function () {
    var canvas, ctx, W, H;
    var MX = 14;
    var MY = 30;
    var Y_CENTER = 0.5;
    var Y_RANGE  = 2.0;  // total visible Y span — scroll to adjust
    var Y_MIN, Y_MAX;

    function updateYBounds() {
        Y_MIN = Y_CENTER - Y_RANGE / 2;
        Y_MAX = Y_CENTER + Y_RANGE / 2;
    }
    updateYBounds();

    var h1 = { x: 0.35, y: 0.0 };
    var h2 = { x: 0.65, y: 1.0 };
    var dragging    = null;
    var drawMode    = false;
    var isDrawing   = false;
    var drawPts     = [];
    var savedCurves = JSON.parse(localStorage.getItem('jx_curves') || '[]');
    var graphMenus  = JSON.parse(localStorage.getItem('jx_graph_menus') || '[]');
    var activeMenu  = localStorage.getItem('jx_graph_menu_active') || 'main';
    var customIconSize = parseInt(localStorage.getItem('jx_graph_icon_size'), 10) || 74;
    if (!graphMenus || !graphMenus.length) graphMenus = [{ id: 'main', name: 'Main' }];
    normalizeCurveMenus();

    var PRESETS = {
        linear:    { label: 'Linear',   h1: { x: 0.33, y: 0.33 }, h2: { x: 0.67, y: 0.67 } },
        ease:      { label: 'Ease',     h1: { x: 0.25, y: 0.10 }, h2: { x: 0.25, y: 1.00 } },
        easeIn:    { label: 'In',       h1: { x: 0.42, y: 0.00 }, h2: { x: 1.00, y: 1.00 } },
        easeOut:   { label: 'Out',      h1: { x: 0.00, y: 0.00 }, h2: { x: 0.58, y: 1.00 } },
        easeInOut: { label: 'In/Out',   h1: { x: 0.42, y: 0.00 }, h2: { x: 0.58, y: 1.00 } },
        smooth:    { label: 'Smooth',   h1: { x: 0.80, y: 0.00 }, h2: { x: 0.20, y: 1.00 } },
        snap:      { label: 'Snap',     h1: { x: 0.10, y: 0.00 }, h2: { x: 0.15, y: 1.00 } },
        pop:       { label: 'Pop',      h1: { x: 0.65, y: 0.00 }, h2: { x: 0.85, y: 1.00 } },
        film:      { label: 'Film',     h1: { x: 0.55, y: 0.00 }, h2: { x: 0.45, y: 1.00 } },
        heavy:     { label: 'Heavy',    h1: { x: 0.72, y: 0.00 }, h2: { x: 0.28, y: 1.00 } },
        sharp:     { label: 'Sharp',    h1: { x: 0.15, y: 0.08 }, h2: { x: 0.85, y: 0.92 } },
        settle:    { label: 'Settle',   h1: { x: 0.20, y: 0.00 }, h2: { x: 0.10, y: 1.00 } }
    };

    // ── init ─────────────────────────────────────────────────────────────────────

    function init(el) {
        canvas = el;
        ctx    = canvas.getContext('2d');
        applyCustomIconSize();

        var sr = parseFloat(localStorage.getItem('jx_y_range'));
        if (!isNaN(sr) && sr >= 0.3 && sr <= 10) { Y_RANGE = sr; updateYBounds(); }

        canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
        canvas.addEventListener('mouseleave', onLeave);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        requestAnimationFrame(function () { setupSize(); redraw(); });

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(function () { setupSize(); redraw(); }).observe(canvas);
        }

        renderPresetGrid();
        renderCurveLibrary();
    }

    function setupSize() {
        var r   = canvas.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        W = r.width  || 260;
        H = r.height || 110;
        canvas.width  = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function refreshSize() {
        setupSize();
        redraw();
    }

    // ── coordinate mapping ────────────────────────────────────────────────────────

    function toCanvas(h) {
        var x = MX + h.x * (W - 2 * MX);
        var t = (h.y - Y_MIN) / (Y_MAX - Y_MIN);
        var y = (H - MY) - t * (H - 2 * MY);
        return { x: x, y: y };
    }

    function fromCanvas(cx, cy) {
        var x = clamp01((cx - MX) / (W - 2 * MX));
        var t = 1 - (cy - MY) / (H - 2 * MY);
        var y = Y_MIN + t * (Y_MAX - Y_MIN);
        return { x: x, y: y };
    }

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
    function clampY(v)  { return Math.max(Y_MIN, Math.min(Y_MAX, v)); }

    // ── Y-range zoom (scroll wheel) ───────────────────────────────────────────────

    function setYRange(r) {
        Y_RANGE = Math.max(0.3, Math.min(10.0, r));
        updateYBounds();
        localStorage.setItem('jx_y_range', Y_RANGE.toFixed(3));
        redraw();
    }

    function onWheel(e) {
        e.preventDefault();
        setYRange(Y_RANGE * (e.deltaY > 0 ? 1.12 : 0.89));
    }

    // ── draw mode ─────────────────────────────────────────────────────────────────

    function toggleDrawMode() {
        drawMode  = !drawMode;
        isDrawing = false;
        drawPts   = [];
        dragging   = null;
        canvas.style.cursor = drawMode ? 'crosshair' : '';
        var btn = document.getElementById('btnDrawMode');
        if (btn) btn.classList.toggle('active', drawMode);
        if (drawMode) setGraphPage('premade');
        redraw();
    }

    // Fit a cubic bezier (P0=(0,0), P3=(1,1)) to the drawn pixel points using
    // arc-length parameterization + least-squares for both X and Y independently.
    function fitBezierFromPoints(pts) {
        var lp = [];
        for (var i = 0; i < pts.length; i++) lp.push(fromCanvas(pts[i].x, pts[i].y));
        if (lp.length < 4) return;

        // Downsample to ~60 points for speed
        var sampled = [], stride = Math.max(1, Math.floor(lp.length / 60));
        for (var i = 0; i < lp.length; i += stride) sampled.push(lp[i]);
        if (sampled[sampled.length - 1] !== lp[lp.length - 1]) sampled.push(lp[lp.length - 1]);
        lp = sampled;

        // Normalize: first drawn point → (0,0), last → (1,1)
        var p0 = lp[0], pN = lp[lp.length - 1];
        var xSpan = pN.x - p0.x, ySpan = pN.y - p0.y;
        if (Math.abs(xSpan) < 0.02) return;

        var norm = lp.map(function (p) {
            return {
                x: (p.x - p0.x) / xSpan,
                y: Math.abs(ySpan) > 0.01 ? (p.y - p0.y) / ySpan : 0.5
            };
        });

        // Arc-length parameterization → t ∈ [0,1] for each sample
        var lens = [0];
        for (var i = 1; i < norm.length; i++) {
            var dx = norm[i].x - norm[i - 1].x, dy = norm[i].y - norm[i - 1].y;
            lens.push(lens[i - 1] + Math.sqrt(dx * dx + dy * dy));
        }
        var totalLen = lens[lens.length - 1];
        if (totalLen < 0.001) return;
        var ts = lens.map(function (l) { return l / totalLen; });

        // Least-squares: B(t) = 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³·P3, P0=(0,0), P3=(1,1)
        function fitAxis(vals) {
            var A00 = 0, A01 = 0, A11 = 0, b0 = 0, b1 = 0;
            for (var i = 0; i < ts.length; i++) {
                var t = ts[i];
                var a = 3 * (1 - t) * (1 - t) * t;
                var b = 3 * (1 - t) * t * t;
                var r = vals[i] - t * t * t;
                A00 += a * a; A01 += a * b; A11 += b * b;
                b0  += a * r; b1  += b * r;
            }
            var det = A00 * A11 - A01 * A01;
            if (Math.abs(det) < 1e-10) return [0.33, 0.67];
            return [(A11 * b0 - A01 * b1) / det, (A00 * b1 - A01 * b0) / det];
        }

        var hx = fitAxis(norm.map(function (p) { return p.x; }));
        var hy = fitAxis(norm.map(function (p) { return p.y; }));

        // De-normalize back to logical space
        h1.x = Math.max(0, Math.min(1, p0.x + hx[0] * xSpan));
        h2.x = Math.max(0, Math.min(1, p0.x + hx[1] * xSpan));
        h1.y = clampY(p0.y + hy[0] * ySpan);
        h2.y = clampY(p0.y + hy[1] * ySpan);

        redraw();
    }

    // ── redraw ────────────────────────────────────────────────────────────────────

    function redraw() {
        if (!ctx || !W || !H) return;
        ctx.clearRect(0, 0, W, H);

        var p0 = toCanvas({ x: 0, y: 0 });
        var p3 = toCanvas({ x: 1, y: 1 });

        // faint outer border
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(MX + 0.5, MY + 0.5, W - 2 * MX - 1, H - 2 * MY - 1);

        // unit box [0..1]²
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(p0.x + 0.5, p3.y + 0.5, p3.x - p0.x - 1, p0.y - p3.y - 1);

        // gridlines inside unit box
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth   = 1;
        for (var i = 1; i < 4; i++) {
            var gx = MX + (W - 2 * MX) * i / 4;
            var gy = toCanvas({ x: 0, y: i / 4 });
            line(gx, p3.y, gx, p0.y);
            line(p0.x, gy.y, p3.x, gy.y);
        }

        // y=0 baseline accent
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth   = 1;
        line(p0.x, p0.y, p3.x, p0.y);

        // diagonal dashed reference
        ctx.strokeStyle = 'rgba(255,255,255,0.09)';
        ctx.setLineDash([3, 4]);
        line(p0.x, p0.y, p3.x, p3.y);
        ctx.setLineDash([]);

        var c1 = toCanvas(h1);
        var c2 = toCanvas(h2);

        // handle tangent lines
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth   = 1;
        line(p0.x, p0.y, c1.x, c1.y);
        line(p3.x, p3.y, c2.x, c2.y);

        // bezier curve
        var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c09050';
        ctx.strokeStyle = accent;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
        ctx.stroke();

        // anchor dots
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        dot(p0.x, p0.y, 2.5);
        dot(p3.x, p3.y, 2.5);
        ctx.fillStyle = accent;
        dot(c1.x, c1.y, 3.5);
        dot(c2.x, c2.y, 3.5);

        // freehand sketch preview, drawn last so it stays visible while sketching
        if (drawPts.length > 1) {
            ctx.strokeStyle = accent;
            ctx.lineWidth   = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(drawPts[0].x, drawPts[0].y);
            for (var i = 1; i < drawPts.length; i++) ctx.lineTo(drawPts[i].x, drawPts[i].y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        updateDisplay();
    }

    function line(x1, y1, x2, y2) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    function dot(x, y, r) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // ── mouse events ─────────────────────────────────────────────────────────────

    function hit(mx, my, h) {
        var c = toCanvas(h);
        return Math.hypot(mx - c.x, my - c.y) <= 8;
    }

    function canvasXY(e) {
        var r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function insideCanvas(e) {
        var r = canvas.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right &&
               e.clientY >= r.top  && e.clientY <= r.bottom;
    }

    function onDown(e) {
        if (!canvas) return;
        if (!insideCanvas(e)) return;
        e.preventDefault();
        e.stopPropagation();
        var p = canvasXY(e);
        if (drawMode) {
            isDrawing = true;
            drawPts = [p];
            redraw();
            return;
        }
        if      (hit(p.x, p.y, h1)) dragging = 'h1';
        else if (hit(p.x, p.y, h2)) dragging = 'h2';
    }

    function onMove(e) {
        if (drawMode) {
            if (isDrawing) {
                e.preventDefault();
                drawPts.push(canvasXY(e));
                redraw();
            }
            return;
        }
        if (!dragging) return;
        var p    = canvasXY(e);
        var norm = fromCanvas(p.x, p.y);
        if (dragging === 'h1') { h1.x = clamp01(norm.x); h1.y = clampY(norm.y); }
        else                   { h2.x = clamp01(norm.x); h2.y = clampY(norm.y); }
        redraw();
    }

    function onUp() {
        if (drawMode && isDrawing) {
            isDrawing = false;
            if (drawPts.length >= 4) fitBezierFromPoints(drawPts);
            drawPts = [];
            redraw();
            return;
        }
        dragging = null;
    }

    function onLeave() {
        if (!drawMode || !isDrawing) return;
        isDrawing = false;
        if (drawPts.length >= 4) fitBezierFromPoints(drawPts);
        drawPts = [];
        redraw();
    }

    // ── display ───────────────────────────────────────────────────────────────────

    function updateDisplay() {
        var el = document.getElementById('easeDisplay');
        if (!el) return;
        var v        = easeValues();
        var overshoot = Math.round((-Y_MIN) * 10) / 10;
        var is1to1    = W > 0 && H > 0 &&
                        Math.abs(Y_RANGE - (H - 2 * MY) / (W - 2 * MX)) < 0.08;
        var yLabel    = is1to1 ? '1:1' : (overshoot > 0 ? '±' + overshoot.toFixed(1) : 'unit');
        el.textContent = 'Out ' + v.out + '%  ·  In ' + v.in + '%  ·  Y ' + yLabel;
    }

    function easeValues() {
        return { out: Math.round(h1.x * 100), in: Math.round((1 - h2.x) * 100) };
    }

    // ── presets ───────────────────────────────────────────────────────────────────

    function setPreset(name) {
        var p = PRESETS[name];
        if (!p) return;
        h1 = { x: p.h1.x, y: p.h1.y };
        h2 = { x: p.h2.x, y: p.h2.y };
        redraw();
        setGraphPage('premade');
        document.querySelectorAll('.ease-preset-card').forEach(function (el) {
            el.classList.toggle('active', el.dataset.preset === name);
        });
    }

    function getEaseValues() { return easeValues(); }
    function getCurve()      { return { h1: { x: h1.x, y: h1.y }, h2: { x: h2.x, y: h2.y } }; }

    // ── curve library ─────────────────────────────────────────────────────────────

    function saveCurve(name) {
        savedCurves.push({ id: Date.now().toString(), name: name, date: shortDate(),
                           menuId: activeMenu, h1: { x: h1.x, y: h1.y }, h2: { x: h2.x, y: h2.y } });
        localStorage.setItem('jx_curves', JSON.stringify(savedCurves));
        renderCurveLibrary();
        setGraphPage('custom');
    }

    function addCurves(curves) {
        if (!curves || !curves.length) return 0;
        var added = 0;
        for (var i = 0; i < curves.length; i++) {
            var c = curves[i];
            if (!c || !isFinite(c.h1.x) || !isFinite(c.h1.y) || !isFinite(c.h2.x) || !isFinite(c.h2.y)) continue;
            savedCurves.push({
                id: String(Date.now()) + '_' + i,
                name: c.name || ('Flow Graph ' + (savedCurves.length + 1)),
                date: shortDate(),
                menuId: activeMenu,
                h1: { x: clamp01(parseFloat(c.h1.x)), y: clampRange(parseFloat(c.h1.y)) },
                h2: { x: clamp01(parseFloat(c.h2.x)), y: clampRange(parseFloat(c.h2.y)) }
            });
            added++;
        }
        localStorage.setItem('jx_curves', JSON.stringify(savedCurves));
        renderCurveLibrary();
        if (added) setGraphPage('custom');
        return added;
    }

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
    function clampRange(v) { return Math.max(-Y_RANGE, Math.min(Y_RANGE, v)); }

    function setGraphPage(page) {
        var active = page === 'custom' ? 'custom' : 'premade';
        document.querySelectorAll('[data-graph-tab]').forEach(function (el) {
            el.classList.toggle('active', el.dataset.graphTab === active);
        });
        document.querySelectorAll('[data-graph-page]').forEach(function (el) {
            el.classList.toggle('active', el.dataset.graphPage === active);
        });
        renderCurveLibrary();
    }

    function deleteCurve(id) {
        savedCurves = savedCurves.filter(function (c) { return c.id !== id; });
        localStorage.setItem('jx_curves', JSON.stringify(savedCurves));
        renderCurveLibrary();
    }

    function normalizeCurveMenus() {
        var valid = {};
        for (var i = 0; i < graphMenus.length; i++) valid[graphMenus[i].id] = true;
        if (!valid[activeMenu]) activeMenu = graphMenus[0].id;
        for (var c = 0; c < savedCurves.length; c++) {
            if (!savedCurves[c].menuId || !valid[savedCurves[c].menuId]) savedCurves[c].menuId = graphMenus[0].id;
        }
        localStorage.setItem('jx_graph_menus', JSON.stringify(graphMenus));
        localStorage.setItem('jx_graph_menu_active', activeMenu);
        localStorage.setItem('jx_curves', JSON.stringify(savedCurves));
    }

    function makeMenuId() { return 'menu_' + Date.now() + '_' + Math.floor(Math.random() * 999); }

    function createMenu(name) {
        name = (name || '').replace(/^\s+|\s+$/g, '');
        if (!name) return false;
        var menu = { id: makeMenuId(), name: name.substr(0, 28) };
        graphMenus.push(menu);
        activeMenu = menu.id;
        normalizeCurveMenus();
        renderCurveLibrary();
        return true;
    }

    function setActiveMenu(id) {
        for (var i = 0; i < graphMenus.length; i++) {
            if (graphMenus[i].id === id) {
                activeMenu = id;
                localStorage.setItem('jx_graph_menu_active', activeMenu);
                renderCurveLibrary();
                return;
            }
        }
    }

    function setCustomIconSize(size) {
        customIconSize = Math.max(48, Math.min(140, parseInt(size, 10) || 74));
        localStorage.setItem('jx_graph_icon_size', String(customIconSize));
        applyCustomIconSize();
    }

    function applyCustomIconSize() {
        document.documentElement.style.setProperty('--graph-card-size', customIconSize + 'px');
        var input = document.getElementById('graphIconSize');
        var val = document.getElementById('graphIconSizeVal');
        if (input) input.value = String(customIconSize);
        if (val) val.textContent = String(customIconSize);
    }

    function loadCurve(c) {
        h1 = { x: c.h1.x, y: c.h1.y };
        h2 = { x: c.h2.x, y: c.h2.y };
        redraw();
    }

    function makeCurveSVG(ph1, ph2) {
        var vw = 36, vhUnit = 20, m = 2.5;
        var pad = vhUnit * 0.5;
        var vh  = vhUnit + 2 * pad;
        var p0x = m,      p0y = pad + vhUnit - m;
        var p3x = vw - m, p3y = pad + m;
        function ty(y) { return p0y - y * (vhUnit - 2 * m); }
        var c1x = m + ph1.x * (vw - 2 * m), c1y = ty(ph1.y);
        var c2x = m + ph2.x * (vw - 2 * m), c2y = ty(ph2.y);
        var d = 'M' + p0x.toFixed(1) + ',' + p0y.toFixed(1) +
                ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) +
                ' '  + c2x.toFixed(1) + ',' + c2y.toFixed(1) +
                ' '  + p3x.toFixed(1) + ',' + p3y.toFixed(1);
        return '<svg viewBox="0 0 ' + vw + ' ' + vh + '" fill="none">' +
               '<path d="' + d + '" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>' +
               '</svg>';
    }

    function renderPresetGrid() {
        var container = document.getElementById('easePresetGrid');
        if (!container) return;
        container.innerHTML = '';
        var keys = Object.keys(PRESETS);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i], p = PRESETS[key];
            var btn = document.createElement('button');
            btn.className      = 'ease-preset-card';
            btn.dataset.preset = key;
            btn.title          = p.label;
            btn.innerHTML      = makeCurveSVG(p.h1, p.h2) + '<span>' + p.label + '</span>';
            btn.addEventListener('click', (function (k) { return function () { setPreset(k); }; })(key));
            container.appendChild(btn);
        }
    }

    function renderCurveLibrary() {
        var box  = document.getElementById('curveLibrary');
        var list = document.getElementById('curveList');
        if (!box || !list) return;
        applyCustomIconSize();
        renderMenuTabs();
        var filtered = savedCurves.filter(function (c) { return (c.menuId || graphMenus[0].id) === activeMenu; });
        if (!filtered.length) {
            box.style.display = document.querySelector('[data-graph-tab="custom"].active') ? 'block' : 'none';
            list.innerHTML = '<div class="graph-empty">No graphs in this menu yet.</div>';
            return;
        }
        box.style.display = 'block';
        list.innerHTML    = '';
        filtered.forEach(function (c) { list.appendChild(makeCurveItem(c)); });
    }

    function renderMenuTabs() {
        var tabs = document.getElementById('curveMenuTabs');
        if (!tabs) return;
        tabs.innerHTML = '';
        for (var i = 0; i < graphMenus.length; i++) {
            var menu = graphMenus[i];
            var btn = document.createElement('button');
            btn.className = 'graph-menu-tab' + (menu.id === activeMenu ? ' active' : '');
            btn.textContent = menu.name;
            btn.addEventListener('click', (function(id) { return function() { setActiveMenu(id); }; })(menu.id));
            tabs.appendChild(btn);
        }
    }

    function makeCurveItem(c) {
        var item    = document.createElement('button');
        item.className = 'graph-item';
        item.title = c.name;

        var preview = document.createElement('div');
        preview.className = 'graph-item-preview';
        preview.innerHTML = makeCurveSVG(c.h1, c.h2);

        var nameEl = document.createElement('span');
        nameEl.className   = 'graph-item-name';
        nameEl.textContent = c.name;

        var dateEl = document.createElement('span');
        dateEl.className   = 'graph-item-date';
        dateEl.textContent = c.date;

        var del = document.createElement('button');
        del.className = 'graph-item-del';
        del.title     = 'Remove';
        del.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        del.addEventListener('click', function (e) { e.stopPropagation(); deleteCurve(c.id); });

        item.appendChild(preview);
        item.appendChild(nameEl);
        item.appendChild(dateEl);
        item.appendChild(del);

        item.addEventListener('click', function (e) {
            if (e.target.closest('.graph-item-del')) return;
            loadCurve(c);
            document.querySelectorAll('#curveList .graph-item').forEach(function (el) {
                el.classList.remove('loaded');
            });
            item.classList.add('loaded');
            toast('Loaded: ' + c.name);
        });

        return item;
    }

    function shortDate() {
        var d = new Date();
        return d.getDate() + '/' + (d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2);
    }

    return {
        init:               init,
        setPreset:          setPreset,
        getEaseValues:      getEaseValues,
        getCurve:           getCurve,
        saveCurve:          saveCurve,
        addCurves:          addCurves,
        createMenu:         createMenu,
        setCustomIconSize:  setCustomIconSize,
        getCustomIconSize:  function () { return customIconSize; },
        setGraphPage:       setGraphPage,
        renderCurveLibrary: renderCurveLibrary,
        redraw:             redraw,
        refreshSize:        refreshSize,
        setYRange:          setYRange,
        toggleDrawMode:     toggleDrawMode
    };
}());
