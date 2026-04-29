var _updateInfo = null; // { tag, downloadUrl, htmlUrl, prerelease }
var _activeRequest = null;

function initUpdater() {
    runUpdateCheck(false, null);
}

function manualCheckUpdate() {
    var btn = document.getElementById('btnCheckUpdate');
    var includePrerelease = document.getElementById('checkPrerelease') && document.getElementById('checkPrerelease').checked;
    if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
    runUpdateCheck(includePrerelease, function(found) {
        if (btn) { btn.disabled = false; btn.textContent = 'Check for Updates'; }
        if (found === false) toast('Already up to date.');
        else if (found === null) toast('Could not reach update server.', 'error');
    });
}

function runUpdateCheck(includePrerelease, callback) {
    var url = includePrerelease
        ? 'https://api.github.com/repos/williamm0/Extension/releases'
        : 'https://api.github.com/repos/williamm0/Extension/releases/latest';

    var nr = getNode();
    if (nr) {
        var https = nr('https');
        var body  = '';
        try {
            var req = https.get(url, {
                headers: {
                    'User-Agent': 'jxtools-cep',
                    'Accept':     'application/vnd.github.v3+json'
                }
            }, function(res) {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    fetchUrlText(res.headers.location, function(err, text) {
                        if (err) { if (callback) callback(null); return; }
                        if (callback) callback(processReleaseJson(text, includePrerelease));
                    });
                    return;
                }
                res.on('data', function(chunk) { body += chunk; });
                res.on('end',  function() {
                    if (res.statusCode === 200) {
                        var found = processReleaseJson(body, includePrerelease);
                        if (callback) callback(found);
                    } else {
                        if (callback) callback(null);
                    }
                });
                res.on('error', function() { if (callback) callback(null); });
            });
            req.on('error', function() { if (callback) callback(null); });
            return;
        } catch(e) {}
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 8000;
    xhr.setRequestHeader('User-Agent', 'jxtools-cep');

    function onData(json) {
        var found = processReleaseJson(json, includePrerelease);
        if (callback) callback(found);
    }

    function onFail() {
        cs.evalScript('jx_fetchUpdateInfo()', function(result) {
            if (result && result.length > 10 && result.charAt(0) === '{') {
                var found = processReleaseJson(result, false);
                if (callback) callback(found);
            } else {
                if (callback) callback(null);
            }
        });
    }

    xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) onData(xhr.responseText);
        else onFail();
    };
    xhr.ontimeout = onFail;
    try { xhr.send(); } catch(e) { onFail(); }
}

function fetchUrlText(url, done) {
    var nr = getNode();
    if (!nr) { done(new Error('Node unavailable')); return; }
    var lib = nr(url.indexOf('https:') === 0 ? 'https' : 'http');
    var body = '';
    var req = lib.get(url, { headers: { 'User-Agent': 'jxtools-cep' } }, function(res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            fetchUrlText(res.headers.location, done);
            return;
        }
        if (res.statusCode !== 200) { done(new Error('HTTP ' + res.statusCode)); return; }
        res.on('data', function(chunk) { body += chunk; });
        res.on('end', function() { done(null, body); });
    });
    req.on('error', done);
}

function processReleaseJson(json, wasAllReleases) {
    try {
        var data    = JSON.parse(json);
        var release = Array.isArray(data) ? pickNewestRelease(data) : data;
        if (!release) return false;
        var tag    = release.tag_name || '';
        var latest = tag.replace(/^v/i, '');
        if (!isNewerVersion(latest, CURRENT_VERSION)) return false;
        var dlUrl = release.zipball_url || null;
        if (release.assets && release.assets.length > 0) {
            dlUrl = release.assets[0].browser_download_url;
        }
        _updateInfo = { tag: tag, downloadUrl: dlUrl, htmlUrl: release.html_url, prerelease: !!release.prerelease };
        showUpdateBanner();
        return true;
    } catch(e) {
        return null;
    }
}

function pickNewestRelease(releases) {
    var newest = null;
    for (var i = 0; i < releases.length; i++) {
        var r = releases[i];
        if (!r || r.draft) continue;
        if (!newest || isNewerVersion((r.tag_name || '').replace(/^v/i, ''), (newest.tag_name || '').replace(/^v/i, ''))) {
            newest = r;
        }
    }
    return newest;
}

function isNewerVersion(a, b) {
    var pa = normalizeVersionParts(a);
    var pb = normalizeVersionParts(b);
    for (var i = 0; i < 3; i++) {
        var na = pa[i] || 0, nb = pb[i] || 0;
        if (na > nb) return true;
        if (na < nb) return false;
    }
    var apre = /pre|beta|alpha|rc/i.test(String(a || ''));
    var bpre = /pre|beta|alpha|rc/i.test(String(b || ''));
    return !apre && bpre;
}

