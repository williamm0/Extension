var JXUIDebug = (function () {
    function collect() {
        return {
            version: window.CURRENT_VERSION || 'unknown',
            hasProfileImage: !!(window.JXProfileImage && JXProfileImage.getDataUrl()),
            openViews: Array.prototype.slice.call(document.querySelectorAll('.settings-view.open')).map(function (el) { return el.id; }),
            onboardVisible: !!(document.getElementById('onboardingView') && !document.getElementById('onboardingView').classList.contains('hidden')),
            curveModel: window.JXCurveAI && window.JXCurveAI.metadata ? window.JXCurveAI.metadata.sampleCount : 0,
            sections: Array.prototype.slice.call(document.querySelectorAll('section[data-section]')).map(function (el) { return el.dataset.section + ':' + (el.style.display === 'none' ? 'hidden' : 'shown'); })
        };
    }
    function log(label) {
        try { console.log('[jx ui]', label || 'state', collect()); } catch(e) {}
    }
    return { collect: collect, log: log };
})();
