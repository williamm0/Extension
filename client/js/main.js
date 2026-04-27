var cs = new CSInterface();

var loadedPresetPath = localStorage.getItem('jx_preset') || null;
var quickPresets     = JSON.parse(localStorage.getItem('jx_quick_presets') || '[]');

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

window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('brandVer').textContent        = 'v' + CURRENT_VERSION;
    document.getElementById('settingsVersion').textContent = 'v' + CURRENT_VERSION;
    applyTheme(localStorage.getItem('jx_theme') || 'amber');
    loadLabelSettings();
    bindUI();
    graphEditor.init(document.getElementById('easeCanvas'));
    if (loadedPresetPath) setPresetLoaded(loadedPresetPath);
    initUpdater();
});

function bindUI() {
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('settingsBack').addEventListener('click', closeSettings);
    document.getElementById('presetsBtn').addEventListener('click', openPresetsView);
    document.getElementById('presetsBack').addEventListener('click', closePresetsView);

    document.querySelectorAll('.theme-swatch').forEach(function (btn) {
        btn.addEventListener('click', function () { applyTheme(btn.dataset.theme); });
    });

    document.getElementById('btnCheckUpdate').addEventListener('click', manualCheckUpdate);

    // label settings persistence
    ['labelFootage', 'labelText', 'labelEffects'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', saveLabelSettings);
    });

    // layer tools
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
    document.getElementById('btnAutoLabel').addEventListener('click', function () {
        var fl = parseInt(document.getElementById('labelFootage').value) || 8;
        var tl = parseInt(document.getElementById('labelText').value)    || 2;
        var el = parseInt(document.getElementById('labelEffects').value) || 10;
        run('jx_autoLabelLayers(' + fl + ',' + tl + ',' + el + ')');
    });
    document.getElementById('btnCenterAnchor').addEventListener('click', function () {
        run('jx_centerAnchorAll()');
    });

    // animation tools
    document.getElementById('btnWordAnimate').addEventListener('click', function () {
        var ms  = parseFloat(document.getElementById('wordOffset').value) || 80;
        var sec = (ms / 1000).toFixed(4);
        run('jx_wordByWordAnimate(' + sec + ')');
    });
    document.getElementById('btnDetectBeats').addEventListener('click', detectBeats);

    // pre-release checkbox persistence
    var checkPre = document.getElementById('checkPrerelease');
    if (checkPre) {
        checkPre.checked = localStorage.getItem('jx_prerelease') === '1';
        checkPre.addEventListener('change', function () {
            localStorage.setItem('jx_prerelease', checkPre.checked ? '1' : '0');
        });
    }
    document.getElementById('btnSnapToMarkers').addEventListener('click', function () {
        run('jx_snapKeysToMarkers()');
    });

    // fx tools
    document.getElementById('btnEchoTrail').addEventListener('click', function () {
        var steps  = document.getElementById('echoSteps').value  || '3';
        var offset = document.getElementById('echoOffset').value || '0.1';
        run('jx_echoTrail(' + steps + ',' + offset + ')');
    });
    document.getElementById('btnLoopDuplicate').addEventListener('click', function () {
        var repeats = document.getElementById('loopRepeats').value || '2';
        run('jx_loopDuplicate(' + repeats + ')');
    });

    // colour preset file zone
    var zone  = document.getElementById('fileZone');
    var input = document.getElementById('ffxInput');
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
        if (this.files.length) handleFile(this.files[0]);
    });
    zone.addEventListener('dragover', function (e) {
        e.preventDefault(); zone.classList.add('over');
    });
    zone.addEventListener('dragleave', function () { zone.classList.remove('over'); });
    zone.addEventListener('drop', function (e) {
        e.preventDefault(); zone.classList.remove('over');
        var f = e.dataTransfer.files[0];
        if (f && f.name.toLowerCase().endsWith('.ffx')) {
            handleFile(f);
        } else {
            toast('That\'s not a .ffx file.', 'error');
        }
    });
    document.getElementById('btnApplyColor').addEventListener('click', function () {
        if (!loadedPresetPath) return;
        var safe = loadedPresetPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        run("jx_applyFFXPreset('" + safe + "')");
    });

    // keyframes
    document.getElementById('btnStretch').addEventListener('click', function () {
        run('jx_stretchKeyframesToClip()');
    });
    document.getElementById('btnReverseKeys').addEventListener('click', function () {
        run('jx_reverseKeyframes()');
    });

    // easing
    document.getElementById('btnApplyEase').addEventListener('click', function () {
        var v = graphEditor.getEaseValues();
        run('jx_applyEase(' + v.out + ', ' + v.in + ')');
    });
    document.getElementById('btnSaveCurve').addEventListener('click', openSaveModal);

    // quick presets drop zone
    var pdz = document.getElementById('presetDropZone');
    var pfi = document.getElementById('presetFileInput');
    pdz.addEventListener('click', function () { pfi.click(); });
    pfi.addEventListener('change', function () {
        for (var i = 0; i < this.files.length; i++) addQuickPreset(this.files[i]);
        this.value = '';
    });
    pdz.addEventListener('dragover', function (e) { e.preventDefault(); pdz.classList.add('over'); });
    pdz.addEventListener('dragleave', function () { pdz.classList.remove('over'); });
    pdz.addEventListener('drop', function (e) {
        e.preventDefault(); pdz.classList.remove('over');
        var files = e.dataTransfer.files;
        for (var i = 0; i < files.length; i++) {
            if (files[i].name.toLowerCase().endsWith('.ffx')) addQuickPreset(files[i]);
        }
    });

    document.getElementById('creditLink').addEventListener('click', function (e) {
        e.preventDefault();
        cs.openURLInDefaultBrowser('https://www.tiktok.com/@jx.ffx');
    });

    document.getElementById('settingsClearPreset').addEventListener('click', function () {
        loadedPresetPath = null;
        localStorage.removeItem('jx_preset');
        setPresetUnloaded();
        renderSettingsPreset();
        toast('Preset cleared.');
    });

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

