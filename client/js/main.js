var cs = new CSInterface();

var loadedPresetPath = localStorage.getItem('jx_preset') || null;
var quickPresets     = JSON.parse(localStorage.getItem('jx_quick_presets') || '[]');

// ── theme ──────────────────────────────────────────────────────────────────────

var THEMES = {
    amber: { accent: '#c09050', soft: 'rgba(192,144,80,0.10)',  mid: 'rgba(192,144,80,0.28)'  },
    blue:  { accent: '#5090c0', soft: 'rgba(80,144,192,0.10)',  mid: 'rgba(80,144,192,0.28)'  },
    green: { accent: '#6aab7a', soft: 'rgba(106,171,122,0.10)', mid: 'rgba(106,171,122,0.28)' },
    red:   { accent: '#c05060', soft: 'rgba(192,80,96,0.10)',   mid: 'rgba(192,80,96,0.28)'   }
};

function hexToRgb(hex) {
    var h = normalizeHex(hex).replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return {
        r: parseInt(h.substr(0,2),16),
        g: parseInt(h.substr(2,2),16),
        b: parseInt(h.substr(4,2),16)
    };
}

function normalizeHex(hex) {
    hex = (hex || '').toString().replace(/[^0-9a-f]/gi, '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length !== 6) hex = 'c09050';
    return '#' + hex.toLowerCase();
}

function openCustomThemePicker() {
    var current = normalizeHex(localStorage.getItem('jx_theme_custom') || '#c09050');
    cs.evalScript("jx_pickThemeColor('" + current + "')", function (result) {
        var res = parseResult(result);
        if (!res || !res.success || !res.hex) return;
        localStorage.setItem('jx_theme_custom', normalizeHex(res.hex));
        applyTheme('custom');
    });
}

function customThemeFromHex(hex) {
    var c = hexToRgb(hex);
    return {
        accent: hex,
        soft: 'rgba('+c.r+','+c.g+','+c.b+',0.10)',
        mid:  'rgba('+c.r+','+c.g+','+c.b+',0.28)'
    };
}

function applyTheme(name) {
    var t;
    if (name === 'custom') {
        var hex = normalizeHex(localStorage.getItem('jx_theme_custom') || '#c09050');
        t = customThemeFromHex(hex);
        var sw = document.querySelector('.theme-swatch[data-theme="custom"]');
        if (sw) sw.style.setProperty('--swatch', hex);
    } else {
        t = THEMES[name] || THEMES.amber;
    }
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

var UI_LOOKS = {
    classic: { label: 'Classic', radius: '2px', density: '0px', glow: '0' },
    soft:    { label: 'Soft',    radius: '7px', density: '1px', glow: '1' },
    compact: { label: 'Compact', radius: '1px', density: '-2px', glow: '0' }
};

function applyUiLook(name) {
    var look = UI_LOOKS[name] ? name : 'classic';
    var t = UI_LOOKS[look];
    var root = document.documentElement;
    root.style.setProperty('--r', t.radius);
    root.style.setProperty('--ui-density', t.density);
    root.style.setProperty('--ui-glow', t.glow);
    localStorage.setItem('jx_ui_look', look);
    var sel = document.getElementById('uiLookSelect');
    if (sel) sel.value = look;
}

// ── font ───────────────────────────────────────────────────────────────────────

var FONTS = {
    system:    "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
    helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    rounded:   "'SF Pro Rounded', 'Varela Round', 'Nunito', sans-serif",
    inter:     "'Inter', 'Segoe UI', system-ui, sans-serif",
    mono:      "'Menlo', 'Consolas', 'Courier New', monospace",
    serif:     "'Iowan Old Style', 'Palatino', 'Georgia', serif",
    georgia:   "Georgia, 'Times New Roman', Times, serif"
};

function applyFont(name) {
    var stack = FONTS[name] || FONTS.system;
    document.documentElement.style.setProperty('--font-ui', stack);
    localStorage.setItem('jx_font', name);
    var sel = document.getElementById('fontSelect');
    if (sel) sel.value = name;
}

function applyInterfaceMode(mode) {
    document.body.classList.toggle('simple-mode', mode === 'simple');
    localStorage.setItem('jx_interface_mode', mode);
    var sel = document.getElementById('interfaceModeSelect');
    if (sel) sel.value = mode;
}

// ── greeting ───────────────────────────────────────────────────────────────────

var GREETINGS_MORNING = [
    'gm bestie ☀️', 'morning edit goblin 😭', 'timeline just woke up fr ✨', 'fresh project, no crumbs 💅',
    'locking in early is crazy 😭', 'new day new slay 🎬', 'keyframes for breakfast?? 😮‍💨',
    'main character morning 💫', 'we are so back ☀️', 'render queue can wait bestie 💅'
];
var GREETINGS_AFTERNOON = [
    'keep cooking 🔥', 'no because this timeline eats 💅', 'edit mode activated fr 🎬', 'serving keyframes rn ✨',
    'this is giving productive 😭', 'timeline looking expensive 💫', 'let him cook 🔥',
    'average editor W 😮‍💨', 'the comp is comping 💅', 'lowkey locked in 🎧'
];
var GREETINGS_EVENING = [
    'night shift editor arc 🌙', 'still cooking is wild 😭', 'this edit better go platinum 💿', 'cozy timeline era ✨',
    'after dark keyframes hit different 😮‍💨', 'welcome back to the grind bestie 🎬', 'we do not miss 💅',
    'evening flow state unlocked 🎧', 'this comp has aura 💫', 'one more tweak famous last words 😭'
];
var GREETINGS_NIGHT = [
    'sleep schedule found dead 🦉', '3am editor behaviour 😭', 'touch grass tomorrow maybe 🌿', 'night owl final boss 🌙',
    'render goblin hours 💀', 'this is chronically online but valid ✨', 'hydration check bestie 💧',
    'the timeline has you in a chokehold 😮‍💨', 'late-night slay mode 💅', 'one more keyframe surely 😭'
];

function pickGreeting() {
    var h = new Date().getHours();
    var pool = h < 5  ? GREETINGS_NIGHT
             : h < 12 ? GREETINGS_MORNING
             : h < 17 ? GREETINGS_AFTERNOON
             : h < 22 ? GREETINGS_EVENING
             :          GREETINGS_NIGHT;
    return pool[Math.floor(Math.random() * pool.length)];
}

function applyGreeting() {
    var name = (localStorage.getItem('jx_username') || '').trim();
    var el = document.getElementById('greeting');
    if (!el) return;
    var g = pickGreeting();
    if (name) {
        var emoji = g.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g);
        var lastEmoji = emoji ? emoji[emoji.length - 1] : '';
        var text = lastEmoji ? g.replace(lastEmoji, '').trim() : g;
        el.textContent = text + ', ' + name + (lastEmoji ? ' ' + lastEmoji : '');
    } else {
        el.textContent = g;
    }
}

// ── first-run onboarding ──────────────────────────────────────────────────────

var onboardStep = 0;
var ONBOARD_STEPS = [
    { title: 'Let me set this up', sub: 'First, tell me what name to use in the header.' },
    { title: 'Pick the colour', sub: 'I’ll apply it live so you can feel the difference.' },
    { title: 'Choose the UI look', sub: 'Classic, Soft, or Compact — the panel updates while you pick.' },
    { title: 'Pick the font', sub: 'This changes the whole panel typography instantly.' },
    { title: 'Choose what shows', sub: 'Hide sections you do not care about. You can change this later.' }
];

function initOnboarding() {
    if (localStorage.getItem('jx_onboarded') === '1') return;
    var view = document.getElementById('onboardingView');
    if (!view) return;
    view.classList.remove('hidden');

    var nameInput = document.getElementById('onboardName');
    var nextBtn   = document.getElementById('onboardNext');
    var backBtn   = document.getElementById('onboardBack');
    var skipBtn   = document.getElementById('onboardSkip');
    var fontSel   = document.getElementById('onboardFont');

    if (nameInput) {
        nameInput.value = localStorage.getItem('jx_username') || '';
        nameInput.addEventListener('input', function () {
            localStorage.setItem('jx_username', this.value.trim());
            updateOnboardPreviews();
            applyGreeting();
        });
    }

    document.querySelectorAll('.onboard-theme').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.onboard-theme').forEach(function (el) { el.classList.remove('active'); });
            btn.classList.add('active');
            applyTheme(btn.dataset.theme || 'amber');
            updateOnboardPreviews();
        });
    });
    document.querySelectorAll('.onboard-look').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.onboard-look').forEach(function (el) { el.classList.remove('active'); });
            btn.classList.add('active');
            applyUiLook(btn.dataset.look || 'classic');
            updateOnboardPreviews();
        });
    });
    document.querySelectorAll('.onboard-section').forEach(function (cb) {
        cb.addEventListener('change', function () {
            setSectionVisible(cb.dataset.section, cb.checked);
            updateOnboardPreviews();
        });
    });
    if (fontSel) {
        fontSel.addEventListener('change', function () {
            applyFont(this.value);
            updateOnboardPreviews();
        });
    }

    if (nextBtn) nextBtn.addEventListener('click', function () {
        if (onboardStep >= ONBOARD_STEPS.length - 1) finishOnboarding(false);
        else showOnboardStep(onboardStep + 1);
    });
    if (backBtn) backBtn.addEventListener('click', function () { showOnboardStep(onboardStep - 1); });
    if (skipBtn) skipBtn.addEventListener('click', function () { finishOnboarding(true); });

    showOnboardStep(0);
    updateOnboardPreviews();
}

