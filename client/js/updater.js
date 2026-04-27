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

function processReleaseJson(json, wasAllReleases) {
    try {
        var data    = JSON.parse(json);
        var release = Array.isArray(data) ? data[0] : data;
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

function isNewerVersion(a, b) {
    var pa = a.split('.').map(Number);
    var pb = b.split('.').map(Number);
    for (var i = 0; i < 3; i++) {
        var na = pa[i] || 0, nb = pb[i] || 0;
        if (na > nb) return true;
        if (na < nb) return false;
    }
    return false;
}

function showUpdateBanner() {
    if (!_updateInfo) return;
    var banner = document.getElementById('updateBanner');
    var btn    = document.getElementById('btnUpdate');
    if (!banner) return;
    banner.style.display = 'flex';
    setBannerText('Update available: <strong>' + _updateInfo.tag + (_updateInfo.prerelease ? ' (pre)' : '') + '</strong>');
    setProgress(0, false);
    if (btn) { btn.textContent = 'Update'; btn.disabled = false; btn.style.display = ''; btn.onclick = startUpdate; }
}

function setBannerText(html) {
    var el = document.querySelector('#updateBanner .update-text');
    if (el) el.innerHTML = html;
}

function setProgress(pct, visible) {
    var bar = document.getElementById('updateProgressBar');
    if (!bar) return;
    bar.style.width   = visible ? pct + '%' : '0%';
    bar.style.opacity = visible ? '1' : '0';
}

function startUpdate() {
    if (!_updateInfo || !_updateInfo.downloadUrl) {
        cs.openURLInDefaultBrowser(_updateInfo ? _updateInfo.htmlUrl : 'https://github.com/williamm0/Extension/releases');
        return;
    }
    var nr = getNode();
    if (nr) {
        runNodeUpdate(nr);
    } else {
        cs.openURLInDefaultBrowser(_updateInfo.htmlUrl);
        toast('Download the ZIP and run install.command to update.', 'error');
    }
}

function getNode() {
    try { if (typeof cep_node !== 'undefined' && typeof cep_node.require === 'function') return cep_node.require.bind(cep_node); } catch(e) {}
    try { require('fs'); return require; } catch(e) {}
    return null;
}

function runNodeUpdate(nr) {
    var btn = document.getElementById('btnUpdate');
    setBannerText('Downloading... <strong>0%</strong>');
    setProgress(0, true);
    if (btn) { btn.textContent = 'Cancel'; btn.disabled = false; btn.onclick = cancelUpdate; }

    var os      = nr('os');
    var path    = nr('path');
    var tmpFile = path.join(os.tmpdir(), 'jx_update_' + Date.now() + '.zip');
    var extPath = cs.getSystemPath(SystemPath.EXTENSION);

    // backup settings to a sibling folder so they survive a full wipe
    var backupPath = path.join(path.dirname(extPath), 'jx_settings_backup.json');
    backupSettings(nr('fs'), backupPath);

    downloadFile(nr, _updateInfo.downloadUrl, tmpFile, function(pct) {
        setBannerText('Downloading... <strong>' + pct + '%</strong>');
        setProgress(pct, true);
    }, function(err, filePath) {
        _activeRequest = null;
        if (err) { setUpdateError(); return; }
        setBannerText('Installing...');
        setProgress(100, true);
        if (btn) { btn.style.display = 'none'; }
        installFromZip(nr, filePath, extPath, function(installErr) {
            var fs = nr('fs');
            // restore settings regardless of install result
            restoreSettings(fs, backupPath);
            if (installErr) {
                setUpdateError();
            } else {
                setProgress(100, true);
                setBannerText('Update installed — <strong>restart AE</strong> to apply.');
                if (btn) {
                    btn.textContent = 'Close';
                    btn.style.display = '';
                    btn.disabled  = false;
                    btn.onclick   = function() { document.getElementById('updateBanner').style.display = 'none'; };
                }
            }
        });
    });
}

function cancelUpdate() {
    if (_activeRequest) { try { _activeRequest.destroy(); } catch(e) {} _activeRequest = null; }
    showUpdateBanner();
}

function setUpdateError() {
    setBannerText('Update failed. <a href="#" id="updateFallbackLink">View release</a>');
    setProgress(0, false);
    var link = document.getElementById('updateFallbackLink');
    if (link && _updateInfo) link.onclick = function(e) { e.preventDefault(); cs.openURLInDefaultBrowser(_updateInfo.htmlUrl); };
    var btn = document.getElementById('btnUpdate');
    if (btn) { btn.textContent = 'Retry'; btn.disabled = false; btn.style.display = ''; btn.onclick = startUpdate; }
}

function downloadFile(nr, url, dest, onProgress, onDone) {
    var fs    = nr('fs');
    var https = nr('https');
    var http  = nr('http');

    function go(reqUrl, hops) {
        if (hops > 8) { onDone(new Error('too many redirects')); return; }
        try {
            var isHttps = reqUrl.indexOf('https') === 0;
            var mod     = isHttps ? https : http;
            var req = mod.get(reqUrl, { headers: { 'User-Agent': 'jxtools-updater' } }, function(res) {
                if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
                    res.resume();
                    go(res.headers.location, hops + 1);
                    return;
                }
                var total    = parseInt(res.headers['content-length'] || '0', 10);
                var received = 0;
                var chunks   = [];
                res.on('data', function(chunk) {
                    chunks.push(chunk);
                    received += chunk.length;
                    if (total > 0) onProgress(Math.round(received / total * 100));
                });
                res.on('end', function() {
                    fs.writeFile(dest, Buffer.concat(chunks), function(e) { onDone(e || null, dest); });
                });
                res.on('error', onDone);
            });
            req.on('error', onDone);
            _activeRequest = req;
        } catch(e) { onDone(e); }
    }
    go(url, 0);
}

function installFromZip(nr, zipPath, extPath, onDone) {
    var os   = nr('os');
    var path = nr('path');
    var cp   = nr('child_process');
    var fs   = nr('fs');
    var isWin = process.platform === 'win32';
    var extractDir = path.join(os.tmpdir(), 'jx_ext_' + Date.now());

    var unzipCmd = isWin
        ? 'powershell -Command "Expand-Archive -LiteralPath \'' + zipPath.replace(/'/g, "''") + '\' -DestinationPath \'' + extractDir.replace(/'/g, "''") + '\' -Force"'
        : 'unzip -o "' + zipPath + '" -d "' + extractDir + '"';

    cp.exec(unzipCmd, function(err) {
        if (err) { onDone(err); return; }
        var root = findExtRoot(fs, path, extractDir);
        if (!root) { onDone(new Error('no CSXS found in archive')); return; }
        var copyCmd = isWin
            ? 'xcopy /E /Y /I "' + root + '\\*" "' + extPath + '"'
            : 'cp -r "' + root + '/." "' + extPath + '/"';
        cp.exec(copyCmd, function(copyErr) {
            try { cp.exec(isWin ? 'rmdir /S /Q "' + extractDir + '"' : 'rm -rf "' + extractDir + '"'); } catch(e) {}
            try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch(e) {}
            onDone(copyErr || null);
        });
    });
}

function findExtRoot(fs, path, dir) {
    if (fs.existsSync(path.join(dir, 'CSXS', 'manifest.xml'))) return dir;
    try {
        var entries = fs.readdirSync(dir);
        for (var i = 0; i < entries.length; i++) {
            var sub = path.join(dir, entries[i]);
            try {
                if (fs.statSync(sub).isDirectory() && fs.existsSync(path.join(sub, 'CSXS', 'manifest.xml'))) return sub;
            } catch(e) {}
        }
    } catch(e) {}
    return null;
}

function backupSettings(fs, backupPath) {
    try {
        var backup = {};
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf('jx_') === 0) backup[k] = localStorage.getItem(k);
        }
        fs.writeFileSync(backupPath, JSON.stringify(backup));
    } catch(e) {}
}

function restoreSettings(fs, backupPath) {
    try {
        if (!fs.existsSync(backupPath)) return;
        var raw    = fs.readFileSync(backupPath, 'utf8');
        var backup = JSON.parse(raw);
        Object.keys(backup).forEach(function(k) { localStorage.setItem(k, backup[k]); });
        try { fs.unlinkSync(backupPath); } catch(e) {}
    } catch(e) {}
}
