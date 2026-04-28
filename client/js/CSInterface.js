/**
 * CSInterface - Adobe CEP Communication Bridge (minimal)
 * For full version: https://github.com/Adobe-CEP/CEP-Resources
 */
var CSInterface = (function () {
    'use strict';

    var CEP_INTERNAL = '__adobe_cep__';

    function CSInterface() {}

    CSInterface.prototype.evalScript = function (script, callback) {
        if (window[CEP_INTERNAL]) {
            window[CEP_INTERNAL].evalScript(script, callback || function () {});
        } else {
            console.warn('[jx Tools] Not in CEP context:', script);
            if (callback) {
                callback(JSON.stringify({ success: false, message: 'Not running in After Effects.' }));
            }
        }
    };

    CSInterface.prototype.openURLInDefaultBrowser = function (url) {
        if (window[CEP_INTERNAL]) {
            window[CEP_INTERNAL].openURLInDefaultBrowser(url);
        } else {
            window.open(url, '_blank');
        }
    };

    CSInterface.prototype.getSystemPath = function (pathType) {
        if (window[CEP_INTERNAL]) {
            return decodeURI(window[CEP_INTERNAL].getSystemPath(pathType));
        }
        return '';
    };

    return CSInterface;
})();
