// jx Tools v2.0.1

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

function escapeJsonString(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

function getLayerLibraryFolder(create) {
    var name = 'jx Layer Library';
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FolderItem && item.name === name) return item;
    }
    return create ? app.project.items.addFolder(name) : null;
}

function findLayerLibraryComp(id) {
    var folder = getLayerLibraryFolder(false);
    if (!folder) return null;
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem && item.parentFolder === folder && String(item.comment) === String(id)) return item;
    }
    return null;
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
    // and leaves the keyframe unchanged - the root cause of the "straight
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

                var sk = prop.selectedKeys;
                if (!sk || !sk.length) return;

                for (var si = 0; si < sk.length; si++) {
                    var k = sk[si];
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
                    // property.  We read it from the property itself - for 1-D properties
                    // (Opacity, Rotation…) AE returns length-1 arrays; for 2-D/3-D
                    // (Position, Scale, Anchor…) it may return length-2 or length-3.
                    // Constructing arrays of the WRONG length makes setTemporalEaseAtKey
                    // throw a silent error and leave the keyframe unchanged - which is why
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
        if (count === 0) return ok('No selected keyframes. Select keyframes in the timeline first.');
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

    function layerHasAudioFile(l) {
        try {
            if (!(l instanceof AVLayer)) return false;
            if (!l.hasAudio) return false;
            var src = l.source;
            if (!src) return false;
            var f = src.file;
            return !!(f && f.fsName);
        } catch(e) { return false; }
    }

    var target = null;
    var sel = comp.selectedLayers;
    for (var i = 0; i < sel.length; i++) {
        if (layerHasAudioFile(sel[i])) { target = sel[i]; break; }
    }
    if (!target) {
        for (var i = 1; i <= comp.numLayers; i++) {
            if (layerHasAudioFile(comp.layer(i))) { target = comp.layer(i); break; }
        }
    }
    if (!target) return fail('No audio layer found in comp.');
    try {
        return ok(target.source.file.fsName);
    } catch(e) {
        return fail('Could not read file path: ' + e.toString());
    }
}

