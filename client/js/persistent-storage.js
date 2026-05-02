var jxPersistentStorage = (function () {
    var ready = false;
    var syncing = false;
    var filePath = null;

    function getNodeRequireForStorage() {
        try { if (typeof cep_node !== 'undefined' && cep_node.require) return cep_node.require.bind(cep_node); } catch(e) {}
        try { if (typeof require !== 'undefined') return require; } catch(e) {}
        return null;
    }

    function storageDir(os, path) {
        var home = os.homedir ? os.homedir() : '';
        if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'jx Tools', 'Storage');
        if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'jx Tools', 'Storage');
        return path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'jx-tools', 'storage');
    }

    function collectJxKeys() {
        var data = {};
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.indexOf('jx_') === 0) data[key] = localStorage.getItem(key);
            }
        } catch(e) {}
        return data;
    }

    function writeSnapshot() {
        if (!ready || syncing || !filePath) return;
        try {
            var nr = getNodeRequireForStorage();
            if (!nr) return;
            var fs = nr('fs');
            var payload = { savedAt: new Date().toISOString(), storage: collectJxKeys() };
            fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
        } catch(e) {}
    }

    function hydrate() {
        try {
            var nr = getNodeRequireForStorage();
            if (!nr) return false;
            var fs = nr('fs');
            var os = nr('os');
            var path = nr('path');
            var dir = storageDir(os, path);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            filePath = path.join(dir, 'jx-local-storage.json');
            if (fs.existsSync(filePath)) {
                var payload = JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
                var diskStorage = payload.storage || {};
                syncing = true;
                for (var key in diskStorage) {
                    if (diskStorage.hasOwnProperty(key) && key.indexOf('jx_') === 0 && localStorage.getItem(key) === null) {
                        localStorage.setItem(key, diskStorage[key]);
                    }
                }
                syncing = false;
            }
            ready = true;
            writeSnapshot();
            return true;
        } catch(e) {
            syncing = false;
            return false;
        }
    }

    function patchLocalStorage() {
        try {
            var originalSet = Storage.prototype.setItem;
            var originalRemove = Storage.prototype.removeItem;
            var originalClear = Storage.prototype.clear;
            if (Storage.prototype._jxPersistentPatched) return;
            Storage.prototype._jxPersistentPatched = true;
            Storage.prototype.setItem = function (key, value) {
                var result = originalSet.apply(this, arguments);
                if (String(key).indexOf('jx_') === 0) writeSnapshot();
                return result;
            };
            Storage.prototype.removeItem = function (key) {
                var result = originalRemove.apply(this, arguments);
                if (String(key).indexOf('jx_') === 0) writeSnapshot();
                return result;
            };
            Storage.prototype.clear = function () {
                var result = originalClear.apply(this, arguments);
                writeSnapshot();
                return result;
            };
        } catch(e) {}
    }

    hydrate();
    patchLocalStorage();

    return {
        path: function () { return filePath; },
        flush: writeSnapshot
    };
})();