function showOnboardStep(step) {
    onboardStep = Math.max(0, Math.min(ONBOARD_STEPS.length - 1, step));
    var meta = ONBOARD_STEPS[onboardStep];
    var title = document.getElementById('onboardTitle');
    var sub = document.getElementById('onboardSub');
    var progress = document.getElementById('onboardProgress');
    var backBtn = document.getElementById('onboardBack');
    var nextBtn = document.getElementById('onboardNext');

    if (title) title.textContent = meta.title;
    if (sub) sub.textContent = meta.sub;
    if (progress) progress.style.width = (((onboardStep + 1) / ONBOARD_STEPS.length) * 100) + '%';
    if (backBtn) backBtn.style.visibility = onboardStep === 0 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.textContent = onboardStep === ONBOARD_STEPS.length - 1 ? 'Finish' : 'Next';

    document.querySelectorAll('.onboard-step').forEach(function (el) {
        el.classList.toggle('active', parseInt(el.dataset.step, 10) === onboardStep);
    });
}

function updateOnboardPreviews() {
    var name = (localStorage.getItem('jx_username') || '').trim() || 'editor';
    var greetingPreview = document.getElementById('onboardGreetingPreview');
    if (greetingPreview) greetingPreview.textContent = 'gm, ' + name + ' 💅';

    var fontPreview = document.getElementById('onboardFontPreview');
    if (fontPreview) fontPreview.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-ui');

    var visible = 0;
    document.querySelectorAll('.onboard-section').forEach(function (cb) { if (cb.checked) visible++; });
    var sectionPreview = document.getElementById('onboardSectionPreview');
    if (sectionPreview) sectionPreview.textContent = visible + ' section' + (visible === 1 ? '' : 's') + ' visible';
}

