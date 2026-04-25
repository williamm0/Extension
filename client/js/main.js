var cs = new CSInterface();

var clipboard        = null;
var savedGraphs      = JSON.parse(localStorage.getItem('jx_graphs')  || '[]');
var loadedPresetPath = localStorage.getItem('jx_preset') || null;

// ── INIT ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('brandVer').textContent = 'v' + CURRENT_VERSION;
    document.getElementById('settingsVersion').textContent = 'v' + CURRENT_VERSION;

    bindUI();
    renderGraphLibrary();
    if (loadedPresetPath) setPresetLoaded(loadedPresetPath);
    initUpdater();
});

// ── BINDINGS ──────────────────────────────────────────────────────────────────

function bindUI() {

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('settingsBack').addEventListener('click', closeSettings);

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

    // File zone
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

    // Apply colour
    document.getElementById('btnApplyColor').addEventListener('click', function () {
        if (!loadedPresetPath) return;
        var safe = loadedPresetPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        run("jx_applyFFXPreset('" + safe + "')");
    });

    // Keyframes
    document.getElementById('btnStretch').addEventListener('click', function () {
        run('jx_stretchKeyframesToClip()');
    });
    document.getElementById('btnCopyGraphs').addEventListener('click', doCopyGraphs);
    document.getElementById('btnPasteGraphs').addEventListener('click', doPasteGraphs);
    document.getElementById('btnSaveGraphs').addEventListener('click', openSaveModal);

    // Footer
    document.getElementById('creditLink').addEventListener('click', function (e) {
        e.preventDefault();
        cs.openURLInDefaultBrowser('https://www.tiktok.com/@jx.ffx');
    });

    // Settings clear
    document.getElementById('settingsClearPreset').addEventListener('click', function () {
        loadedPresetPath = null;
        localStorage.removeItem('jx_preset');
        setPresetUnloaded();
        renderSettingsPreset();
        toast('Preset cleared.');
    });

    // Save modal
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

// ── PRESET ────────────────────────────────────────────────────────────────────

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

// ── GRAPHS ────────────────────────────────────────────────────────────────────

function doCopyGraphs() {
    cs.evalScript('jx_copyGraphs()', function (result) {
        var res = parseResult(result);
        if (!res) return;
        if (res.success && res.data) {
            clipboard = res.data;
            document.getElementById('btnPasteGraphs').disabled = false;
            document.getElementById('btnSaveGraphs').disabled  = false;
            toast(res.message, 'success');
        } else {
            toast(res.message, 'error');
        }
    });
}

function doPasteGraphs() {
    if (!clipboard) return;
    pasteData(clipboard);
}

function pasteData(data) {
    var json = JSON.stringify(data);
    var safe = json.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    run("jx_pasteGraphs('" + safe + "')");
}

// ── GRAPH LIBRARY ─────────────────────────────────────────────────────────────

function openSaveModal() {
    if (!clipboard) return;
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
    savedGraphs.push({ id: Date.now().toString(), name: name, date: shortDate(), data: clipboard });
    persist();
    renderGraphLibrary();
    toast('Saved.');
}

function deleteGraph(id) {
    savedGraphs = savedGraphs.filter(function (g) { return g.id !== id; });
    persist();
    renderGraphLibrary();
    renderSettingsGraphs();
}

function persist() {
    localStorage.setItem('jx_graphs', JSON.stringify(savedGraphs));
}

function renderGraphLibrary() {
    var box  = document.getElementById('graphLibrary');
    var list = document.getElementById('graphList');

    if (!savedGraphs.length) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    list.innerHTML    = '';
    savedGraphs.forEach(function (g) { list.appendChild(makeGraphItem(g, false)); });
}

function makeGraphItem(entry, inSettings) {
    var item = document.createElement('div');
    item.className = 'graph-item';

    var nameEl = document.createElement('span');
    nameEl.className   = 'graph-item-name';
    nameEl.textContent = entry.name;

    var date = document.createElement('span');
    date.className   = 'graph-item-date';
    date.textContent = entry.date;

    var del = document.createElement('button');
    del.className = 'graph-item-del';
    del.title     = 'Remove';
    del.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    del.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteGraph(entry.id);
    });

    item.appendChild(nameEl);
    item.appendChild(date);
    item.appendChild(del);

    if (!inSettings) {
        item.addEventListener('click', function (e) {
            if (e.target.closest('.graph-item-del')) return;
            clipboard = entry.data;
            document.getElementById('btnPasteGraphs').disabled = false;
            document.getElementById('btnSaveGraphs').disabled  = false;
            document.querySelectorAll('.graph-item').forEach(function (el) { el.classList.remove('loaded'); });
            item.classList.add('loaded');
            toast('Loaded: ' + entry.name);
        });
    }

    return item;
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────

function openSettings() {
    document.getElementById('settingsView').classList.add('open');
    renderSettingsPreset();
    renderSettingsGraphs();
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

function renderSettingsGraphs() {
    var list  = document.getElementById('settingsGraphList');
    var empty = document.getElementById('settingsGraphEmpty');
    list.innerHTML = '';
    if (!savedGraphs.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    savedGraphs.forEach(function (g) { list.appendChild(makeGraphItem(g, true)); });
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
    var el       = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast ' + (type || '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('out'); }, 2500);
}
