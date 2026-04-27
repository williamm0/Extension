var graphEditor = (function () {
    var canvas, ctx, W, H;
    var M = 14;
    var h1 = { x: 0.35, y: 0.0 };
    var h2 = { x: 0.65, y: 1.0 };
    var dragging    = null;
    var savedCurves = JSON.parse(localStorage.getItem('jx_curves') || '[]');

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

    function init(el) {
        canvas = el;
        ctx    = canvas.getContext('2d');
        canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
        requestAnimationFrame(function () {
            setupSize();
            redraw();
        });
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(function () {
                setupSize();
                redraw();
            }).observe(canvas);
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

    function toCanvas(h) {
        return { x: M + h.x * (W - 2 * M), y: (H - M) - h.y * (H - 2 * M) };
    }

    function fromCanvas(cx, cy) {
        return { x: clamp01((cx - M) / (W - 2 * M)), y: clamp01(1 - (cy - M) / (H - 2 * M)) };
    }

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }

    function redraw() {
        if (!ctx || !W || !H) return;
        ctx.clearRect(0, 0, W, H);
        var p0 = { x: M,     y: H - M };
        var p3 = { x: W - M, y: M     };
        var c1 = toCanvas(h1);
        var c2 = toCanvas(h2);

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth   = 1;
        for (var i = 1; i < 4; i++) {
            var gx = M + (W - 2 * M) * i / 4;
            var gy = M + (H - 2 * M) * i / 4;
            line(gx, M, gx, H - M);
            line(M, gy, W - M, gy);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(M + 0.5, M + 0.5, W - 2 * M - 1, H - 2 * M - 1);

        ctx.strokeStyle = 'rgba(255,255,255,0.09)';
        ctx.setLineDash([3, 4]);
        line(p0.x, p0.y, p3.x, p3.y);
        ctx.setLineDash([]);

        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth   = 1;
        line(p0.x, p0.y, c1.x, c1.y);
        line(p3.x, p3.y, c2.x, c2.y);

        var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c09050';
        ctx.strokeStyle = accent;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        dot(p0.x, p0.y, 2.5);
        dot(p3.x, p3.y, 2.5);
        ctx.fillStyle = accent;
        dot(c1.x, c1.y, 3.5);
        dot(c2.x, c2.y, 3.5);

        updateDisplay();
    }

    function line(x1, y1, x2, y2) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    function dot(x, y, r) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    function hit(mx, my, h) {
        var c = toCanvas(h);
        return Math.hypot(mx - c.x, my - c.y) <= 7;
    }

    function canvasXY(e) {
        var r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onDown(e) {
        var p = canvasXY(e);
        if      (hit(p.x, p.y, h1)) dragging = 'h1';
        else if (hit(p.x, p.y, h2)) dragging = 'h2';
    }

    function onMove(e) {
        if (!dragging) return;
        var p    = canvasXY(e);
        var norm = fromCanvas(p.x, p.y);
        if (dragging === 'h1') { h1.x = norm.x; h1.y = norm.y; }
        else                   { h2.x = norm.x; h2.y = norm.y; }
        redraw();
    }

    function onUp() { dragging = null; }

    function updateDisplay() {
        var v  = easeValues();
        var el = document.getElementById('easeDisplay');
        if (el) el.textContent = 'Out ' + v.out + '%  ·  In ' + v.in + '%';
    }

    function easeValues() {
        return { out: Math.round(h1.x * 100), in: Math.round((1 - h2.x) * 100) };
    }

    function setPreset(name) {
        var p = PRESETS[name];
        if (!p) return;
        h1 = { x: p.h1.x, y: p.h1.y };
        h2 = { x: p.h2.x, y: p.h2.y };
        redraw();
        document.querySelectorAll('.ease-preset-card').forEach(function (el) {
            el.classList.toggle('active', el.dataset.preset === name);
        });
    }

    function getEaseValues() { return easeValues(); }

    function saveCurve(name) {
        savedCurves.push({ id: Date.now().toString(), name: name, date: shortDate(), h1: { x: h1.x, y: h1.y }, h2: { x: h2.x, y: h2.y } });
        localStorage.setItem('jx_curves', JSON.stringify(savedCurves));
        renderCurveLibrary();
    }

    function deleteCurve(id) {
        savedCurves = savedCurves.filter(function (c) { return c.id !== id; });
        localStorage.setItem('jx_curves', JSON.stringify(savedCurves));
        renderCurveLibrary();
    }

    function loadCurve(c) {
        h1 = { x: c.h1.x, y: c.h1.y };
        h2 = { x: c.h2.x, y: c.h2.y };
        redraw();
    }

    function makeCurveSVG(ph1, ph2) {
        var vw = 36, vh = 24, m = 2.5;
        var p0x = m,      p0y = vh - m;
        var p3x = vw - m, p3y = m;
        var c1x = m + ph1.x * (vw - 2 * m);
        var c1y = (vh - m) - ph1.y * (vh - 2 * m);
        var c2x = m + ph2.x * (vw - 2 * m);
        var c2y = (vh - m) - ph2.y * (vh - 2 * m);
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
            var key = keys[i];
            var p   = PRESETS[key];
            var btn = document.createElement('button');
            btn.className        = 'ease-preset-card';
            btn.dataset.preset   = key;
            btn.title            = p.label;
            btn.innerHTML        = makeCurveSVG(p.h1, p.h2) + '<span>' + p.label + '</span>';
            btn.addEventListener('click', (function (k) {
                return function () { setPreset(k); };
            })(key));
            container.appendChild(btn);
        }
    }

    function renderCurveLibrary() {
        var box  = document.getElementById('curveLibrary');
        var list = document.getElementById('curveList');
        if (!box || !list) return;
        if (!savedCurves.length) { box.style.display = 'none'; return; }
        box.style.display = 'block';
        list.innerHTML    = '';
        savedCurves.forEach(function (c) { list.appendChild(makeCurveItem(c)); });
    }

    function makeCurveItem(c) {
        var item = document.createElement('div');
        item.className = 'graph-item';

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
        del.addEventListener('click', function (e) {
            e.stopPropagation();
            deleteCurve(c.id);
        });

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
        saveCurve:          saveCurve,
        renderCurveLibrary: renderCurveLibrary,
        redraw:             redraw
    };
}());