function finishOnboarding(skipped) {
    document.querySelectorAll('.section-vis-cb').forEach(function (cb) {
        var onboardingCb = document.querySelector('.onboard-section[data-section="' + cb.dataset.section + '"]');
        if (onboardingCb) cb.checked = onboardingCb.checked;
        setSectionVisible(cb.dataset.section, cb.checked);
    });
    saveSectionVisibility();

    var settingsName = document.getElementById('userNameInput');
    if (settingsName) settingsName.value = localStorage.getItem('jx_username') || '';

    localStorage.setItem('jx_onboarded', '1');
    var view = document.getElementById('onboardingView');
    if (view) view.classList.add('hidden');
    applyGreeting();
    toast(skipped ? 'Skipped setup — defaults are on.' : 'Setup saved — go make something insane 💅', 'success');
}

// ── dev page ───────────────────────────────────────────────────────────────────

var sessionStart = new Date();
var timerPaused = false;
var pausedTotalMs = 0;
var pauseStartedAt = 0;
var actionsRun   = 0;
var actionLog    = [];
var ACTION_LOG_MAX = 30;
var grassNudgeIndex = -1;
var GRASS_NUDGES = [
    'You\'ve been editing for over an hour — definitely touch grass soon 🌿',
    'Tiny human reminder: stretch, blink, drink water, maybe touch grass 😊',
    'The pixels can wait 2 minutes. Your spine would appreciate it 🌱',
    'Over an hour in — heroic, but grass is calling softly 🌿',
    'Quick break suggestion: stand up and let your eyes reboot ✨',
    'Editing marathon detected. Touch grass mode is highly recommended 😄',
    'Your keyframes are safe. Go breathe some outside air for a sec 🌤️'
];

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function openDevView() {
    closeSettings();
    closePresetsView();
    document.getElementById('devView').classList.add('open');
    renderDevView();
}

function closeDevView() {
    document.getElementById('devView').classList.remove('open');
}

function renderDevView() {
    var countEl = document.getElementById('devActionCount');
    var startEl = document.getElementById('devSessionStart');
    var verEl   = document.getElementById('devVersion');
    if (countEl) countEl.textContent = actionsRun;
    if (startEl) startEl.textContent =
        pad2(sessionStart.getHours()) + ':' +
        pad2(sessionStart.getMinutes()) + ':' +
        pad2(sessionStart.getSeconds());
    if (verEl) verEl.textContent = 'v' + CURRENT_VERSION;

    var log = document.getElementById('devLog');
    if (log) {
        log.innerHTML = '';
        if (!actionLog.length) {
            var em = document.createElement('div');
            em.className = 'dev-log-row';
            em.innerHTML = '<span class="dev-log-script" style="color:var(--text-dim)">No actions yet.</span>';
            log.appendChild(em);
        } else {
            actionLog.forEach(function (e) {
                var row = document.createElement('div');
                row.className = 'dev-log-row ' + (e.ok ? 'ok' : 'err');
                row.innerHTML =
                    '<span class="dev-log-time">' + e.t + '</span>' +
                    '<span class="dev-log-script">' + escapeHtml(e.script) + '</span>' +
                    '<span class="dev-log-status">' + (e.ok ? 'ok' : 'fail') + '</span>';
                log.appendChild(row);
            });
        }
    }

    var dump = document.getElementById('devDump');
    if (dump) {
        var lines = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf('jx_') === 0) {
                var v = localStorage.getItem(k);
                if (v && v.length > 120) v = v.substr(0, 120) + '… (' + v.length + ' chars)';
                lines.push(k + ' = ' + v);
            }
        }
        lines.sort();
        dump.textContent = lines.length ? lines.join('\n') : '(empty)';
    }
}

// ── easing resize ──────────────────────────────────────────────────────────────

var EASE_H_MIN = 90, EASE_H_MAX = 520, EASE_H_BIG = 360;

function applyEaseHeight(h) {
    h = Math.max(EASE_H_MIN, Math.min(EASE_H_MAX, h));
    var c = document.getElementById('easeCanvas');
    if (c) c.style.height = h + 'px';
    localStorage.setItem('jx_ease_height', String(Math.round(h)));
    updateEaseBigButton(h);
}

function updateEaseBigButton(h) {
    var btn = document.getElementById('btnEaseBig');
    if (!btn) return;
    btn.textContent = h >= EASE_H_BIG ? 'Small' : 'Big';
    btn.title = h >= EASE_H_BIG ? 'Make graph smaller' : 'Make graph bigger';
}

