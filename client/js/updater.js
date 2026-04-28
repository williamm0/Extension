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

    // Use Node.js https to bypass null-origin CORS block on file:// → https:// XHR
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
        } catch(e) { /* fall through to XHR */ }
    }

    // XHR fallback (environments without Node.js)
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
    return false;
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
    if (!_updateInfo) return;
    var extPath    = cs.getSystemPath(SystemPath.EXTENSION);
    var isWin      = (navigator.platform.toLowerCase().indexOf('win') !== -1);
    var sep        = isWin ? '\\' : '/';
    var scriptPath = extPath + sep + 'update' + sep + (isWin ? 'update.bat' : 'update.command');
    var infoPath   = extPath + sep + 'update' + sep + 'update_info.json';
    var infoJson   = JSON.stringify({
        url:     _updateInfo.downloadUrl,
        version: _updateInfo.tag.replace(/^v/i, ''),
        tag:     _updateInfo.tag
    });

    setBannerText('Launching installer...');
    var btn = document.getElementById('btnUpdate');
    if (btn) btn.disabled = true;

    var pathEsc = infoPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var jsonEsc = infoJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    cs.evalScript("jx_writeFile('" + pathEsc + "','" + jsonEsc + "')", function(result) {
        var res = parseResult(result);
        if (!res || !res.success) {
            setBannerText('Could not write update info.');
            if (btn) { btn.disabled = false; btn.style.display = ''; btn.textContent = 'Retry'; btn.onclick = startUpdate; }
            return;
        }
        launchInstallerScript(scriptPath, isWin);
    });
}

function launchInstallerScript(scriptPath, isWin) {
    var btn = document.getElementById('btnUpdate');
    var nr  = getNode();
    if (!nr) {
        setBannerText('Node unavailable — open release page to install manually.');
        if (btn) { btn.disabled = false; btn.style.display = ''; btn.textContent = 'Open release page'; btn.onclick = function() { cs.openURLInDefaultBrowser(_updateInfo.htmlUrl); }; }
        return;
    }
    try {
        var cp = nr('child_process');
        if (isWin) {
            cp.spawn('cmd.exe', ['/c', 'start', '', 'cmd.exe', '/k', scriptPath],
                     { detached: true, stdio: 'ignore' }).unref();
            setBannerText('Installer running — follow the terminal window.');
            if (btn) btn.style.display = 'none';
        } else {
            // Run bash directly — no execute bit needed, no LaunchServices, no permission dialog
            setBannerText('Installing...');
            if (btn) btn.style.display = 'none';
            var proc = cp.spawn('bash', [scriptPath], { stdio: ['ignore', 'pipe', 'pipe'] });
            proc.stdout.on('data', function(d) {
                var line = d.toString().trim();
                if (line) {
                    if (line.indexOf('ERROR:') === 0) {
                        setBannerText(line.slice(7));
                        setUpdateError();
                    } else {
                        setBannerText(line);
                    }
                }
            });
            proc.stderr.on('data', function() {});
            proc.on('close', function(code) {
                if (code === 0) {
                    setBannerText('Update installed — <strong>restart After Effects</strong> to apply.');
                } else {
                    setUpdateError();
                }
            });
            proc.on('error', function() { setUpdateError(); });
        }
    } catch(e) {
        setBannerText('Could not launch installer.');
        if (btn) { btn.disabled = false; btn.style.display = ''; btn.textContent = 'Open release page'; btn.onclick = function() { cs.openURLInDefaultBrowser(_updateInfo.htmlUrl); }; }
    }
}

function setUpdateError() {
    setBannerText('Update failed. <a href="#" id="updateFallbackLink">View release</a>');
    setProgress(0, false);
    var link = document.getElementById('updateFallbackLink');
    if (link && _updateInfo) link.onclick = function(e) { e.preventDefault(); cs.openURLInDefaultBrowser(_updateInfo.htmlUrl); };
    var btn = document.getElementById('btnUpdate');
    if (btn) { btn.textContent = 'Retry'; btn.disabled = false; btn.style.display = ''; btn.onclick = startUpdate; }
}

function parseResult(raw) {
    try { return JSON.parse(raw); } catch(e) { return null; }
}

function getNode() {
    try { if (typeof cep_node !== 'undefined' && typeof cep_node.require === 'function') return cep_node.require.bind(cep_node); } catch(e) {}
    try { require('fs'); return require; } catch(e) {}
    return null;
}
