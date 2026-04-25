// Auto-updater — checks GitHub releases and installs in place.
// Requires Node.js integration (--enable-nodejs in manifest.xml).

var UPDATE_API = 'https://api.github.com/repos/williamm0/Extension/releases/latest';

function initUpdater() {
    if (typeof require === 'undefined') return;
    setTimeout(checkForUpdate, 1200);
}

function checkForUpdate() {
    var https = require('https');
    var req = https.get({
        hostname: 'api.github.com',
        path: '/repos/williamm0/Extension/releases/latest',
        headers: {
            'User-Agent': 'jx-extension/' + CURRENT_VERSION,
            'Accept': 'application/vnd.github.v3+json'
        }
    }, function (res) {
        var raw = '';
        res.on('data', function (c) { raw += c; });
        res.on('end', function () {
            try {
                var release = JSON.parse(raw);
                if (!release.tag_name) return;
                var latest = release.tag_name.replace(/^v/, '');
                if (isNewer(latest, CURRENT_VERSION)) {
                    onUpdateFound(release);
                }
            } catch (e) {}
        });
    });
    req.on('error', function () {});
    req.end();
}

function isNewer(a, b) {
    var av = a.split('.').map(Number);
    var bv = b.split('.').map(Number);
    for (var i = 0; i < Math.max(av.length, bv.length); i++) {
        if ((av[i] || 0) > (bv[i] || 0)) return true;
        if ((av[i] || 0) < (bv[i] || 0)) return false;
    }
    return false;
}

function onUpdateFound(release) {
    // Prefer an explicit .zip release asset; fall back to source zipball
    var zipUrl = release.zipball_url;
    for (var i = 0; i < (release.assets || []).length; i++) {
        if (/\.zip$/i.test(release.assets[i].name)) {
            zipUrl = release.assets[i].browser_download_url;
            break;
        }
    }
    window._updateUrl     = zipUrl;
    window._updateVersion = release.tag_name;

    var banner  = document.getElementById('updateBanner');
    var tagEl   = document.getElementById('updateTag');
    if (banner)  banner.style.display = 'flex';
    if (tagEl)   tagEl.textContent = release.tag_name;
}

function doInstallUpdate() {
    var url = window._updateUrl;
    if (!url) return;

    var path = require('path');
    var os   = require('os');
    var fs   = require('fs');

    // Extension root is two levels above client/js
    var extRoot = path.resolve(__dirname, '..', '..');
    try { extRoot = fs.realpathSync(extRoot); } catch (e) {}

    var tmpZip = path.join(os.tmpdir(), 'jx-ext-update.zip');
    var tmpDir = path.join(os.tmpdir(), 'jx-ext-' + Date.now());

    setStatus('Downloading...');
    disableUpdateBtn();

    downloadFile(url, tmpZip, function (err) {
        if (err) { setStatus('Download failed.'); return; }
        setStatus('Unpacking...');

        extractZip(tmpZip, tmpDir, function (err) {
            if (err) { setStatus('Unpack failed.'); return; }

            var entries = [];
            try { entries = fs.readdirSync(tmpDir); } catch (e) {}

            // GitHub source zips wrap everything in a subfolder
            var srcDir = tmpDir;
            if (entries.length === 1) {
                var candidate = path.join(tmpDir, entries[0]);
                try {
                    if (fs.statSync(candidate).isDirectory()) srcDir = candidate;
                } catch (e) {}
            }

            copyDirSync(srcDir, extRoot, fs, path);
            cleanup(tmpZip, tmpDir, fs);

            setStatus('Done.');
            setReloadBtn();
        });
    });
}

// ── Download with redirect following ─────────────────────────────────────────

function downloadFile(url, dest, cb) {
    var fs      = require('fs');
    var https   = require('https');
    var http    = require('http');
    var urlMod  = require('url');

    function fetch(u, hops) {
        if (hops > 12) { cb(new Error('Too many redirects')); return; }
        var p    = urlMod.parse(u);
        var mod  = p.protocol === 'https:' ? https : http;
        var opts = { hostname: p.hostname, port: p.port, path: p.path, headers: { 'User-Agent': 'jx-extension' } };
        mod.get(opts, function (res) {
            var code = res.statusCode;
            if (code === 301 || code === 302 || code === 307 || code === 308) {
                fetch(res.headers.location, hops + 1);
            } else if (code === 200) {
                var f = fs.createWriteStream(dest);
                res.pipe(f);
                f.on('finish', function () { f.close(); cb(null); });
                f.on('error', cb);
            } else {
                cb(new Error('HTTP ' + code));
            }
        }).on('error', cb);
    }
    fetch(url, 0);
}

// ── Extract ───────────────────────────────────────────────────────────────────

function extractZip(zipPath, destDir, cb) {
    var cp = require('child_process');
    var os = require('os');
    var fs = require('fs');
    try { fs.mkdirSync(destDir, { recursive: true }); } catch (e) {}
    try {
        if (os.platform() === 'win32') {
            cp.execSync(
                'powershell -NoProfile -Command "Expand-Archive -LiteralPath \'' +
                zipPath + '\' -DestinationPath \'' + destDir + '\' -Force"',
                { timeout: 60000 }
            );
        } else {
            cp.execSync('unzip -o "' + zipPath + '" -d "' + destDir + '"', { timeout: 60000 });
        }
        cb(null);
    } catch (e) { cb(e); }
}

// ── File copy ─────────────────────────────────────────────────────────────────

function copyDirSync(src, dest, fs, path) {
    var items = [];
    try { items = fs.readdirSync(src); } catch (e) { return; }
    items.forEach(function (name) {
        var s = path.join(src, name);
        var d = path.join(dest, name);
        try {
            if (fs.statSync(s).isDirectory()) {
                try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
                copyDirSync(s, d, fs, path);
            } else {
                fs.copyFileSync(s, d);
            }
        } catch (e) {}
    });
}

function cleanup(zip, dir, fs) {
    try { fs.unlinkSync(zip); } catch (e) {}
    try {
        if (fs.rmSync) fs.rmSync(dir, { recursive: true, force: true });
        else           fs.rmdirSync(dir, { recursive: true });
    } catch (e) {}
}

// ── Banner helpers ─────────────────────────────────────────────────────────────

function setStatus(msg) {
    var el = document.getElementById('updateStatus');
    if (el) el.textContent = msg;
}

function disableUpdateBtn() {
    var btn = document.getElementById('btnUpdate');
    if (btn) btn.disabled = true;
}

function setReloadBtn() {
    var btn = document.getElementById('btnUpdate');
    if (btn) {
        btn.textContent = 'Reopen';
        btn.disabled    = false;
        btn.onclick     = function () { window.location.reload(); };
    }
}