function initEaseResize() {
    var saved = parseInt(localStorage.getItem('jx_ease_height'), 10);
    if (saved && !isNaN(saved)) applyEaseHeight(saved);

    var handle = document.getElementById('easeResize');
    var canvas = document.getElementById('easeCanvas');
    var bigBtn = document.getElementById('btnEaseBig');
    if (!handle || !canvas) return;

    updateEaseBigButton(canvas.getBoundingClientRect().height || EASE_H_MIN);
    if (bigBtn) {
        bigBtn.addEventListener('click', function (e) {
            var current = canvas.getBoundingClientRect().height || EASE_H_MIN;
            applyEaseHeight(current >= EASE_H_BIG ? 150 : EASE_H_BIG);
            graphEditor.refreshSize();
            e.preventDefault();
            e.stopPropagation();
        });
    }

    var resizeDragging = false, startY = 0, startH = 0;

    handle.addEventListener('mousedown', function (e) {
        resizeDragging = true;
        startY = e.clientY;
        startH = canvas.getBoundingClientRect().height;
        handle.classList.add('dragging');
        e.preventDefault();
        e.stopPropagation();
    });
    window.addEventListener('mousemove', function (e) {
        if (!resizeDragging) return;
        applyEaseHeight(startH + (e.clientY - startY));
        graphEditor.refreshSize();
    });
    window.addEventListener('mouseup', function () {
        if (!resizeDragging) return;
        resizeDragging = false;
        handle.classList.remove('dragging');
    });
}

// ── session timer ──────────────────────────────────────────────────────────────

function initSessionTimer() {
    var el = document.getElementById('sessionTimer');
    if (!el) return;
    localStorage.setItem('jx_edit_timer_start', String(sessionStart.getTime()));
    localStorage.removeItem('jx_timer_paused');
    localStorage.removeItem('jx_timer_paused_total');
    localStorage.removeItem('jx_timer_pause_started');
    el.addEventListener('click', function (e) {
        e.preventDefault();
        sessionStart = new Date();
        pausedTotalMs = 0;
        pauseStartedAt = 0;
        timerPaused = false;
        grassNudgeIndex = -1;
        localStorage.setItem('jx_edit_timer_start', String(sessionStart.getTime()));
        localStorage.setItem('jx_timer_paused_total', '0');
        localStorage.setItem('jx_timer_paused', '0');
        localStorage.removeItem('jx_timer_pause_started');
        updateTimerPauseButton();
        toast('Time spent editing reset 😊', 'success');
        tick();
    });
    function tick() {
        var now = Date.now();
        var effectivePaused = pausedTotalMs + (timerPaused && pauseStartedAt ? now - pauseStartedAt : 0);
        var s = Math.max(0, Math.floor((now - sessionStart.getTime() - effectivePaused) / 1000));
        var h = Math.floor(s / 3600);
        var m = Math.floor((s % 3600) / 60);
        el.textContent = (timerPaused ? 'Paused editing ' : 'Time spent editing ') + h + ':' + pad2(m) + ':' + pad2(s % 60);
        var nudgeIndex = Math.floor((s - 3600) / 900);
        if (s >= 3600 && nudgeIndex > grassNudgeIndex) {
            grassNudgeIndex = nudgeIndex;
            toast(GRASS_NUDGES[nudgeIndex % GRASS_NUDGES.length], 'success');
        }
    }
    tick();
    setInterval(tick, 1000);
    updateTimerPauseButton();
}

function toggleEditingTimerPause() {
    if (timerPaused) {
        if (pauseStartedAt) pausedTotalMs += Date.now() - pauseStartedAt;
        timerPaused = false;
        pauseStartedAt = 0;
        localStorage.setItem('jx_timer_paused_total', String(pausedTotalMs));
        localStorage.removeItem('jx_timer_pause_started');
        localStorage.setItem('jx_timer_paused', '0');
        toast('Editing timer resumed.', 'success');
    } else {
        timerPaused = true;
        pauseStartedAt = Date.now();
        localStorage.setItem('jx_timer_pause_started', String(pauseStartedAt));
        localStorage.setItem('jx_timer_paused', '1');
        toast('Editing timer paused.');
    }
    updateTimerPauseButton();
}

function updateTimerPauseButton() {
    var btn = document.getElementById('devPauseTimer');
    if (btn) btn.textContent = timerPaused ? 'Resume Editing Timer' : 'Pause Editing Timer';
}

// ── per-item visibility ────────────────────────────────────────────────────────

function initItemVisibility() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('jx_items') || '{}'); } catch (e) {}

    document.querySelectorAll('.item-vis-cb').forEach(function (cb) {
        var key = cb.dataset.item;
        var visible = saved[key] !== false;
        cb.checked = visible;
        setItemVisible(key, visible);
        cb.addEventListener('change', function () {
            setItemVisible(key, cb.checked);
            saveItemVisibility();
            if (key === 'animation.beatdetect') setBeatMode(beatMode);
        });
    });

    var toggle = document.getElementById('advVisToggle');
    var panel  = document.getElementById('advVisPanel');
    if (toggle && panel) {
        toggle.addEventListener('click', function () {
            toggle.classList.toggle('open');
            panel.classList.toggle('open');
        });
    }
}

function setItemVisible(key, visible) {
    document.querySelectorAll('[data-vis-item="' + key + '"]').forEach(function (el) {
        el.classList.toggle('vis-hidden', !visible);
    });
}

function saveItemVisibility() {
    var state = {};
    document.querySelectorAll('.item-vis-cb').forEach(function (cb) {
        state[cb.dataset.item] = cb.checked;
    });
    localStorage.setItem('jx_items', JSON.stringify(state));
}