function normalizeVersionParts(v) {
    v = String(v || '').replace(/^v/i, '').match(/\d+/g) || [];
    return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
}

function showUpdateBanner() {
    if (!_updateInfo) return;
    var banner = document.getElementById('updateBanner');
    var btn    = document.getElementById('btnUpdate');
    if (!banner) return;
    banner.style.display = 'flex';
    banner.classList.remove('error', 'done', 'working');
    setBannerText('Update available: <strong>' + _updateInfo.tag + (_updateInfo.prerelease ? ' (pre)' : '') + '</strong>');
    setProgress(0, false);
    if (btn) { btn.textContent = 'Update'; btn.disabled = false; btn.style.display = ''; btn.onclick = startUpdate; }
}

function setBannerText(html) {
    var el = document.querySelector('#updateBanner .update-text');
    if (el) el.innerHTML = html;
}

function setProgress(pct, visible) {
    pct = Math.max(0, Math.min(100, Math.round(pct || 0)));
    var bar = document.getElementById('updateProgressBar');
    var banner = document.getElementById('updateBanner');
    if (bar) {
        bar.style.width   = visible ? pct + '%' : '0%';
        bar.style.opacity = visible ? '1' : '0';
    }
    if (banner) banner.style.setProperty('--update-pct', pct + '%');
}

function startUpdate() {
    if (!_updateInfo || !_updateInfo.downloadUrl) return;
    var btn = document.getElementById('btnUpdate');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }
    var banner = document.getElementById('updateBanner');
    if (banner) { banner.classList.remove('error', 'done'); banner.classList.add('working'); }
    setProgress(0, true);
    installUpdateInPanel(_updateInfo.downloadUrl, _updateInfo.tag, function(err) {
        if (err) {
            setUpdateError(err.message || String(err));
            return;
        }
        setProgress(100, true);
        if (banner) { banner.classList.remove('working'); banner.classList.add('done'); }
        setBannerText('Update installed — <strong>restart After Effects</strong> to load ' + _updateInfo.tag + '.');
        if (btn) { btn.disabled = false; btn.textContent = 'Restart AE'; btn.onclick = function() { toast('Close and reopen After Effects to finish.'); }; }
    });
}

function installUpdateInPanel(url, tag, done) {
    var nr = getNode();
    if (!nr) { done(new Error('Node is unavailable, so the panel cannot self-update.')); return; }
    var fs = nr('fs');
    var os = nr('os');
    var path = nr('path');
    var child = nr('child_process');
    var extPath = cs.getSystemPath(SystemPath.EXTENSION);
    var tmpRoot = path.join(os.tmpdir(), 'jx_update_' + Date.now());
    var zipPath = path.join(tmpRoot, 'jx_update.zip');
    var extractDir = path.join(tmpRoot, 'extracted');
    var backupDir = path.join(os.tmpdir(), 'jx_backup_' + Date.now());

    try {
        mkdirp(tmpRoot);
        mkdirp(extractDir);
    } catch(e) { done(e); return; }

    downloadFile(url, zipPath, function(pct, loaded, total) {
        var pctText = total ? pct + '%' : bytesToMb(loaded) + ' MB';
        setBannerText('Downloading ' + tag + ' — <strong>' + pctText + '</strong>');
        setProgress(total ? pct * 0.55 : 8, true);
    }, function(err) {
        if (err) { cleanup(tmpRoot); done(err); return; }
        setBannerText('Extracting update — <strong>60%</strong>');
        setProgress(60, true);
        unzipArchive(zipPath, extractDir, child, function(unzipErr) {
            if (unzipErr) { cleanup(tmpRoot); done(unzipErr); return; }
            var root = findExtensionRoot(extractDir, fs, path);
            if (!root) { cleanup(tmpRoot); done(new Error('Downloaded ZIP did not contain CSXS/manifest.xml.')); return; }
            setBannerText('Backing up current files — <strong>72%</strong>');
            setProgress(72, true);
            try {
                copyDir(extPath, backupDir, fs, path, ['update_info.json']);
                setBannerText('Installing files — <strong>88%</strong>');
                setProgress(88, true);
                copyDir(root, extPath, fs, path, []);
                cleanup(tmpRoot);
                cleanupOldBackup(backupDir);
                done(null);
            } catch(copyErr) {
                try { copyDir(backupDir, extPath, fs, path, []); } catch(restoreErr) {}
                cleanup(tmpRoot);
                done(copyErr);
            }
        });
    });
}

