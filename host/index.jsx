// jx Tools v1.1.5

function ok(msg)   { return JSON.stringify({ success: true,  message: msg }); }
function fail(msg) { return JSON.stringify({ success: false, message: msg }); }

function getComp() {
    var item = app.project.activeItem;
    if (!item || !(item instanceof CompItem)) return null;
    return item;
}

function findItemByName(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i).name === name) return app.project.item(i);
    }
    return null;
}

function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
}

function vecFromPoint(pt, fallbackZ) {
    return [pt[0], pt[1], (pt.length > 2) ? pt[2] : (fallbackZ || 0)];
}

function vecSub(a, b) {
    return [a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)];
}

function vecAdd(a, b) {
    return [a[0] + b[0], a[1] + b[1], (a[2] || 0) + (b[2] || 0)];
}

function positionValueForLayer(layer, point) {
    var pos = layer.position.value;
    if (pos.length > 2) return [point[0], point[1], point[2] || pos[2] || 0];
    return [point[0], point[1]];
}

function setLayerPositionKeepingDimensions(layer, point) {
    try {
        layer.position.setValue(positionValueForLayer(layer, point));
        return true;
    } catch(e) {}
    try {
        if (layer.transform.xPosition) layer.transform.xPosition.setValue(point[0]);
        if (layer.transform.yPosition) layer.transform.yPosition.setValue(point[1]);
        if (layer.transform.zPosition && layer.position.value.length > 2) layer.transform.zPosition.setValue(point[2] || 0);
        return true;
    } catch(e) {}
    return false;
}

function walkProps(propGroup, fn) {
    for (var i = 1; i <= propGroup.numProperties; i++) {
        try {
            var p = propGroup.property(i);
            if (p.propertyType === PropertyType.PROPERTY) {
                fn(p);
            } else {
                walkProps(p, fn);
            }
        } catch(e) {}
    }
}

function shiftPropKeys(prop, delta) {
    if (prop.numKeys === 0) return;
    var keys = [];
    for (var k = 1; k <= prop.numKeys; k++) {
        var kd = {
            time:       prop.keyTime(k) + delta,
            value:      prop.keyValue(k),
            interpIn:   prop.keyInInterpolationType(k),
            interpOut:  prop.keyOutInterpolationType(k),
            easeIn: null, easeOut: null, spatialIn: null, spatialOut: null
        };
        try { kd.easeIn    = prop.keyInTemporalEase(k);   } catch(e) {}
        try { kd.easeOut   = prop.keyOutTemporalEase(k);  } catch(e) {}
        try { kd.spatialIn = prop.keyInSpatialTangent(k); } catch(e) {}
        try { kd.spatialOut= prop.keyOutSpatialTangent(k);} catch(e) {}
        keys.push(kd);
    }
    for (var k = prop.numKeys; k >= 1; k--) prop.removeKey(k);
    for (var k = 0; k < keys.length; k++) {
        try { prop.setValueAtTime(keys[k].time, keys[k].value); } catch(e) {}
    }
    for (var k = 1; k <= prop.numKeys; k++) {
        var kd = keys[k - 1];
        try { prop.setInterpolationTypeAtKey(k, kd.interpIn, kd.interpOut); } catch(e) {}
        if (kd.easeIn && kd.easeOut) {
            try {
                var ni = [], no = [];
                for (var e = 0; e < kd.easeIn.length; e++) {
                    ni.push(new KeyframeEase(kd.easeIn[e].speed,  kd.easeIn[e].influence));
                    no.push(new KeyframeEase(kd.easeOut[e].speed, kd.easeOut[e].influence));
                }
                prop.setTemporalEaseAtKey(k, ni, no);
            } catch(e) {}
        }
        if (kd.spatialIn && kd.spatialOut) {
            try { prop.setSpatialTangentsAtKey(k, kd.spatialIn, kd.spatialOut); } catch(e) {}
        }
    }
}

// layer tools