var favoriteMode = localStorage.getItem('jx_favorite_mode') === '1';
var favoriteItems = {};

function initFavorites() {
    try { favoriteItems = JSON.parse(localStorage.getItem('jx_favorites') || '{}'); } catch (e) { favoriteItems = {}; }
    document.querySelectorAll('[data-vis-item]').forEach(function (el) {
        if (!el.classList.contains('tool-btn')) return;
        var key = el.dataset.visItem;
        var star = document.createElement('span');
        star.className = 'favorite-star';
        star.setAttribute('role', 'button');
        star.setAttribute('tabindex', '0');
        star.title = 'Favorite this tool';
        star.textContent = favoriteItems[key] ? '★' : '☆';
        star.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            favoriteItems[key] = !favoriteItems[key];
            if (!favoriteItems[key]) delete favoriteItems[key];
            localStorage.setItem('jx_favorites', JSON.stringify(favoriteItems));
            star.textContent = favoriteItems[key] ? '★' : '☆';
            applyFavoriteMode();
        });
        star.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                star.click();
            }
        });
        el.appendChild(star);
    });
    applyFavoriteMode();
}

function toggleFavoriteMode() {
    favoriteMode = !favoriteMode;
    localStorage.setItem('jx_favorite_mode', favoriteMode ? '1' : '0');
    applyFavoriteMode();
    toast(favoriteMode ? 'Showing favorite tools only.' : 'Showing all tools.');
}

function applyFavoriteMode() {
    document.body.classList.toggle('favorites-mode', favoriteMode);
    var btn = document.getElementById('favoritesBtn');
    if (btn) btn.classList.toggle('active', favoriteMode);
    document.querySelectorAll('[data-vis-item]').forEach(function (el) {
        var key = el.dataset.visItem;
        el.classList.toggle('favorite-filter-hidden', favoriteMode && !favoriteItems[key]);
    });
    document.querySelectorAll('section[data-section]').forEach(function (section) {
        if (!favoriteMode) { section.classList.remove('favorite-empty'); return; }
        var hasFavorite = false;
        section.querySelectorAll('[data-vis-item]').forEach(function (el) {
            if (!el.classList.contains('favorite-filter-hidden')) hasFavorite = true;
        });
        section.classList.toggle('favorite-empty', !hasFavorite);
    });
}

function clearFavorites() {
    favoriteItems = {};
    localStorage.removeItem('jx_favorites');
    document.querySelectorAll('.favorite-star').forEach(function (star) { star.textContent = '☆'; });
    applyFavoriteMode();
    toast('Favorites cleared.');
}

// ── init ───────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('brandVer').textContent        = 'v' + CURRENT_VERSION;
    document.getElementById('settingsVersion').textContent = 'v' + CURRENT_VERSION;

    applyTheme(localStorage.getItem('jx_theme') || 'amber');
    applyUiLook(localStorage.getItem('jx_ui_look') || 'classic');
    applyFont(localStorage.getItem('jx_font') || 'system');
    applyInterfaceMode(localStorage.getItem('jx_interface_mode') || 'full');
    loadLabelSettings();
    bindUI();
    initBeatMode();
    initSectionVisibility();
    initItemVisibility();
    initFavorites();
    graphEditor.init(document.getElementById('easeCanvas'));
    initEaseResize();
    applyGreeting();
    initSessionTimer();
    initOnboarding();

    if (loadedPresetPath) setPresetLoaded(loadedPresetPath);
    initUpdater();
});

// ── bind UI ────────────────────────────────────────────────────────────────────