function downloadFile(url, dest, onProgress, done) {
    var nr = getNode();
    var fs = nr('fs');
    var lib = nr(url.indexOf('https:') === 0 ? 'https' : 'http');
    var file = fs.createWriteStream(dest);
    var finished = false;
    function fail(err) {
        if (finished) return;
        finished = true;
        try { file.close(); } catch(e) {}
        try { fs.unlinkSync(dest); } catch(e) {}
        done(err);
    }
    var req = lib.get(url, { headers: { 'User-Agent': 'jxtools-cep' } }, function(res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            try { file.close(); fs.unlinkSync(dest); } catch(e) {}
            downloadFile(res.headers.location, dest, onProgress, done);
            return;
        }
        if (res.statusCode !== 200) { fail(new Error('Download failed with HTTP ' + res.statusCode + '.')); return; }
        var total = parseInt(res.headers['content-length'], 10) || 0;
        var loaded = 0;
        res.on('data', function(chunk) {
            loaded += chunk.length;
            if (onProgress) onProgress(total ? Math.round((loaded / total) * 100) : 0, loaded, total);
        });
        res.pipe(file);
        file.on('finish', function() {
            if (finished) return;
            finished = true;
            file.close(function() { done(null); });
        });
    });
    req.on('error', fail);
    file.on('error', fail);
}

function unzipArchive(zipPath, extractDir, child, done) {
    child.execFile('/usr/bin/unzip', ['-o', zipPath, '-d', extractDir], function(err) {
        if (!err) { done(null); return; }
        child.execFile('unzip', ['-o', zipPath, '-d', extractDir], function(err2) {
            done(err2 || err);
        });
    });
}

function findExtensionRoot(dir, fs, path) {
    var direct = path.join(dir, 'CSXS', 'manifest.xml');
    if (fs.existsSync(direct)) return dir;
    var entries = fs.readdirSync(dir);
    for (var i = 0; i < entries.length; i++) {
        var child = path.join(dir, entries[i]);
        try {
            if (fs.statSync(child).isDirectory() && fs.existsSync(path.join(child, 'CSXS', 'manifest.xml'))) return child;
        } catch(e) {}
    }
    return null;
}

function copyDir(src, dest, fs, path, skipNames) {
    skipNames = skipNames || [];
    mkdirp(dest);
    var entries = fs.readdirSync(src);
    for (var i = 0; i < entries.length; i++) {
        if (skipNames.indexOf(entries[i]) !== -1) continue;
        var from = path.join(src, entries[i]);
        var to = path.join(dest, entries[i]);
        var st = fs.statSync(from);
        if (st.isDirectory()) {
            copyDir(from, to, fs, path, skipNames);
        } else {
            fs.copyFileSync(from, to);
            try { fs.chmodSync(to, st.mode); } catch(e) {}
        }
    }
}

function mkdirp(dir) {
    var nr = getNode();
    var fs = nr('fs');
    if (fs.existsSync(dir)) return;
    var path = nr('path');
    var parent = path.dirname(dir);
    if (parent && parent !== dir) mkdirp(parent);
    try { fs.mkdirSync(dir); } catch(e) { if (!fs.existsSync(dir)) throw e; }
}

function cleanup(dir) {
    try {
        var nr = getNode();
        var fs = nr('fs');
        if (fs.rmSync) fs.rmSync(dir, { recursive: true, force: true });
        else {
            var child = nr('child_process');
            child.execFileSync('rm', ['-rf', dir]);
        }
    } catch(e) {}
}

function cleanupOldBackup(dir) {
    setTimeout(function() { cleanup(dir); }, 120000);
}

function bytesToMb(bytes) {
    return (bytes / 1048576).toFixed(1);
}

function setUpdateError(msg) {
    var banner = document.getElementById('updateBanner');
    if (banner) { banner.classList.remove('working', 'done'); banner.classList.add('error'); }
    setBannerText((msg || 'Update failed.') + ' <a href="#" id="updateFallbackLink">View release</a>');
    setProgress(0, false);
    var link = document.getElementById('updateFallbackLink');
    if (link && _updateInfo) link.onclick = function(e) { e.preventDefault(); cs.openURLInDefaultBrowser(_updateInfo.htmlUrl); };
    var btn = document.getElementById('btnUpdate');
    if (btn) { btn.textContent = 'Force Retry'; btn.disabled = false; btn.style.display = ''; btn.onclick = startUpdate; }
}

function parseResult(raw) {
    try { return JSON.parse(raw); } catch(e) { return null; }
}

function getNode() {
    try { if (typeof cep_node !== 'undefined' && typeof cep_node.require === 'function') return cep_node.require.bind(cep_node); } catch(e) {}
    try { require('fs'); return require; } catch(e) {}
    return null;
}
