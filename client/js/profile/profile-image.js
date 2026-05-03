var JXProfileImage = (function () {
    var STORAGE_KEY = 'jx_profile_image';
    var MAX_BYTES = 850 * 1024;

    function extension(file) {
        var name = file && file.name ? file.name : 'profile.png';
        return (name.match(/\.([^.]+)$/) || [,'png'])[1].toLowerCase().replace('jpg', 'jpeg');
    }

    function setDataUrl(dataUrl) {
        if (!dataUrl || dataUrl.indexOf('data:image/') !== 0) return false;
        localStorage.setItem(STORAGE_KEY, dataUrl);
        return true;
    }

    function getDataUrl() {
        return localStorage.getItem(STORAGE_KEY) || '';
    }

    function clear() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function fromFileReader(file, done) {
        if (!window.FileReader) { done(new Error('FileReader unavailable')); return; }
        var reader = new FileReader();
        reader.onload = function () { done(null, String(reader.result || '')); };
        reader.onerror = function () { done(new Error('Could not read image')); };
        reader.readAsDataURL(file);
    }

    function fromNodePath(file, done) {
        try {
            var nr = getNodeRequire && getNodeRequire();
            if (!nr || !file || !file.path) { done(new Error('No file path')); return; }
            var fs = nr('fs');
            var stat = fs.statSync(file.path);
            if (stat.size > MAX_BYTES * 2.5) { done(new Error('Image is too large')); return; }
            var data = fs.readFileSync(file.path).toString('base64');
            done(null, 'data:image/' + extension(file) + ';base64,' + data);
        } catch (e) { done(e); }
    }

    function read(file, done) {
        if (!file) { done(new Error('No image selected')); return; }
        if (file.size && file.size > MAX_BYTES * 3) { done(new Error('Pick a smaller image')); return; }
        if (file.path) {
            fromNodePath(file, function (err, dataUrl) {
                if (!err && dataUrl) { done(null, dataUrl); return; }
                fromFileReader(file, done);
            });
            return;
        }
        fromFileReader(file, done);
    }

    function applyToElements(name) {
        var dataUrl = getDataUrl();
        var initials = ((name || 'jx').substr(0, 2) || 'jx').toLowerCase();
        ['profileAvatar', 'onboardAvatarPreview'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.textContent = dataUrl ? '' : initials;
            el.style.backgroundImage = dataUrl ? 'url(' + dataUrl + ')' : '';
            el.classList.toggle('has-image', !!dataUrl);
        });
    }

    return {
        read: read,
        setDataUrl: setDataUrl,
        getDataUrl: getDataUrl,
        clear: clear,
        applyToElements: applyToElements
    };
})();