function bindUI() {
    document.getElementById('favoritesBtn').addEventListener('click', toggleFavoriteMode);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('settingsBack').addEventListener('click', closeSettings);
    document.getElementById('presetsBtn').addEventListener('click', openPresetsView);
    document.getElementById('presetsBack').addEventListener('click', closePresetsView);
    document.getElementById('devBtn').addEventListener('click', openDevView);
    document.getElementById('devBack').addEventListener('click', closeDevView);

    // theme swatches
    document.querySelectorAll('.theme-swatch').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            if (!btn.dataset.theme) return;
            if (btn.dataset.theme === 'custom') {
                e.preventDefault();
                openCustomThemePicker();
                return;
            }
            applyTheme(btn.dataset.theme);
        });
    });

    // font selector
    var fontSel = document.getElementById('fontSelect');
    if (fontSel) {
        fontSel.addEventListener('change', function () { applyFont(this.value); });
    }

    var uiLookSel = document.getElementById('uiLookSelect');
    if (uiLookSel) {
        uiLookSel.addEventListener('change', function () { applyUiLook(this.value); });
    }

    var ifModeSel = document.getElementById('interfaceModeSelect');
    if (ifModeSel) {
        ifModeSel.addEventListener('change', function () { applyInterfaceMode(this.value); });
    }

    // user name
    var nameInp = document.getElementById('userNameInput');
    if (nameInp) {
        nameInp.value = localStorage.getItem('jx_username') || '';
        nameInp.addEventListener('input', function () {
            localStorage.setItem('jx_username', this.value);
            applyGreeting();
        });
    }

    document.getElementById('btnCheckUpdate').addEventListener('click', manualCheckUpdate);

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
    document.getElementById('btnNullFromSel').addEventListener('click', function () {
        run('jx_nullFromSelection()');
    });
    document.getElementById('btnSequence').addEventListener('click', function () {
        var gap = parseFloat(document.getElementById('seqGap').value) || 0;
        run('jx_sequenceLayers(' + gap + ')');
    });
    document.getElementById('btnRenameLayers').addEventListener('click', function () {
        var f = document.getElementById('renameFind').value;
        var r = document.getElementById('renameReplace').value;
        var p = document.getElementById('renamePrefix').value;
        var s = document.getElementById('renameSuffix').value;
        function esc(v) { return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
        run("jx_renameLayers('" + esc(f) + "','" + esc(r) + "','" + esc(p) + "','" + esc(s) + "')");
    });

    // animation tools
    document.getElementById('btnWordAnimate').addEventListener('click', function () {
        var ms  = parseFloat(document.getElementById('wordOffset').value) || 80;
        var sec = (ms / 1000).toFixed(4);
        run('jx_wordByWordAnimate(' + sec + ')');
    });
    document.getElementById('btnSnapToMarkers').addEventListener('click', function () {
        run('jx_snapKeysToMarkers()');
    });

    // pre-release checkbox
    var checkPre = document.getElementById('checkPrerelease');
    if (checkPre) {
        checkPre.checked = localStorage.getItem('jx_prerelease') === '1';
        checkPre.addEventListener('change', function () {
            localStorage.setItem('jx_prerelease', checkPre.checked ? '1' : '0');
        });
    }

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

    // colour preset
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
    document.getElementById('btnDrawMode').addEventListener('click', function () {
        graphEditor.toggleDrawMode();
    });
    document.getElementById('btnApplyEase').addEventListener('click', function () {
        var c    = graphEditor.getCurve();
        var json = JSON.stringify(c).replace(/'/g, "\\'");
        run("jx_applyEase('" + json + "')");
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

    document.getElementById('clearFavorites').addEventListener('click', clearFavorites);
    document.getElementById('rerunOnboarding').addEventListener('click', function () {
        localStorage.removeItem('jx_onboarded');
        closeSettings();
        initOnboarding();
    });
    document.getElementById('devPauseTimer').addEventListener('click', toggleEditingTimerPause);

    document.getElementById('saveCancel').addEventListener('click', closeSaveModal);
    document.getElementById('saveConfirm').addEventListener('click', confirmSave);
    document.getElementById('saveInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter')  confirmSave();
        if (e.key === 'Escape') closeSaveModal();
    });
    document.getElementById('saveModal').addEventListener('click', function (e) {
        if (e.target === this) closeSaveModal();
    });

    // dev page clear storage
    document.getElementById('devClearStorage').addEventListener('click', function () {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf('jx_') === 0) keys.push(k);
        }
        keys.forEach(function (k) { localStorage.removeItem(k); });
        favoriteItems = {};
        favoriteMode = false;
        toast('Cleared ' + keys.length + ' storage keys.');
        updateTimerPauseButton();
        applyFavoriteMode();
        renderDevView();
    });
}

// ── label settings ─────────────────────────────────────────────────────────────

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

// ── colour preset ──────────────────────────────────────────────────────────────

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

// ── quick presets ──────────────────────────────────────────────────────────────

function openPresetsView() {
    closeSettings();
    closeDevView();
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

// ── save modal ─────────────────────────────────────────────────────────────────

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

// ── settings ───────────────────────────────────────────────────────────────────

function openSettings() {
    closePresetsView();
    closeDevView();
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

// ── section visibility ─────────────────────────────────────────────────────────

var SECTIONS = ['layers', 'animation', 'fx', 'colour', 'keyframes', 'easing'];

function initSectionVisibility() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('jx_sections') || '{}'); } catch(e) {}

    document.querySelectorAll('.section-vis-cb').forEach(function(cb) {
        var key = cb.dataset.section;
        var visible = saved[key] !== false;
        cb.checked = visible;
        setSectionVisible(key, visible);
        cb.addEventListener('change', function() {
            setSectionVisible(key, cb.checked);
            saveSectionVisibility();
        });
    });
}

function setSectionVisible(key, visible) {
    var el = document.querySelector('section[data-section="' + key + '"]');
    if (el) el.style.display = visible ? '' : 'none';
}

function saveSectionVisibility() {
    var state = {};
    document.querySelectorAll('.section-vis-cb').forEach(function(cb) {
        state[cb.dataset.section] = cb.checked;
    });
    localStorage.setItem('jx_sections', JSON.stringify(state));
}

// ── beat detection ─────────────────────────────────────────────────────────────

var beatMode = localStorage.getItem('jx_beat_mode') || 'bpm';

function initBeatMode() {
    document.querySelectorAll('.beat-mode-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { setBeatMode(btn.dataset.mode); });
    });
    setBeatMode(beatMode);

    function liveRange(inputId, valId) {
        var inp = document.getElementById(inputId);
        var val = document.getElementById(valId);
        if (!inp || !val) return;
        val.textContent = inp.value;
        inp.addEventListener('input', function() { val.textContent = inp.value; });
    }
    liveRange('bpmSensitivity', 'bpmSensVal');
    liveRange('freqBassThresh',   'freqBassThreshVal');
    liveRange('freqTrebleThresh', 'freqTrebleThreshVal');

    function syncBand(cbId, bodyId) {
        var cb   = document.getElementById(cbId);
        var body = document.getElementById(bodyId);
        if (!cb || !body) return;
        body.classList.toggle('disabled', !cb.checked);
        cb.addEventListener('change', function() { body.classList.toggle('disabled', !cb.checked); });
    }
    syncBand('freqBassEnable',   'freqBassBody');
    syncBand('freqTrebleEnable', 'freqTrebleBody');

    document.getElementById('btnDetectBpm').addEventListener('click',  detectBeats);
    document.getElementById('btnDetectFreq').addEventListener('click', detectBeats);
}