function jx_precomposeSelected() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    app.beginUndoGroup('jx: Precompose Selected');
    try {
        var layers = [];
        for (var i = 0; i < sel.length; i++) {
            layers.push({ index: sel[i].index, name: sel[i].name, inPoint: sel[i].inPoint, outPoint: sel[i].outPoint });
        }
        layers.sort(function(a, b) { return b.index - a.index; });
        var count = 0;
        for (var i = 0; i < layers.length; i++) {
            var info = layers[i];
            var dur  = info.outPoint - info.inPoint;
            if (dur <= 0) { count++; continue; }
            var name = info.name;
            var n = 1;
            while (findItemByName(name)) { name = info.name + ' ' + n; n++; }
            comp.layers.precompose([info.index], name, true);
            var precompItem = findItemByName(name);
            if (!precompItem) { count++; continue; }
            var precompLayer = null;
            for (var j = 1; j <= comp.numLayers; j++) {
                try {
                    if (comp.layer(j).source && comp.layer(j).source.name === name) {
                        precompLayer = comp.layer(j); break;
                    }
                } catch(e) {}
            }
            if (precompLayer) { try { precompLayer.startTime = info.inPoint; } catch(e) {} }
            if (precompItem.numLayers > 0) {
                var il    = precompItem.layer(1);
                var ilIn  = il.inPoint;
                var ilDur = il.outPoint - ilIn;
                if (ilIn !== 0) {
                    var shift = -ilIn;
                    walkProps(il, function(prop) { shiftPropKeys(prop, shift); });
                    try { il.startTime += shift; } catch(e) {}
                    try { il.inPoint    = 0;     } catch(e) {}
                    try { il.outPoint   = ilDur; } catch(e) {}
                }
            }
            try { precompItem.duration = dur; } catch(e) {}
            if (precompLayer) {
                try { precompLayer.inPoint  = info.inPoint;  } catch(e) {}
                try { precompLayer.outPoint = info.outPoint; } catch(e) {}
            }
            count++;
        }
        app.endUndoGroup();
        return ok('Precomposed ' + plural(count, 'layer') + ' individually.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_enableFrameBlending(modeStr) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    var blendMode = (modeStr === 'pixel') ? FrameBlendingType.PIXEL_MOTION : FrameBlendingType.FRAME_MIX;
    app.beginUndoGroup('jx: Frame Blending');
    try {
        comp.frameBlending = true;
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
            if (sel[i] instanceof AVLayer) { sel[i].frameBlendingType = blendMode; count++; }
        }
        app.endUndoGroup();
        return ok('Frame blending (' + (modeStr === 'pixel' ? 'Pixel Motion' : 'Frame Mix') + ') on ' + plural(count, 'layer') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_enableMotionBlur() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    app.beginUndoGroup('jx: Motion Blur');
    try {
        comp.motionBlur = true;
        for (var i = 0; i < sel.length; i++) sel[i].motionBlur = true;
        app.endUndoGroup();
        return ok('Motion blur on ' + plural(sel.length, 'layer') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_trimCompToWorkArea() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    app.beginUndoGroup('jx: Trim Comp to Work Area');
    try {
        var offset = comp.workAreaStart;
        var dur    = comp.workAreaDuration;
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            (function(lyr) {
                walkProps(lyr, function(prop) { shiftPropKeys(prop, -offset); });
                lyr.startTime -= offset;
            })(layer);
        }
        comp.duration           = dur;
        comp.displayStartTime   = 0;
        app.endUndoGroup();
        return ok('Comp trimmed to work area.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_autoLabelLayers(footageLabel, textLabel, effectsLabel) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    var fl = parseInt(footageLabel, 10) || 8;
    var tl = parseInt(textLabel,    10) || 2;
    var el = parseInt(effectsLabel, 10) || 10;
    app.beginUndoGroup('jx: Auto-Label Layers');
    try {
        var clipCount  = 0;
        var textCount  = 0;
        var shapeCount = 0;
        var adjCount   = 0;
        var labelCount = 0;
        for (var i = 0; i < sel.length; i++) {
            var layer = sel[i];
            try {
                if (layer instanceof TextLayer) {
                    layer.label = tl;
                    textCount++;
                    layer.name  = 'Text_' + (textCount < 10 ? '00' : textCount < 100 ? '0' : '') + textCount;
                } else if (layer instanceof ShapeLayer) {
                    layer.label = el;
                    shapeCount++;
                    layer.name  = 'Shape_' + (shapeCount < 10 ? '00' : shapeCount < 100 ? '0' : '') + shapeCount;
                } else if (layer instanceof AVLayer) {
                    if (layer.adjustmentLayer) {
                        layer.label = el;
                        adjCount++;
                        layer.name  = 'Adj_' + (adjCount < 10 ? '00' : adjCount < 100 ? '0' : '') + adjCount;
                    } else {
                        layer.label = fl;
                        clipCount++;
                        layer.name  = 'Clip_' + (clipCount < 10 ? '00' : clipCount < 100 ? '0' : '') + clipCount;
                    }
                }
                labelCount++;
            } catch(e) {}
        }
        app.endUndoGroup();
        return ok('Labeled ' + plural(labelCount, 'layer') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_centerAnchorAll() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    var compCenter = [comp.width / 2, comp.height / 2, 0];
    var t = comp.time;
    app.beginUndoGroup('jx: Center Anchor');
    try {
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
            var layer = sel[i];
            try {
                if (!layer.anchorPoint || !layer.position || !layer.toWorld || !layer.fromWorld) continue;

                var oldAnchorRaw = layer.anchorPoint.valueAtTime(t, false);
                var oldPosRaw    = layer.position.valueAtTime(t, false);
                var oldAnchor    = vecFromPoint(oldAnchorRaw, 0);
                var posWorld     = vecFromPoint(layer.toWorld(oldAnchor), 0);
                var newAnchor    = vecFromPoint(layer.fromWorld(compCenter), oldAnchor[2]);
                var parentDelta;

                if (layer.parent && layer.parent.fromWorld) {
                    parentDelta = vecSub(vecFromPoint(layer.parent.fromWorld(compCenter), 0),
                                         vecFromPoint(layer.parent.fromWorld(posWorld), 0));
                } else {
                    parentDelta = vecSub(compCenter, posWorld);
                }

                layer.anchorPoint.setValue(oldAnchorRaw.length > 2 ? newAnchor : [newAnchor[0], newAnchor[1]]);
                if (setLayerPositionKeepingDimensions(layer, vecAdd(vecFromPoint(oldPosRaw, 0), parentDelta))) count++;
            } catch(e) {}
        }
        app.endUndoGroup();
        return ok('Anchors centered on ' + plural(count, 'layer') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_nullFromSelection() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    app.beginUndoGroup('jx: Null from Selection');
    try {
        var minIn = comp.duration, maxOut = 0;
        for (var i = 0; i < sel.length; i++) {
            if (sel[i].inPoint  < minIn)  minIn  = sel[i].inPoint;
            if (sel[i].outPoint > maxOut) maxOut = sel[i].outPoint;
        }
        var nl = comp.layers.addNull(comp.duration);
        nl.name = 'jx Null';
        nl.inPoint  = minIn;
        nl.outPoint = maxOut;
        nl.position.setValue([comp.width / 2, comp.height / 2]);
        nl.moveToBeginning();
        for (var i = 0; i < sel.length; i++) { try { sel[i].parent = nl; } catch(e) {} }
        app.endUndoGroup();
        return ok('Created null, parented ' + plural(sel.length, 'layer') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_sequenceLayers(gapSec) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length < 2) return fail('Select at least two layers.');
    gapSec = parseFloat(gapSec) || 0;
    app.beginUndoGroup('jx: Sequence Layers');
    try {
        var layers = [];
        for (var i = 0; i < sel.length; i++) layers.push(sel[i]);
        layers.sort(function(a, b) { return a.inPoint - b.inPoint; });
        var cursor = layers[0].outPoint + gapSec;
        for (var i = 1; i < layers.length; i++) {
            var dur = layers[i].outPoint - layers[i].inPoint;
            layers[i].inPoint  = cursor;
            layers[i].outPoint = cursor + dur;
            cursor = layers[i].outPoint + gapSec;
        }
        app.endUndoGroup();
        return ok('Sequenced ' + plural(layers.length, 'layer') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

// color

function jx_pickThemeColor(initialHex) {
    try {
        var hex = String(initialHex || '#c09050').replace(/[^0-9a-f]/gi, '');
        if (hex.length === 3) hex = hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2);
        if (hex.length !== 6) hex = 'c09050';
        var picked = $.colorPicker(parseInt(hex, 16));
        if (picked < 0) return JSON.stringify({ success: false, cancelled: true, message: 'Cancelled.' });
        var out = picked.toString(16);
        while (out.length < 6) out = '0' + out;
        return JSON.stringify({ success: true, hex: '#' + out.slice(-6) });
    } catch(e) {
        return fail('Failed: ' + e.toString());
    }
}

function jx_applyFFXPreset(presetPath) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var presetFile = new File(presetPath);
    if (!presetFile.exists) return fail('File not found:\n' + presetPath);
    app.beginUndoGroup('jx: Apply Color Preset');
    try {
        var adj = comp.layers.addSolid([1,1,1], 'jx Color', comp.width, comp.height, comp.pixelAspect, comp.duration);
        adj.adjustmentLayer = true;
        adj.startTime       = comp.workAreaStart;
        adj.outPoint        = comp.workAreaStart + comp.workAreaDuration;
        adj.moveToBeginning();
        adj.applyPreset(presetFile);
        app.endUndoGroup();
        return ok('Color preset applied to new adjustment layer.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

// keyframes

function jx_stretchKeyframesToClip() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    app.beginUndoGroup('jx: Stretch Keyframes to Clip');
    try {
        var stretched = 0;
        for (var i = 0; i < sel.length; i++) { if (stretchLayer(sel[i])) stretched++; }
        app.endUndoGroup();
        if (stretched === 0) return ok('No stretchable keyframes found.');
        return ok('Stretched keys on ' + plural(stretched, 'layer') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function stretchLayer(layer) {
    var clipStart = layer.inPoint;
    var clipDur   = layer.outPoint - layer.inPoint;
    if (clipDur <= 0) return false;
    var propData = [];
    walkProps(layer, function(prop) {
        var sel = prop.selectedKeys;
        if (!sel || sel.length < 2) return;
        var firstTime = prop.keyTime(sel[0]);
        var lastTime  = prop.keyTime(sel[sel.length - 1]);
        var span = lastTime - firstTime;
        if (span < 0.0001) return;
        var keys = [];
        for (var k = 0; k < sel.length; k++) {
            var idx = sel[k];
            var kd = {
                time: prop.keyTime(idx), value: prop.keyValue(idx),
                interpIn: prop.keyInInterpolationType(idx), interpOut: prop.keyOutInterpolationType(idx),
                easeIn: null, easeOut: null, spatialIn: null, spatialOut: null
            };
            try { kd.easeIn    = prop.keyInTemporalEase(idx);   } catch(e) {}
            try { kd.easeOut   = prop.keyOutTemporalEase(idx);  } catch(e) {}
            try { kd.spatialIn = prop.keyInSpatialTangent(idx); } catch(e) {}
            try { kd.spatialOut= prop.keyOutSpatialTangent(idx);} catch(e) {}
            keys.push(kd);
        }
        propData.push({ prop: prop, selIndices: sel, keys: keys, firstTime: firstTime, span: span });
    });
    if (propData.length === 0) return false;
    for (var i = 0; i < propData.length; i++) {
        var pd       = propData[i];
        var prop     = pd.prop;
        var scale    = clipDur / pd.span;
        var firstTime= pd.firstTime;
        var keys     = pd.keys;
        var selIdx   = pd.selIndices;
        for (var k = selIdx.length - 1; k >= 0; k--) prop.removeKey(selIdx[k]);
        var newTimes = [];
        for (var k = 0; k < keys.length; k++) {
            var t = clipStart + (keys[k].time - firstTime) * scale;
            newTimes.push(t);
            try { prop.setValueAtTime(t, keys[k].value); } catch(e) {}
        }
        for (var k = 0; k < keys.length; k++) {
            var kd  = keys[k];
            var t   = newTimes[k];
            var idx = -1;
            for (var m = 1; m <= prop.numKeys; m++) {
                if (Math.abs(prop.keyTime(m) - t) < 0.0001) { idx = m; break; }
            }
            if (idx < 0) continue;
            try { prop.setInterpolationTypeAtKey(idx, kd.interpIn, kd.interpOut); } catch(e) {}
            if (kd.easeIn && kd.easeOut) {
                try {
                    var ni = [], no = [];
                    for (var ei = 0; ei < kd.easeIn.length; ei++) {
                        ni.push(new KeyframeEase(kd.easeIn[ei].speed  / scale, kd.easeIn[ei].influence));
                        no.push(new KeyframeEase(kd.easeOut[ei].speed / scale, kd.easeOut[ei].influence));
                    }
                    prop.setTemporalEaseAtKey(idx, ni, no);
                } catch(e) {}
            }
            if (kd.spatialIn && kd.spatialOut) {
                try { prop.setSpatialTangentsAtKey(idx, kd.spatialIn, kd.spatialOut); } catch(e) {}
            }
        }
    }
    return true;
}

function jx_reverseKeyframes() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    app.beginUndoGroup('jx: Reverse Keyframes');
    try {
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
            walkProps(sel[i], function(prop) {
                if (prop.numKeys < 2) return;
                var keys = [];
                for (var k = 1; k <= prop.numKeys; k++) {
                    var kd = {
                        time: prop.keyTime(k), value: prop.keyValue(k),
                        interpIn: prop.keyInInterpolationType(k), interpOut: prop.keyOutInterpolationType(k),
                        easeIn: null, easeOut: null, spatialIn: null, spatialOut: null
                    };
                    try { kd.easeIn    = prop.keyInTemporalEase(k);   } catch(e) {}
                    try { kd.easeOut   = prop.keyOutTemporalEase(k);  } catch(e) {}
                    try { kd.spatialIn = prop.keyInSpatialTangent(k); } catch(e) {}
                    try { kd.spatialOut= prop.keyOutSpatialTangent(k);} catch(e) {}
                    keys.push(kd);
                }
                var firstTime = keys[0].time;
                var lastTime  = keys[keys.length - 1].time;
                for (var k = prop.numKeys; k >= 1; k--) prop.removeKey(k);
                var newTimes = [];
                for (var k = 0; k < keys.length; k++) {
                    var nt = lastTime - (keys[k].time - firstTime);
                    newTimes.push(nt);
                    try { prop.setValueAtTime(nt, keys[k].value); } catch(e) {}
                }
                for (var k = 1; k <= prop.numKeys; k++) {
                    var t = prop.keyTime(k);
                    var origIdx = -1;
                    for (var m = 0; m < newTimes.length; m++) {
                        if (Math.abs(newTimes[m] - t) < 0.0001) { origIdx = m; break; }
                    }
                    if (origIdx < 0) continue;
                    var kd = keys[origIdx];
                    try { prop.setInterpolationTypeAtKey(k, kd.interpOut, kd.interpIn); } catch(e) {}
                    if (kd.easeIn && kd.easeOut) {
                        try {
                            var ni = [], no = [];
                            for (var d = 0; d < kd.easeOut.length; d++) ni.push(new KeyframeEase(kd.easeOut[d].speed, kd.easeOut[d].influence));
                            for (var d = 0; d < kd.easeIn.length;  d++) no.push(new KeyframeEase(kd.easeIn[d].speed,  kd.easeIn[d].influence));
                            prop.setTemporalEaseAtKey(k, ni, no);
                        } catch(e) {}
                    }
                    if (kd.spatialIn && kd.spatialOut) {
                        try { prop.setSpatialTangentsAtKey(k, kd.spatialOut, kd.spatialIn); } catch(e) {}
                    }
                }
                count++;
            });
        }
        app.endUndoGroup();
        if (count === 0) return ok('No keyframes found.');
        return ok('Reversed ' + plural(count, 'property') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

// easing

// Returns the scalar magnitude of the value change between two consecutive keys.
// For 1-D properties (Opacity, Rotation…) this is just |b - a|.
// For multi-D properties (Position, Scale…) it is the Euclidean distance,
// because AE's KeyframeEase.speed is always a magnitude (units/second).
function _valueMag(prop, k1, k2) {
    try {
        var a = prop.keyValue(k1);
        var b = prop.keyValue(k2);
        if (typeof a === 'number') return Math.abs(b - a);
        var sum = 0;
        for (var d = 0; d < a.length; d++) {
            var dd = b[d] - a[d];
            sum += dd * dd;
        }
        return Math.sqrt(sum);
    } catch(e) { return 0; }
}

function jx_applyEase(curveJson) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');

    // Parse bezier curve handles: { h1:{x,y}, h2:{x,y} }
    var curve;
    try { curve = eval('(' + curveJson + ')'); } catch(e) { return fail('Bad curve data.'); }
    var ch1 = curve.h1, ch2 = curve.h2;

    // ── Bezier-to-AE mapping ──────────────────────────────────────────────────
    // CSS cubic-bezier P0=(0,0), P1=(h1.x,h1.y), P2=(h2.x,h2.y), P3=(1,1).
    //
    // Tangent slope at t=0:  dy/dx = h1.y / h1.x   → velocity leaving a key
    // Tangent slope at t=1:  dy/dx = (1-h2.y)/(1-h2.x) → velocity arriving at a key
    //
    // When the handle lands exactly on the endpoint (h1.x≈0 or h2.x≈1), the
    // slope is undefined (vertical tangent), which maps to LINEAR interpolation.
    //
    // AE influence = fraction of the segment duration the handle extends over.
    //   infOut = h1.x * 100
    //   infIn  = (1 - h2.x) * 100
    //
    // AE speed (units/sec) for a segment [k → k+1]:
    //   speedOut = slope0 × magnitude(valueDelta) / timeDelta
    //   speedIn  = slope1 × magnitude(valueDelta) / timeDelta
    //
    // IMPORTANT: setTemporalEaseAtKey always takes a SINGLE-ELEMENT array
    // regardless of the property's dimension count.  Passing a multi-element
    // array (e.g. length 2 for Position) causes AE to throw a silent error
    // and leaves the keyframe unchanged — the root cause of the "straight
    // graph" bug.
    // ─────────────────────────────────────────────────────────────────────────

    var degOut = (ch1.x < 0.001);            // out handle collapsed → linear start
    var degIn  = (ch2.x > 0.999);            // in  handle collapsed → linear end
    var slope0 = degOut ? 0 : (ch1.y / ch1.x);
    var slope1 = degIn  ? 0 : ((1 - ch2.y) / (1 - ch2.x));

    var infOut = Math.max(0.1, Math.min(100, ch1.x * 100));
    var infIn  = Math.max(0.1, Math.min(100, (1 - ch2.x) * 100));

    app.beginUndoGroup('jx: Apply Ease');
    try {
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
            walkProps(sel[i], function(prop) {
                var nk = prop.numKeys;
                if (nk < 2) return;

                for (var k = 1; k <= nk; k++) {
                    var kt = prop.keyTime(k);

                    // ── outgoing ease (key k → key k+1) ──
                    var outSpeed  = 0;
                    var outLinear = false;
                    if (k < nk) {
                        if (degOut) {
                            outLinear = true;
                        } else {
                            var dtOut = prop.keyTime(k + 1) - kt;
                            if (dtOut > 0) {
                                outSpeed = slope0 * _valueMag(prop, k, k + 1) / dtOut;
                            }
                        }
                    }

                    // ── incoming ease (key k-1 → key k) ──
                    var inSpeed  = 0;
                    var inLinear = false;
                    if (k > 1) {
                        if (degIn) {
                            inLinear = true;
                        } else {
                            var dtIn = kt - prop.keyTime(k - 1);
                            if (dtIn > 0) {
                                inSpeed = slope1 * _valueMag(prop, k - 1, k) / dtIn;
                            }
                        }
                    }

                    var outType = outLinear ? KeyframeInterpolationType.LINEAR : KeyframeInterpolationType.BEZIER;
                    var inType  = inLinear  ? KeyframeInterpolationType.LINEAR : KeyframeInterpolationType.BEZIER;

                    // Set interpolation type first so AE accepts the temporal ease call
                    try { prop.setInterpolationTypeAtKey(k, inType, outType); } catch(e) {}

                    // Build ease arrays whose length matches what AE expects for this
                    // property.  We read it from the property itself — for 1-D properties
                    // (Opacity, Rotation…) AE returns length-1 arrays; for 2-D/3-D
                    // (Position, Scale, Anchor…) it may return length-2 or length-3.
                    // Constructing arrays of the WRONG length makes setTemporalEaseAtKey
                    // throw a silent error and leave the keyframe unchanged — which is why
                    // reading the dimension from AE directly is the only reliable approach.
                    try {
                        var existingIn = prop.keyInTemporalEase(k);
                        var nDim = (existingIn && existingIn.length > 0) ? existingIn.length : 1;
                        var eIn  = [], eOut = [];
                        for (var d = 0; d < nDim; d++) {
                            eIn.push(new KeyframeEase(inSpeed,  infIn));
                            eOut.push(new KeyframeEase(outSpeed, infOut));
                        }
                        prop.setTemporalEaseAtKey(k, eIn, eOut);
                    } catch(e) {}

                    count++;
                }
            });
        }
        app.endUndoGroup();
        if (count === 0) return ok('No keyframes found on selected layers.');
        return ok('Ease applied to ' + plural(count, 'keyframe') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

// animation

function jx_wordByWordAnimate(wordOffsetSec) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select a text layer.');
    app.beginUndoGroup('jx: Word-by-Word');
    try {
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
            var layer = sel[i];
            if (!(layer instanceof TextLayer)) continue;
            var textProp = layer.property('Text').property('Source Text');
            var doc      = textProp.value;
            var rawWords = doc.text.split(/\s+/);
            var words    = [];
            for (var w = 0; w < rawWords.length; w++) {
                if (rawWords[w].length > 0) words.push(rawWords[w]);
            }
            if (words.length < 2) continue;
            for (var w = 0; w < words.length; w++) {
                var dup     = layer.duplicate();
                var dupDoc  = dup.property('Text').property('Source Text').value;
                dupDoc.text = words[w];
                dup.property('Text').property('Source Text').setValue(dupDoc);
                dup.inPoint = layer.inPoint + w * wordOffsetSec;
                dup.outPoint= layer.outPoint;
                try {
                    var op = dup.property('Transform').property('Opacity');
                    op.setValueAtTime(dup.inPoint, 0);
                    op.setValueAtTime(dup.inPoint + Math.min(wordOffsetSec * 0.4, 0.08), 100);
                } catch(e) {}
            }
            layer.enabled = false;
            count++;
        }
        app.endUndoGroup();
        if (count === 0) return ok('No text layers in selection.');
        return ok('Word animator applied to ' + plural(count, 'layer') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_addBeatMarkers(bpm, offsetSec) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    bpm       = parseFloat(bpm)       || 120;
    offsetSec = parseFloat(offsetSec) || 0;
    var beatInterval = 60.0 / bpm;
    app.beginUndoGroup('jx: Beat Markers');
    try {
        var markers = comp.markerProperty;
        var t       = offsetSec;
        var count   = 0;
        while (t <= comp.duration + 0.001) {
            try { markers.setValueAtTime(t, new MarkerValue('')); count++; } catch(e) {}
            t += beatInterval;
        }
        app.endUndoGroup();
        return ok('Added ' + plural(count, 'marker') + ' at ' + bpm + ' BPM.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_getAudioLayerPath() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var target = null;
    var sel = comp.selectedLayers;
    for (var i = 0; i < sel.length; i++) {
        var l = sel[i];
        if (l instanceof AVLayer && l.hasAudio && l.source && l.source instanceof FootageItem && l.source.file) {
            target = l; break;
        }
    }
    if (!target) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (l instanceof AVLayer && l.hasAudio && l.source && l.source instanceof FootageItem && l.source.file) {
                target = l; break;
            }
        }
    }
    if (!target) return fail('No audio layer found in comp.');
    try {
        var p = target.source.file.fsName;
        return ok(p);
    } catch(e) {
        return fail('Could not read file path: ' + e.toString());
    }
}

function jx_placeBeatsFromTimes(timesJson) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var times;
    try { times = JSON.parse(timesJson); } catch(e) { return fail('Invalid beat data.'); }
    if (!times || !times.length) return fail('No beats to place.');
    app.beginUndoGroup('jx: Beat Markers');
    try {
        var markers = comp.markerProperty;
        var count   = 0;
        for (var i = 0; i < times.length; i++) {
            var entry = times[i];
            var t, label;
            if (typeof entry === 'number') {
                t = entry; label = '';
            } else {
                t = parseFloat(entry.t); label = entry.label || '';
            }
            if (isNaN(t) || t < 0 || t > comp.duration + 0.001) continue;
            try { markers.setValueAtTime(t, new MarkerValue(label)); count++; } catch(e) {}
        }
        app.endUndoGroup();
        return ok('Placed ' + plural(count, 'beat marker') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_snapKeysToMarkers() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    var markers = comp.markerProperty;
    if (markers.numKeys === 0) return fail('No comp markers found. Add beat markers first.');
    var markerTimes = [];
    for (var m = 1; m <= markers.numKeys; m++) markerTimes.push(markers.keyTime(m));
    app.beginUndoGroup('jx: Snap Keys to Markers');
    try {
        var total = 0;
        for (var i = 0; i < sel.length; i++) {
            walkProps(sel[i], function(prop) {
                var selectedKeys = prop.selectedKeys;
                if (!selectedKeys || selectedKeys.length === 0) return;
                var keyData = [];
                for (var k = 0; k < selectedKeys.length; k++) {
                    var idx = selectedKeys[k];
                    var t   = prop.keyTime(idx);
                    var nearest  = markerTimes[0];
                    var nearestD = Math.abs(t - markerTimes[0]);
                    for (var m = 1; m < markerTimes.length; m++) {
                        var d = Math.abs(t - markerTimes[m]);
                        if (d < nearestD) { nearestD = d; nearest = markerTimes[m]; }
                    }
                    var kd = {
                        newTime: nearest, value: prop.keyValue(idx),
                        interpIn: prop.keyInInterpolationType(idx), interpOut: prop.keyOutInterpolationType(idx),
                        easeIn: null, easeOut: null
                    };
                    try { kd.easeIn  = prop.keyInTemporalEase(idx);  } catch(e) {}
                    try { kd.easeOut = prop.keyOutTemporalEase(idx); } catch(e) {}
                    keyData.push(kd);
                }
                for (var k = selectedKeys.length - 1; k >= 0; k--) prop.removeKey(selectedKeys[k]);
                for (var k = 0; k < keyData.length; k++) {
                    var kd = keyData[k];
                    try {
                        prop.setValueAtTime(kd.newTime, kd.value);
                        for (var m = 1; m <= prop.numKeys; m++) {
                            if (Math.abs(prop.keyTime(m) - kd.newTime) < 0.0001) {
                                try { prop.setInterpolationTypeAtKey(m, kd.interpIn, kd.interpOut); } catch(e) {}
                                if (kd.easeIn && kd.easeOut) {
                                    try {
                                        var ni = [], no = [];
                                        for (var d = 0; d < kd.easeIn.length; d++) {
                                            ni.push(new KeyframeEase(kd.easeIn[d].speed,  kd.easeIn[d].influence));
                                            no.push(new KeyframeEase(kd.easeOut[d].speed, kd.easeOut[d].influence));
                                        }
                                        prop.setTemporalEaseAtKey(m, ni, no);
                                    } catch(e) {}
                                }
                                break;
                            }
                        }
                        total++;
                    } catch(e) {}
                }
            });
        }
        app.endUndoGroup();
        if (total === 0) return ok('No selected keyframes found.');
        return ok('Snapped ' + plural(total, 'keyframe') + ' to markers.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

// fx

function jx_echoTrail(steps, offsetSec) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    steps     = parseInt(steps)       || 3;
    offsetSec = parseFloat(offsetSec) || 0.1;
    app.beginUndoGroup('jx: Echo Trail');
    try {
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
            var layer = sel[i];
            for (var s = 1; s <= steps; s++) {
                var dup = layer.duplicate();
                dup.startTime -= offsetSec * s;
                var opacity = Math.round(65 * (1 - s / (steps + 1)));
                try { dup.property('Transform').property('Opacity').setValue(opacity); } catch(e) {}
                dup.moveAfter(layer);
            }
            count++;
        }
        app.endUndoGroup();
        return ok('Echo trail on ' + plural(count, 'layer') + ' (' + steps + ' steps).');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_loopDuplicate(repeats) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    repeats = parseInt(repeats) || 2;
    if (repeats < 1) return fail('Repeats must be at least 1.');
    app.beginUndoGroup('jx: Loop Duplicate');
    try {
        var layers = [];
        for (var i = 0; i < sel.length; i++) layers.push(sel[i]);
        var count = 0;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var dur   = layer.outPoint - layer.inPoint;
            if (dur <= 0) continue;
            var lastOut = layer.outPoint;
            for (var r = 0; r < repeats; r++) {
                var dup = layer.duplicate();
                dup.moveAfter(layer);
                dup.inPoint  = lastOut;
                dup.outPoint = lastOut + dur;
                lastOut      = dup.outPoint;
            }
            count++;
        }
        app.endUndoGroup();
        return ok('Looped ' + plural(count, 'layer') + ' ×' + repeats + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

// update check

function jx_renameLayers(findStr, replaceStr, prefix, suffix) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer.');
    app.beginUndoGroup('jx: Rename Layers');
    try {
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
            var name = sel[i].name;
            if (findStr) {
                var parts = name.split(findStr);
                name = parts.join(replaceStr);
            }
            if (prefix) name = prefix + name;
            if (suffix) name = name + suffix;
            sel[i].name = name;
            count++;
        }
        app.endUndoGroup();
        return ok('Renamed ' + plural(count, 'layer') + '.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_writeFile(filePath, content) {
    try {
        var f = new File(filePath);
        f.encoding = 'UTF-8';
        f.open('w');
        f.write(content);
        f.close();
        return ok('ok');
    } catch(e) {
        return fail('Failed: ' + e.toString());
    }
}

function jx_fetchUpdateInfo() {
    try {
        var url    = 'https://api.github.com/repos/williamm0/Extension/releases/latest';
        var result = system.callSystem('curl -s --max-time 8 --user-agent "jxtools-cep" "' + url + '"');
        return result ? result : '';
    } catch(e) {
        return '';
    }
}
