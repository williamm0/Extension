var cs = new CSInterface();

var loadedPresetPath = localStorage.getItem('jx_preset') || null;
var quickPresets     = JSON.parse(localStorage.getItem('jx_quick_presets') || '[]');

// ── THEMES ────────────────────────────────────────────────────────────────────

var THEMES = {
    amber: { accent: '#c09050', soft: 'rgba(192,144,80,0.10)',  mid: 'rgba(192,144,80,0.28)'  },
    blue:  { accent: '#5090c0', soft: 'rgba(80,144,192,0.10)',  mid: 'rgba(80,144,192,0.28)'  },
    green: { accent: '#6aab7a', soft: 'rgba(106,171,122,0.10)', mid: 'rgba(106,171,122,0.28)' },
    red:   { accent: '#c05060', soft: 'rgba(192,80,96,0.10)',   mid: 'rgba(192,80,96,0.28)'   }
};

function applyTheme(name) {
    var t    = THEMES[name] || THEMES.amber;
    var root = document.documentElement;
    root.style.setProperty('--accent',      t.accent);
    root.style.setProperty('--accent-soft', t.soft);
    root.style.setProperty('--accent-mid',  t.mid);
    localStorage.setItem('jx_theme', name);
    document.querySelectorAll('.theme-swatch').forEach(function (el) {
        el.classList.toggle('active', el.dataset.theme === name);
    });
    graphEditor.redraw();
}

// ── INIT ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('brandVer').textContent        = 'v' + CURRENT_VERSION;
    document.getElementById('settingsVersion').textContent = 'v' + CURRENT_VERSION;

    applyTheme(localStorage.getItem('jx_theme') || 'amber');
    bindUI();
    graphEditor.init(document.getElementById('easeCanvas'));
    if (loadedPresetPath) setPresetLoaded(loadedPresetPath);
    initUpdater();
});

// ── BINDINGS ──────────────────────────────────────────────────────────────────

function bindUI() {

    // Settings open/close
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('settingsBack').addEventListener('click', closeSettings);

    // Quick Presets open/close
    document.getElementById('presetsBtn').addEventListener('click', openPresetsView);
    document.getElementById('presetsBack').addEventListener('click', closePresetsView);

    // Theme swatches
    document.querySelectorAll('.theme-swatch').forEach(function (btn) {
        btn.addEventListener('click', function () { applyTheme(btn.dataset.theme); });
    });

    // Check for updates button in settings
    document.getElementById('btnCheckUpdate').addEventListener('click', manualCheckUpdate);

    // Layer tools
    document.getElementById('btnPrecompose').addEventListener('click', function () {
        run('jx_precomposeSelected()');
    });
    document.getElementById('btnFrameBlend').addEventListener('click', function () {
        var mode = document.querySelector('input[name="fbMode"]:checked').value;
        run('jx_enableFrameBlending("' + mode + '")');
    });
    document.getElementById('btnMotionBlur').addEventListener('click', function () {
        run('jx_enableMotionBlur()');
    });
    document.getElementById('btnTrimComp').addEventListener('click', function () {
        run('jx_trimCompToWorkArea()');
    });

    // Colour preset file zone
    var zone  = document.getElementById('fileZone');
    var input = document.getElementById('ffxInput');
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
        if (this.files.length) handleFile(this.files[0]);
    });
    zone.addEventListener('dragover', function (e) {
        e.preventDefault();
        zone.classList.add('over');
    });
    zone.addEventListener('dragleave', function () {
        zone.classList.remove('over');
    });
    zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('over');
        var f = e.dataTransfer.files[0];
        if (f && f.name.toLowerCase().endsWith('.ffx')) {
            handleFile(f);
        } else {
            toast('That\'s not a .ffx file.', 'error');
        }
    });

    // Apply colour preset
    document.getElementById('btnApplyColor').addEventListener('click', function () {
        if (!loadedPresetPath) return;
        var safe = loadedPresetPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        run("jx_applyFFXPreset('" + safe + "')");
    });

    // Keyframe stretch
    document.getElementById('btnStretch').addEventListener('click', function () {
        run('jx_stretchKeyframesToClip()');
    });

    // Easing presets
    document.querySelectorAll('.preset-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            graphEditor.setPreset(btn.dataset.preset);
        });
    });

    // Apply ease
    document.getElementById('btnApplyEase').addEventListener('click', function () {
        var v = graphEditor.getEaseValues();
        run('jx_applyEase(' + v.out + ', ' + v.in + ')');
    });

    // Save curve
    document.getElementById('btnSaveCurve').addEventListener('click', openSaveModal);

    // Quick Presets drop zone
    var pdz = document.getElementById('presetDropZone');
    var pfi = document.getElementById('presetFileInput');
    pdz.addEventListener('click', function () { pfi.click(); });
    pfi.addEventListener('change', function () {
        for (var i = 0; i < this.files.length; i++) addQuickPreset(this.files[i]);
        this.value = '';
    });
    pdz.addEventListener('dragover', function (e) {
        e.preventDefault();
        pdz.classList.add('over');
    });
    pdz.addEventListener('dragleave', function () { pdz.classList.remove('over'); });
    pdz.addEventListener('drop', function (e) {
        e.preventDefault();
        pdz.classList.remove('over');
        var files = e.dataTransfer.files;
        for (var i = 0; i < files.length; i++) {
            if (files[i].name.toLowerCase().endsWith('.ffx')) addQuickPreset(files[i]);
        }
    });

    // Footer
    document.getElementById('creditLink').addEventListener('click', function (e) {
        e.preventDefault();
        cs.openURLInDefaultBrowser('https://www.tiktok.com/@jx.ffx');
    });

    // Settings — clear colour preset
    document.getElementById('settingsClearPreset').addEventListener('click', function () {
        loadedPresetPath = null;
        localStorage.removeItem('jx_preset');
        setPresetUnloaded();
        renderSettingsPreset();
        toast('Preset cleared.');
    });

    // Save curve modal
    document.getElementById('saveCancel').addEventListener('click', closeSaveModal);
    document.getElementById('saveConfirm').addEventListener('click', confirmSave);
    document.getElementById('saveInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter')  confirmSave();
        if (e.key === 'Escape') closeSaveModal();
    });
    document.getElementById('saveModal').addEventListener('click', function (e) {
        if (e.target === this) closeSaveModal();
    });
}