function setBeatMode(mode) {
    beatMode = mode;
    var bp = document.getElementById('beatPanel_bpm');
    var fp = document.getElementById('beatPanel_freq');
    // respect vis-hidden — don't un-hide a panel that the user has hidden via advanced vis
    if (bp) bp.style.display = (mode === 'bpm'  && !bp.classList.contains('vis-hidden')) ? '' : 'none';
    if (fp) fp.style.display = (mode === 'freq' && !fp.classList.contains('vis-hidden')) ? '' : 'none';
    document.querySelectorAll('.beat-mode-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.mode === mode);
    });
    localStorage.setItem('jx_beat_mode', mode);
}

function detectBeats() {
    toast('Finding audio layer...');
    cs.evalScript('jx_getAudioLayerPath()', function(result) {
        var res = parseResult(result);
        if (res && res.success) {
            toast('Analysing...');
            loadAudioBuffer(res.message, function(err, buf) {
                if (err || !buf) { toast('Could not load audio.', 'error'); return; }
                if (beatMode === 'bpm') runBPMDetection(buf);
                else                   runFreqDetection(buf);
            });
        } else {
            toast('No audio layer found in comp.', 'error');
        }
    });
}

function getNode() {
    try { return window.require || require; } catch(e) { return null; }
}

function loadAudioBuffer(filePath, cb) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { cb('no AudioContext', null); return; }

    var nr = getNode();
    if (nr) {
        var fs = nr('fs');
        fs.readFile(filePath, function(err, data) {
            if (err) { cb('read error', null); return; }
            var arrayBuf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            var ctx = new AC();
            ctx.decodeAudioData(arrayBuf, function(decoded) {
                ctx.close(); cb(null, decoded);
            }, function() { ctx.close(); cb('decode', null); });
        });
        return;
    }

    var norm = filePath.replace(/\\/g, '/');
    var url  = norm.indexOf('file://') === 0 ? norm
             : norm.charAt(0) === '/'        ? 'file://' + norm
             :                                 'file:///' + norm;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        var ctx = new AC();
        ctx.decodeAudioData(xhr.response, function(decoded) {
            ctx.close(); cb(null, decoded);
        }, function() { ctx.close(); cb('decode', null); });
    };
    xhr.onerror = function() { cb('load', null); };
    xhr.send();
}

function getMono(buf) {
    if (buf.numberOfChannels === 1) return buf.getChannelData(0);
    var a = buf.getChannelData(0), b = buf.getChannelData(1);
    var mono = new Float32Array(a.length);
    for (var i = 0; i < a.length; i++) mono[i] = (a[i] + b[i]) * 0.5;
    return mono;
}

function lowPassFilter(samples, sr, cutoffHz) {
    var dt = 1.0 / sr, rc = 1.0 / (2 * Math.PI * cutoffHz);
    var alpha = dt / (rc + dt);
    var out = new Float32Array(samples.length);
    out[0] = samples[0];
    for (var i = 1; i < samples.length; i++) out[i] = out[i-1] + alpha * (samples[i] - out[i-1]);
    return out;
}

function highPassFilter(samples, sr, cutoffHz) {
    var dt = 1.0 / sr, rc = 1.0 / (2 * Math.PI * cutoffHz);
    var alpha = rc / (rc + dt);
    var out = new Float32Array(samples.length);
    out[0] = samples[0];
    for (var i = 1; i < samples.length; i++) out[i] = alpha * (out[i-1] + samples[i] - samples[i-1]);
    return out;
}

