var JXProfileCropper = (function () {
    var modal, canvas, ctx, zoomInput, image, sourceDataUrl;
    var drag = null;
    var state = { x: 0, y: 0, zoom: 1 };

    function init() {
        modal = document.getElementById('profileCropModal');
        canvas = document.getElementById('profileCropCanvas');
        zoomInput = document.getElementById('profileCropZoom');
        if (!modal || !canvas || !zoomInput) return;
        ctx = canvas.getContext('2d');
        document.getElementById('profileCropCancel').addEventListener('click', close);
        document.getElementById('profileCropApply').addEventListener('click', apply);
        zoomInput.addEventListener('input', function () { state.zoom = parseFloat(zoomInput.value) || 1; draw(); });
        canvas.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', moveDrag);
        window.addEventListener('mouseup', stopDrag);
        canvas.addEventListener('touchstart', startDrag, { passive: false });
        window.addEventListener('touchmove', moveDrag, { passive: false });
        window.addEventListener('touchend', stopDrag);
    }

    function point(evt) {
        var touch = evt.touches && evt.touches[0];
        var e = touch || evt;
        var rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function startDrag(evt) {
        evt.preventDefault();
        var p = point(evt);
        drag = { x: p.x, y: p.y, ox: state.x, oy: state.y };
    }

    function moveDrag(evt) {
        if (!drag) return;
        evt.preventDefault();
        var p = point(evt);
        state.x = drag.ox + p.x - drag.x;
        state.y = drag.oy + p.y - drag.y;
        draw();
    }

    function stopDrag() { drag = null; }

    function open(dataUrl) {
        if (!modal) init();
        if (!modal || !canvas) return false;
        sourceDataUrl = dataUrl;
        image = new Image();
        image.onload = function () {
            state = { x: 0, y: 0, zoom: 1 };
            zoomInput.value = '1';
            modal.classList.remove('hidden');
            draw();
        };
        image.src = dataUrl;
        return true;
    }

    function close() {
        if (modal) modal.classList.add('hidden');
    }

    function draw() {
        if (!ctx || !image) return;
        var size = canvas.width;
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.fillStyle = '#0b0b0b';
        ctx.fillRect(0, 0, size, size);
        var base = Math.max(size / image.width, size / image.height);
        var scale = base * state.zoom;
        var w = image.width * scale;
        var h = image.height * scale;
        var x = (size - w) / 2 + state.x;
        var y = (size - h) / 2 + state.y;
        ctx.drawImage(image, x, y, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.arc(size / 2, size / 2, size * 0.39, 0, Math.PI * 2, true);
        ctx.fill('evenodd');
        ctx.restore();
    }

    function apply() {
        if (!canvas || !image) return;
        var out = document.createElement('canvas');
        out.width = 256;
        out.height = 256;
        var octx = out.getContext('2d');
        var size = canvas.width;
        var base = Math.max(size / image.width, size / image.height);
        var scale = base * state.zoom;
        var w = image.width * scale;
        var h = image.height * scale;
        var x = (size - w) / 2 + state.x;
        var y = (size - h) / 2 + state.y;
        octx.save();
        octx.beginPath();
        octx.arc(128, 128, 128, 0, Math.PI * 2);
        octx.clip();
        octx.drawImage(image, x * (256 / size), y * (256 / size), w * (256 / size), h * (256 / size));
        octx.restore();
        var dataUrl = out.toDataURL('image/png');
        if (window.JXProfileImage) JXProfileImage.setDataUrl(dataUrl);
        if (typeof updateProfileFooter === 'function') updateProfileFooter();
        close();
        if (typeof toast === 'function') toast('Profile picture updated.', 'success');
    }

    return { init: init, open: open, close: close };
})();