// ── COLOUR PRESET ─────────────────────────────────────────────────────────────

function handleFile(file) {
    var path = file.path || '';
    if (!path) { toast('Couldn\'t read the file path.', 'error'); return; }
    loadedPresetPath = path;
    localStorage.setItem('jx_preset', path);
    setPresetLoaded(path);
    toast('Preset loaded.');
}

function setPresetLoaded(path) {
    var name = path.split('/').pop().split('\\').pop();
    document.getElementById('fileZoneName').textContent = name;
    document.getElementById('fileZoneHint').style.display = 'none';
    document.getElementById('fileZone').classList.add('loaded');
    document.getElementById('btnApplyColor').disabled = false;
    renderSettingsPreset();
}

function setPresetUnloaded() {
    document.getElementById('fileZoneName').textContent = 'Drop your .ffx file here';
    document.getElementById('fileZoneHint').style.display = '';
    document.getElementById('fileZone').classList.remove('loaded');
    document.getElementById('btnApplyColor').disabled = true;
}

// ── QUICK PRESETS ─────────────────────────────────────────────────────────────

function openPresetsView() {
    closeSettings();
    document.getElementById('presetsView').classList.add('open');
    renderPresetsList();
}

function closePresetsView() {
    document.getElementById('presetsView').classList.remove('open');
}

function addQuickPreset(file) {
    var path = file.path || '';
    if (!path) { toast('Couldn\'t read file path.', 'error'); return; }
    var name = file.name.replace(/\.ffx$/i, '');
    if (quickPresets.some(function (p) { return p.path === path; })) {
        toast('"' + name + '" is already in your list.', 'error');
        return;
    }
    quickPresets.push({ id: Date.now().toString(), name: name, path: path });
    localStorage.setItem('jx_quick_presets', JSON.stringify(quickPresets));
    renderPresetsList();
    toast('Added: ' + name);
}

function removeQuickPreset(id) {
    quickPresets = quickPresets.filter(function (p) { return p.id !== id; });
    localStorage.setItem('jx_quick_presets', JSON.stringify(quickPresets));
    renderPresetsList();
}

function renderPresetsList() {
    var list  = document.getElementById('presetsList');
    var empty = document.getElementById('presetsEmpty');
    if (!list) return;
    list.innerHTML = '';
    if (!quickPresets.length) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    var wrap = document.createElement('div');
    wrap.className = 'graph-library';
    wrap.style.marginTop = '0';
    quickPresets.forEach(function (preset) {
        var item = document.createElement('div');
        item.className = 'preset-item';

        var nameEl = document.createElement('span');
        nameEl.className   = 'preset-item-name';
        nameEl.textContent = preset.name;

        var del = document.createElement('button');
        del.className = 'graph-item-del';
        del.title     = 'Remove';
        del.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        del.addEventListener('click', function (e) {
            e.stopPropagation();
            removeQuickPreset(preset.id);
        });

        item.appendChild(nameEl);
        item.appendChild(del);

        item.addEventListener('click', function (e) {
            if (e.target.closest('.graph-item-del')) return;
            var safe = preset.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            run("jx_applyFFXPreset('" + safe + "')");
        });

        wrap.appendChild(item);
    });
    list.appendChild(wrap);
}

// ── SAVE MODAL ────────────────────────────────────────────────────────────────

function openSaveModal() {
    document.getElementById('saveModal').classList.remove('hidden');
    document.getElementById('saveInput').value = '';
    setTimeout(function () { document.getElementById('saveInput').focus(); }, 60);
}

function closeSaveModal() {
    document.getElementById('saveModal').classList.add('hidden');
}

function confirmSave() {
    var name = document.getElementById('saveInput').value.trim();
    if (!name) return;
    closeSaveModal();
    graphEditor.saveCurve(name);
    toast('Saved.');
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────

function openSettings() {
    closePresetsView();
    document.getElementById('settingsView').classList.add('open');
    renderSettingsPreset();
}

function closeSettings() {
    document.getElementById('settingsView').classList.remove('open');
}

function renderSettingsPreset() {
    var el = document.getElementById('settingsPath');
    if (loadedPresetPath) {
        el.textContent = loadedPresetPath.split('/').pop().split('\\').pop();
        el.title = loadedPresetPath;
    } else {
        el.textContent = 'None loaded';
        el.title = '';
    }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function run(script) {
    cs.evalScript(script, function (result) {
        var res = parseResult(result);
        if (!res) return;
        toast(res.message, res.success ? 'success' : 'error');
    });
}

function parseResult(raw) {
    try { return JSON.parse(raw); } catch (e) { toast('Something went wrong.', 'error'); return null; }
}

function shortDate() {
    var d = new Date();
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2);
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

var toastTimer = null;

function toast(msg, type) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className   = 'toast ' + (type || '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('out'); }, 2500);
}