function jx_clearCompMarkers() {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var markers = comp.markerProperty;
    if (markers.numKeys === 0) return ok('No markers to clear.');
    app.beginUndoGroup('jx: Clear Markers');
    try {
        for (var k = markers.numKeys; k >= 1; k--) markers.removeKey(k);
        app.endUndoGroup();
        return ok('Cleared all comp markers.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
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

// layer library

function jx_layerLibraryDiskFolder(create) {
    var base = new Folder(Folder.userData.fsName + '/jx Tools/Layer Library');
    if (!base.exists && create) base.create();
    return base;
}

function jx_layerStackFile(id) {
    var folder = jx_layerLibraryDiskFolder(true);
    return new File(folder.fsName + '/' + String(id).replace(/[^A-Za-z0-9_\-]/g, '_') + '.json');
}

function jx_readTextFile(file) {
    if (!file || !file.exists) return null;
    file.encoding = 'UTF-8';
    if (!file.open('r')) return null;
    var text = file.read();
    file.close();
    return text;
}

function jx_writeTextFile(file, text) {
    file.encoding = 'UTF-8';
    if (!file.open('w')) throw new Error('Could not write layer stack file.');
    file.write(text);
    file.close();
}

function jx_parseJson(text) {
    if (typeof JSON === 'undefined' || !JSON.parse) throw new Error('JSON is unavailable in this After Effects build.');
    return JSON.parse(text);
}

function jx_toJson(obj) {
    if (typeof JSON === 'undefined' || !JSON.stringify) throw new Error('JSON is unavailable in this After Effects build.');
    return JSON.stringify(obj, null, 2);
}

function jx_safeValue(value) {
    if (value === null || value === undefined) return null;
    var t = typeof value;
    if (t === 'number' || t === 'string' || t === 'boolean') return value;
    if (value instanceof Array) {
        var arr = [];
        for (var i = 0; i < value.length; i++) arr.push(jx_safeValue(value[i]));
        return arr;
    }
    try {
        if (value.text !== undefined) {
            return {
                __textDocument: true,
                text: String(value.text || ''),
                font: String(value.font || ''),
                fontSize: Number(value.fontSize || 0),
                fillColor: jx_safeValue(value.fillColor),
                applyFill: !!value.applyFill,
                justification: String(value.justification || '')
            };
        }
    } catch(e) {}
    return null;
}

function jx_applySafeValue(prop, value, timeOffset) {
    if (value === null || value === undefined) return;
    try {
        if (value && value.__textDocument) {
            var td = prop.value;
            td.text = value.text || '';
            if (value.font) try { td.font = value.font; } catch(e) {}
            if (value.fontSize) try { td.fontSize = value.fontSize; } catch(e) {}
            if (value.fillColor) try { td.fillColor = value.fillColor; } catch(e) {}
            try { td.applyFill = value.applyFill; } catch(e) {}
            prop.setValue(td);
            return;
        }
        prop.setValue(value);
    } catch(e) {}
}

function jx_serializeProperty(prop, baseTime) {
    var data = { name: prop.name, matchName: prop.matchName, index: prop.propertyIndex };
    if (prop.propertyType === PropertyType.PROPERTY) {
        data.value = jx_safeValue(prop.value);
        data.keys = [];
        try {
            for (var k = 1; k <= prop.numKeys; k++) {
                data.keys.push({ time: prop.keyTime(k) - baseTime, value: jx_safeValue(prop.keyValue(k)) });
            }
        } catch(e) {}
    } else if (prop.numProperties && prop.numProperties > 0) {
        data.children = [];
        for (var i = 1; i <= prop.numProperties; i++) {
            try { data.children.push(jx_serializeProperty(prop.property(i), baseTime)); } catch(e) {}
        }
    }
    return data;
}

function jx_applyPropertyData(group, data, timeOffset) {
    if (!group || !data) return;
    var target = null;
    try { if (data.matchName) target = group.property(data.matchName); } catch(e) {}
    if (!target) try { if (data.name) target = group.property(data.name); } catch(e) {}
    if (!target && data.index) try { target = group.property(data.index); } catch(e) {}
    if (!target) return;
    if (data.children && data.children.length) {
        for (var i = 0; i < data.children.length; i++) jx_applyPropertyData(target, data.children[i], timeOffset);
        return;
    }
    try {
        if (data.keys && data.keys.length) {
            while (target.numKeys > 0) target.removeKey(target.numKeys);
            for (var k = 0; k < data.keys.length; k++) {
                var key = data.keys[k];
                if (key.value !== null && key.value !== undefined) target.setValueAtTime(timeOffset + key.time, key.value);
            }
        } else {
            jx_applySafeValue(target, data.value, timeOffset);
        }
    } catch(e) {}
}

function jx_layerKind(layer) {
    try { if (layer.nullLayer) return 'null'; } catch(e) {}
    try { if (layer.matchName === 'ADBE Text Layer') return 'text'; } catch(e) {}
    try { if (layer.matchName === 'ADBE Vector Layer') return 'shape'; } catch(e) {}
    try { if (layer.adjustmentLayer) return 'adjustment'; } catch(e) {}
    try { if (layer.source && layer.source.mainSource instanceof SolidSource) return 'solid'; } catch(e) {}
    return 'layer';
}

function jx_serializeLayer(layer, minIn) {
    var kind = jx_layerKind(layer);
    var data = {
        name: layer.name,
        kind: kind,
        label: layer.label,
        startTime: layer.startTime - minIn,
        inPoint: layer.inPoint - minIn,
        outPoint: layer.outPoint - minIn,
        stretch: layer.stretch,
        enabled: layer.enabled,
        shy: layer.shy,
        solo: layer.solo,
        locked: false,
        adjustmentLayer: false,
        threeDLayer: false,
        guideLayer: false,
        blendMode: null,
        transform: [],
        effects: []
    };
    try { data.locked = layer.locked; } catch(e) {}
    try { data.adjustmentLayer = layer.adjustmentLayer; } catch(e) {}
    try { data.threeDLayer = layer.threeDLayer; } catch(e) {}
    try { data.guideLayer = layer.guideLayer; } catch(e) {}
    try { data.blendMode = layer.blendingMode; } catch(e) {}
    try {
        if (layer.source && layer.source.mainSource instanceof SolidSource) {
            data.solid = {
                color: jx_safeValue(layer.source.mainSource.color),
                width: layer.source.width,
                height: layer.source.height,
                pixelAspect: layer.source.pixelAspect
            };
        }
    } catch(e) {}
    try {
        if (kind === 'text') data.text = jx_safeValue(layer.property('ADBE Text Properties').property('ADBE Text Document').value);
    } catch(e) {}
    try {
        var tx = layer.property('ADBE Transform Group');
        for (var t = 1; t <= tx.numProperties; t++) data.transform.push(jx_serializeProperty(tx.property(t), minIn));
    } catch(e) {}
    try {
        var fx = layer.property('ADBE Effect Parade');
        for (var f = 1; f <= fx.numProperties; f++) data.effects.push(jx_serializeProperty(fx.property(f), minIn));
    } catch(e) {}
    return data;
}

function jx_createLayerFromData(comp, data, duration) {
    var layer = null;
    var name = data.name || 'Saved Layer';
    var dur = Math.max(comp.frameDuration, duration || comp.duration || 1);
    try {
        if (data.kind === 'text') {
            layer = comp.layers.addText((data.text && data.text.text) || name);
        } else if (data.kind === 'shape') {
            layer = comp.layers.addShape();
        } else if (data.kind === 'null') {
            layer = comp.layers.addNull(dur);
        } else {
            var solid = data.solid || {};
            layer = comp.layers.addSolid(solid.color || [1, 1, 1], name, solid.width || comp.width, solid.height || comp.height, solid.pixelAspect || comp.pixelAspect, dur);
        }
    } catch(e) {
        layer = comp.layers.addSolid([1, 1, 1], name, comp.width, comp.height, comp.pixelAspect, dur);
    }
    try { layer.name = name; } catch(e) {}
    try { layer.label = data.label; } catch(e) {}
    try { layer.enabled = data.enabled; } catch(e) {}
    try { layer.shy = data.shy; } catch(e) {}
    try { layer.solo = data.solo; } catch(e) {}
    try { layer.threeDLayer = data.threeDLayer; } catch(e) {}
    try { layer.guideLayer = data.guideLayer; } catch(e) {}
    try { layer.adjustmentLayer = !!data.adjustmentLayer || data.kind === 'adjustment'; } catch(e) {}
    try { if (data.blendMode !== null) layer.blendingMode = data.blendMode; } catch(e) {}
    return layer;
}

function jx_saveLayerStack(name) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail('Select at least one layer to save.');
    name = name || ('Layer Stack ' + (new Date()).getTime());
    app.beginUndoGroup('jx: Save Layer Stack');
    try {
        var minIn = sel[0].inPoint, maxOut = sel[0].outPoint;
        for (var i = 0; i < sel.length; i++) {
            if (sel[i].inPoint < minIn) minIn = sel[i].inPoint;
            if (sel[i].outPoint > maxOut) maxOut = sel[i].outPoint;
        }
        var layers = [];
        for (var i = 0; i < sel.length; i++) layers.push(sel[i]);
        layers.sort(function(a, b) { return a.index - b.index; });
        var data = {
            id: 'jxlib_' + (new Date()).getTime(),
            name: name,
            created: (new Date()).toUTCString(),
            comp: { width: comp.width, height: comp.height, pixelAspect: comp.pixelAspect, frameRate: comp.frameRate },
            duration: Math.max(comp.frameDuration, maxOut - minIn),
            layers: [],
            preview: []
        };
        for (var l = 0; l < layers.length; l++) {
            data.layers.push(jx_serializeLayer(layers[l], minIn));
            data.preview.push({ name: layers[l].name, kind: jx_layerKind(layers[l]) });
        }
        jx_writeTextFile(jx_layerStackFile(data.id), jx_toJson(data));
        app.endUndoGroup();
        return ok('Saved ' + plural(sel.length, 'layer') + ' as "' + name + '".');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_listLayerStacks() {
    try {
        var items = [];
        var folder = jx_layerLibraryDiskFolder(false);
        if (folder && folder.exists) {
            var files = folder.getFiles('*.json');
            for (var i = 0; i < files.length; i++) {
                try {
                    var data = jx_parseJson(jx_readTextFile(files[i]));
                    var preview = [];
                    if (data.preview) {
                        for (var p = 0; p < data.preview.length; p++) preview.push('{"name":"' + escapeJsonString(data.preview[p].name || '') + '","kind":"' + escapeJsonString(data.preview[p].kind || 'layer') + '"}');
                    }
                    items.push('{"id":"' + escapeJsonString(data.id) + '","name":"' + escapeJsonString(data.name) + '","layers":' + (data.layers ? data.layers.length : 0) + ',"duration":' + Number(data.duration || 0).toFixed(3) + ',"preview":[' + preview.join(',') + ']}');
                } catch(e) {}
            }
        }
        var projectFolder = getLayerLibraryFolder(false);
        if (projectFolder) {
            for (var j = 1; j <= app.project.numItems; j++) {
                var item = app.project.item(j);
                if (item instanceof CompItem && item.parentFolder === projectFolder && String(item.comment).indexOf('jxlib_') === 0) {
                    var nm = item.name.replace(/^jxLib_/, '');
                    items.push('{"id":"' + escapeJsonString(item.comment) + '","name":"' + escapeJsonString(nm) + '","layers":' + item.numLayers + ',"duration":' + item.duration.toFixed(3) + ',"preview":[]}');
                }
            }
        }
        return '{"success":true,"items":[' + items.join(',') + ']}';
    } catch(e) {
        return fail('Failed: ' + e.toString());
    }
}

function jx_applyLayerStack(id) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    var file = jx_layerStackFile(id);
    if (file.exists) {
        app.beginUndoGroup('jx: Apply Layer Stack');
        try {
            var data = jx_parseJson(jx_readTextFile(file));
            var now = comp.time;
            var layers = data.layers || [];
            for (var i = layers.length - 1; i >= 0; i--) {
                var ld = layers[i];
                var layer = jx_createLayerFromData(comp, ld, data.duration);
                try { layer.startTime = now + Number(ld.startTime || 0); } catch(e) {}
                try { layer.inPoint = now + Number(ld.inPoint || 0); } catch(e) {}
                try { layer.outPoint = now + Number(ld.outPoint || data.duration || comp.duration); } catch(e) {}
                try { layer.stretch = ld.stretch; } catch(e) {}
                try {
                    var tx = layer.property('ADBE Transform Group');
                    for (var t = 0; t < ld.transform.length; t++) jx_applyPropertyData(tx, ld.transform[t], now);
                } catch(e) {}
                try {
                    var fx = layer.property('ADBE Effect Parade');
                    for (var f = 0; f < ld.effects.length; f++) {
                        var fxData = ld.effects[f];
                        var newFx = null;
                        try { newFx = fx.addProperty(fxData.matchName); } catch(e) {}
                        if (newFx && fxData.children) {
                            for (var c = 0; c < fxData.children.length; c++) jx_applyPropertyData(newFx, fxData.children[c], now);
                        }
                    }
                } catch(e) {}
                try { layer.locked = ld.locked; } catch(e) {}
            }
            app.endUndoGroup();
            return ok('Added "' + data.name + '" to the comp.');
        } catch(e) {
            app.endUndoGroup();
            return fail('Failed: ' + e.toString());
        }
    }
    var lib = findLayerLibraryComp(id);
    if (!lib) return fail('Layer stack not found.');
    app.beginUndoGroup('jx: Apply Layer Stack');
    try {
        var nowLegacy = comp.time;
        for (var l = lib.numLayers; l >= 1; l--) {
            lib.layer(l).copyToComp(comp);
            var copied = comp.layer(1);
            try { copied.startTime += nowLegacy; } catch(e) {}
            try { copied.inPoint += nowLegacy; } catch(e) {}
            try { copied.outPoint += nowLegacy; } catch(e) {}
        }
        app.endUndoGroup();
        return ok('Added "' + lib.name.replace(/^jxLib_/, '') + '" to the comp.');
    } catch(e) {
        app.endUndoGroup();
        return fail('Failed: ' + e.toString());
    }
}

function jx_deleteLayerStack(id) {
    var file = jx_layerStackFile(id);
    if (file.exists) {
        try {
            var data = jx_parseJson(jx_readTextFile(file));
            var name = data.name || 'Layer Stack';
            file.remove();
            return ok('Deleted "' + name + '".');
        } catch(e) {
            try { file.remove(); } catch(err) {}
            return ok('Deleted layer stack.');
        }
    }
    var lib = findLayerLibraryComp(id);
    if (!lib) return fail('Layer stack not found.');
    app.beginUndoGroup('jx: Delete Layer Stack');
    try {
        var legacyName = lib.name.replace(/^jxLib_/, '');
        lib.remove();
        app.endUndoGroup();
        return ok('Deleted "' + legacyName + '".');
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


function jx_jsonOk(data) {
    data.success = true;
    if (!data.message) data.message = 'ok';
    return JSON.stringify(data);
}

function jx_safeName(name) {
    name = String(name || 'media').replace(/[\\\/:*?"<>|]/g, '_');
    return name.replace(/^\s+|\s+$/g, '') || 'media';
}

function jx_projectMediaFolder() {
    var base;
    try {
        if (app.project && app.project.file) base = app.project.file.parent.fsName;
    } catch(e) {}
    if (!base) base = Folder.myDocuments.fsName;
    var projectName = 'Untitled Project';
    try {
        if (app.project && app.project.file) projectName = app.project.file.displayName.replace(/\.[^.]+$/, '');
    } catch(e) {}
    var folder = new Folder(base + '/jx project files/' + jx_safeName(projectName));
    if (!folder.exists) folder.create();
    return folder;
}

function jx_getProjectMediaFolder() {
    try {
        var folder = jx_projectMediaFolder();
        return jx_jsonOk({ message: 'Project media folder ready.', path: folder.fsName });
    } catch(e) { return fail('Could not create project media folder: ' + e.toString()); }
}

function jx_copyFileToFolder(sourcePath, folder) {
    var src = new File(sourcePath);
    if (!src.exists) return null;
    var clean = jx_safeName(src.displayName || src.name);
    var dst = new File(folder.fsName + '/' + clean);
    var i = 1;
    while (dst.exists) {
        var dot = clean.lastIndexOf('.');
        var stem = dot > 0 ? clean.substring(0, dot) : clean;
        var ext = dot > 0 ? clean.substring(dot) : '';
        dst = new File(folder.fsName + '/' + stem + '-' + i + ext);
        i++;
    }
    return src.copy(dst.fsName) ? dst : null;
}

function jx_importProjectMedia(sourcePath, kind) {
    try {
        var folder = jx_projectMediaFolder();
        var copied = jx_copyFileToFolder(sourcePath, folder);
        if (!copied) return fail('Could not copy media file.');
        var item = app.project.importFile(new ImportOptions(copied));
        if (item) {
            try { item.name = copied.displayName.replace(/[_-]+/g, ' '); } catch(e) {}
            try { if (kind === 'audio') item.label = 9; else if (kind === 'video') item.label = 8; else if (kind === 'image') item.label = 2; } catch(e) {}
        }
        return jx_jsonOk({ message: 'Imported ' + copied.displayName + '.', path: copied.fsName, kind: kind || 'file' });
    } catch(e) { return fail('Import failed: ' + e.toString()); }
}

function jx_findProjectItemByPath(path) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        try { if (item.file && item.file.fsName === path) return item; } catch(e) {}
    }
    return null;
}

function jx_autoLabelImportedItem(path, kind) {
    try {
        var item = jx_findProjectItemByPath(path);
        if (!item) return ok('Imported item label skipped.');
        if (kind === 'audio') item.label = 9;
        else if (kind === 'video') item.label = 8;
        else if (kind === 'image') item.label = 2;
        else item.label = 10;
        return ok('Auto-labeled imported item.');
    } catch(e) { return fail('Auto-label failed: ' + e.toString()); }
}

function jx_cleanImportedItemName(path) {
    try {
        var item = jx_findProjectItemByPath(path);
        if (!item) return ok('Filename cleanup skipped.');
        item.name = item.name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
        return ok('Cleaned imported filename.');
    } catch(e) { return fail('Filename cleanup failed: ' + e.toString()); }
}

function jx_fitCompToMedia(path) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    try {
        var item = jx_findProjectItemByPath(path);
        if (!item) return ok('Fit skipped: item not found.');
        if (item.width && item.height) { comp.width = item.width; comp.height = item.height; }
        if (item.duration && item.duration > 0) comp.duration = item.duration;
        return ok('Comp fitted to imported media.');
    } catch(e) { return fail('Fit failed: ' + e.toString()); }
}

function jx_openImportedItem(path) {
    try {
        var item = jx_findProjectItemByPath(path);
        if (!item) return ok('Open skipped: item not found.');
        app.project.activeItem = item;
        return ok('Opened imported item.');
    } catch(e) { return fail('Open imported item failed: ' + e.toString()); }
}

function jx_groupImportedItem(path, folderName) {
    try {
        var item = jx_findProjectItemByPath(path);
        if (!item) return ok('Group skipped: item not found.');
        var target = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var candidate = app.project.item(i);
            if (candidate instanceof FolderItem && candidate.name === folderName) { target = candidate; break; }
        }
        if (!target) target = app.project.items.addFolder(folderName || 'Imported Media');
        item.parentFolder = target;
        return ok('Grouped imported item.');
    } catch(e) { return fail('Group imported item failed: ' + e.toString()); }
}

function jx_stretchCompToMedia(path) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    try {
        var item = jx_findProjectItemByPath(path);
        if (!item || !item.duration || item.duration <= 0) return ok('Comp length skipped.');
        comp.duration = item.duration;
        return ok('Comp length matched media.');
    } catch(e) { return fail('Comp length match failed: ' + e.toString()); }
}

function jx_addImportStartMarker(path) {
    var comp = getComp();
    if (!comp) return fail('No active composition.');
    try {
        var name = 'Imported media';
        var item = jx_findProjectItemByPath(path);
        if (item && item.name) name = item.name;
        var marker = new MarkerValue(name);
        comp.markerProperty.setValueAtTime(comp.time, marker);
        return ok('Added import marker.');
    } catch(e) { return fail('Import marker failed: ' + e.toString()); }
}

function jx_pickMediaFile(kind) {
    try {
        var filter = kind === 'image' ? 'Images:*.png;*.jpg;*.jpeg;*.gif;*.webp;*.bmp;*.tif;*.tiff' : 'Media:*.*';
        var f = File.openDialog('Choose media file', filter, false);
        if (!f) return fail('No file selected.');
        return jx_jsonOk({ message: 'Selected file.', path: f.fsName });
    } catch(e) { return fail('File picker failed: ' + e.toString()); }
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
