// Runs automatically on load
function initUpdater() {
    runUpdateCheck(null);
}

// Called by the "Check for Updates" button in Settings
function manualCheckUpdate() {
    var btn = document.getElementById('btnCheckUpdate');
    if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
    runUpdateCheck(function (found) {
        if (btn) { btn.disabled = false; btn.textContent = 'Check for Updates'; }
        if (found === false) toast('Already up to date.');
        else if (found === null) toast('Could not reach update server.', 'error');
        // found === true means banner was already shown
    });
}

function runUpdateCheck(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.github.com/repos/williamm0/Extension/releases/latest', true);
    xhr.timeout = 5000;

    function onData(json) {
        var found = processUpdateJson(json);
        if (callback) callback(found);
    }

    // Fallback: ask ExtendScript to run curl so it works even when
    // AE's CEP browser has restricted network access
    function onFail() {
        cs.evalScript('jx_fetchUpdateInfo()', function (result) {
            if (result && result.length > 10 && result.charAt(0) === '{') {
                var found = processUpdateJson(result);
                if (callback) callback(found);
            } else {
                if (callback) callback(null);
            }
        });
    }

    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) onData(xhr.responseText);
        else onFail();
    };
    xhr.ontimeout = onFail;
    try { xhr.send(); } catch (e) { onFail(); }
}

function processUpdateJson(json) {
    try {
        var data   = JSON.parse(json);
        var tag    = data.tag_name || '';
        var latest = tag.replace(/^v/i, '');
        if (isNewerVersion(latest, CURRENT_VERSION)) {
            showUpdateBanner(tag, data.html_url);
            return true;
        }
        return false;
    } catch (e) {
        return null;
    }
}

function isNewerVersion(a, b) {
    var pa = a.split('.').map(Number);
    var pb = b.split('.').map(Number);
    for (var i = 0; i < 3; i++) {
        var na = pa[i] || 0;
        var nb = pb[i] || 0;
        if (na > nb) return true;
        if (na < nb) return false;
    }
    return false;
}

function showUpdateBanner(tag, url) {
    var banner = document.getElementById('updateBanner');
    var tagEl  = document.getElementById('updateTag');
    var btn    = document.getElementById('btnUpdate');
    if (!banner || !tagEl || !btn) return;
    tagEl.textContent    = tag;
    banner.style.display = 'flex';
    btn.onclick = function () {
        cs.openURLInDefaultBrowser(url);
    };
}