function runBPMDetection(buf) {
    var sensitivity = parseInt(document.getElementById('bpmSensitivity').value, 10) || 50;
    var sr   = buf.sampleRate;
    var mono = getMono(buf);

    var lp1 = lowPassFilter(mono, sr, 200);
    var env  = new Float32Array(lp1.length);
    for (var i = 0; i < lp1.length; i++) env[i] = Math.abs(lp1[i]);
    var lp2 = lowPassFilter(env, sr, 20);

    var dsStep = Math.max(1, Math.round(sr / 100));
    var ds = [];
    for (var i = 0; i < lp2.length; i += dsStep) ds.push(lp2[i]);
    var dsSr = sr / dsStep;

    var odf = [0];
    for (var i = 1; i < ds.length; i++) odf.push(Math.max(0, ds[i] - ds[i-1]));

    var minLag = Math.max(1, Math.round(dsSr * 60.0 / 200));
    var maxLag = Math.min(ds.length - 1, Math.round(dsSr * 60.0 / 60));
    var bestCorr = -1, bestLag = Math.round(dsSr * 60.0 / 120);
    for (var lag = minLag; lag <= maxLag; lag++) {
        var corr = 0, n = odf.length - lag;
        for (var i = 0; i < n; i++) corr += odf[i] * odf[i + lag];
        if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
    }
    var bpm           = Math.round(dsSr * 60.0 / bestLag);
    var beatPeriodSec = bestLag / dsSr;

    var bestPhase = 0, bestScore = -1;
    for (var phase = 0; phase < bestLag && phase < odf.length; phase++) {
        var score = 0;
        for (var k = phase; k < odf.length; k += bestLag) score += odf[k];
        if (score > bestScore) { bestScore = score; bestPhase = phase; }
    }

    var maxODF = 0;
    for (var i = 0; i < odf.length; i++) if (odf[i] > maxODF) maxODF = odf[i];
    var thresh = maxODF * (1.0 - sensitivity / 100.0) * 0.8;

    var times = [];
    var firstBeatSec = bestPhase / dsSr;
    var winFrames    = Math.round(bestLag * 0.15);
    for (var t = firstBeatSec; t <= buf.duration + 0.001; t += beatPeriodSec) {
        var frame    = Math.round(t * dsSr);
        var localMax = 0;
        for (var f = Math.max(0, frame - winFrames); f <= Math.min(odf.length - 1, frame + winFrames); f++) {
            if (odf[f] > localMax) localMax = odf[f];
        }
        if (localMax >= thresh) times.push(parseFloat(t.toFixed(3)));
    }

    var resEl = document.getElementById('bpmResult');
    if (resEl) resEl.textContent = 'Detected: ' + bpm + ' BPM — ' + times.length + ' markers';

    var json = JSON.stringify(JSON.stringify(times));
    run('jx_placeBeatsFromTimes(' + json + ')');
}

function onsetDetect(signal, sr, threshPct, minGapSec) {
    var winLen = 512, hopLen = 256;
    var hopSec = hopLen / sr;
    var energies = [];
    for (var i = 0; i + winLen <= signal.length; i += hopLen) {
        var sum = 0;
        for (var j = i; j < i + winLen; j++) sum += signal[j] * signal[j];
        energies.push(Math.sqrt(sum / winLen));
    }
    var look = 20;
    var minGapFrames = Math.max(1, Math.round(minGapSec / hopSec));
    var times = [];
    var lastBeat = -minGapFrames;
    for (var f = look; f < energies.length; f++) {
        var slice = energies.slice(Math.max(0, f - look), f);
        var mean  = 0;
        for (var k = 0; k < slice.length; k++) mean += slice[k];
        mean /= slice.length || 1;
        var mult = 1.0 + (threshPct / 100.0) * 2.0;
        if (energies[f] > mean * mult && (f - lastBeat) >= minGapFrames) {
            times.push(parseFloat((f * hopSec).toFixed(3)));
            lastBeat = f;
        }
    }
    return times;
}

function runFreqDetection(buf) {
    var mono = getMono(buf);
    var sr   = buf.sampleRate;

    var bassEnabled   = document.getElementById('freqBassEnable').checked;
    var trebleEnabled = document.getElementById('freqTrebleEnable').checked;
    var bassThresh    = parseInt(document.getElementById('freqBassThresh').value,   10) || 55;
    var trebleThresh  = parseInt(document.getElementById('freqTrebleThresh').value, 10) || 70;
    var bassGap       = (parseFloat(document.getElementById('freqBassGap').value)   || 200) / 1000;
    var trebleGap     = (parseFloat(document.getElementById('freqTrebleGap').value) || 100) / 1000;

    var combined = [];

    if (bassEnabled) {
        var bassSignal = lowPassFilter(mono, sr, 250);
        var bassTimes  = onsetDetect(bassSignal, sr, bassThresh, bassGap);
        for (var i = 0; i < bassTimes.length; i++) combined.push({ t: bassTimes[i], label: 'Bass' });
    }
    if (trebleEnabled) {
        var trebleSignal = highPassFilter(mono, sr, 4000);
        var trebleTimes  = onsetDetect(trebleSignal, sr, trebleThresh, trebleGap);
        for (var i = 0; i < trebleTimes.length; i++) combined.push({ t: trebleTimes[i], label: 'Treble' });
    }

    if (!combined.length) { toast('No beats detected — try lowering the threshold.', 'error'); return; }
    combined.sort(function(a, b) { return a.t - b.t; });

    var json = JSON.stringify(JSON.stringify(combined));
    run('jx_placeBeatsFromTimes(' + json + ')');
}

// ── helpers ────────────────────────────────────────────────────────────────────

function run(script) {
    cs.evalScript(script, function (result) {
        var res = parseResult(result);
        var ok  = !!(res && res.success);
        actionsRun++;
        var d = new Date();
        var t = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
        // store just the function name for readability
        var scriptName = script.split('(')[0];
        actionLog.unshift({ t: t, script: scriptName, ok: ok });
        if (actionLog.length > ACTION_LOG_MAX) actionLog.length = ACTION_LOG_MAX;
        if (res) toast(res.message, ok ? 'success' : 'error');
        var dv = document.getElementById('devView');
        if (dv && dv.classList.contains('open')) renderDevView();
    });
}

function parseResult(raw) {
    try { return JSON.parse(raw); } catch (e) { toast('Something went wrong.', 'error'); return null; }
}

function shortDate() {
    var d = new Date();
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2);
}

// ── toast ──────────────────────────────────────────────────────────────────────

var toastTimer = null;

function toast(msg, type) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className   = 'toast ' + (type || '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('out'); }, 2500);
}