// label settings

function loadLabelSettings() {
    var footage = localStorage.getItem('jx_label_footage');
    var text    = localStorage.getItem('jx_label_text');
    var effects = localStorage.getItem('jx_label_effects');
    if (footage) document.getElementById('labelFootage').value = footage;
    if (text)    document.getElementById('labelText').value    = text;
    if (effects) document.getElementById('labelEffects').value = effects;
}

function saveLabelSettings() {
    localStorage.setItem('jx_label_footage', document.getElementById('labelFootage').value);
    localStorage.setItem('jx_label_text',    document.getElementById('labelText').value);
    localStorage.setItem('jx_label_effects', document.getElementById('labelEffects').value);
}

// colour preset

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

// quick presets

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
        toast('"' + name + '" is already in your list.', 'error'); return;
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

// save modal

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

// settings

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

// beat detection

function detectBeats() {
    toast('Finding audio layer...');
    cs.evalScript('jx_getAudioLayerPath()', function(result) {
        var res = parseResult(result);
        if (res && res.success) {
            toast('Analysing audio...');
            loadAndAnalyseAudio(res.message, function(err, times) {
                if (err || !times || !times.length) {
                    fallbackManualBPM();
                    return;
                }
                var json = JSON.stringify(JSON.stringify(times));
                run('jx_placeBeatsFromTimes(' + json + ')');
            });
        } else {
            fallbackManualBPM();
        }
    });
}

function fallbackManualBPM() {
    var row = document.getElementById('beatFallbackRow');
    if (row) row.style.display = '';
    var bpm = document.getElementById('beatBpm').value || '120';
    run('jx_addBeatMarkers(' + bpm + ', 0)');
}

function loadAndAnalyseAudio(filePath, cb) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { cb('no AudioContext', null); return; }
    var xhr = new XMLHttpRequest();
    var url = filePath.indexOf('file://') === 0 ? filePath : 'file://' + filePath;
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        var ctx = new AC();
        ctx.decodeAudioData(xhr.response, function(buf) {
            ctx.close();
            try { cb(null, analyseBeats(buf)); } catch(e) { cb(e, null); }
        }, function() { ctx.close(); cb('decode error', null); });
    };
    xhr.onerror = function() { cb('load error', null); };
    xhr.send();
}

function analyseBeats(buf) {
    var sr      = buf.sampleRate;
    var winSec  = 0.050;
    var hopSec  = 0.025;
    var winLen  = Math.round(winSec * sr);
    var hopLen  = Math.round(hopSec * sr);
    var ch      = buf.getChannelData(0);
    var len     = ch.length;
    var energies = [];
    for (var i = 0; i + winLen <= len; i += hopLen) {
        var sum = 0;
        for (var j = i; j < i + winLen; j++) sum += ch[j] * ch[j];
        energies.push(Math.sqrt(sum / winLen));
    }
    var look  = 20;
    var minGapSec = 0.25;
    var minGapFrames = Math.round(minGapSec / hopSec);
    var times = [];
    var lastBeat = -minGapFrames;
    for (var f = look; f < energies.length; f++) {
        var slice = energies.slice(Math.max(0, f - look), f);
        var mean  = 0;
        for (var k = 0; k < slice.length; k++) mean += slice[k];
        mean /= slice.length;
        if (energies[f] > mean * 1.5 && (f - lastBeat) >= minGapFrames) {
            times.push(parseFloat((f * hopSec).toFixed(3)));
            lastBeat = f;
        }
    }
    return times;
}

// helpers

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

// toast

var toastTimer = null;

function toast(msg, type) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className   = 'toast ' + (type || '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('out'); }, 2500);
}
