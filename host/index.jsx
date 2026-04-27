// jx Tools v1.0 - ExtendScript Host
// After Effects automation functions

// ============================================================
// UTILITIES
// ============================================================

function ok(msg) {
    return JSON.stringify({ success: true, message: msg });
}

function fail(msg) {
    return JSON.stringify({ success: false, message: msg });
}

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
    return n + " " + word + (n === 1 ? "" : "s");
}

// Walk every leaf Property in a layer and call fn(prop)
function walkProps(propGroup, fn) {
    for (var i = 1; i <= propGroup.numProperties; i++) {
        var p = propGroup.property(i);
        if (p.propertyType === PropertyType.PROPERTY) {
            fn(p);
        } else {
            walkProps(p, fn);
        }
    }
}

// ============================================================
// LAYER TOOLS
// ============================================================

function jx_precomposeSelected() {
    var comp = getComp();
    if (!comp) return fail("No active composition.");

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail("Select at least one layer.");

    app.beginUndoGroup("jx: Precompose Selected");
    try {
        // Snapshot before any precompose calls shift indices
        var layers = [];
        for (var i = 0; i < sel.length; i++) {
            layers.push({
                index:    sel[i].index,
                name:     sel[i].name,
                inPoint:  sel[i].inPoint,
                outPoint: sel[i].outPoint
            });
        }

        // Highest index first so lower indices stay stable
        layers.sort(function(a, b) { return b.index - a.index; });

        var count = 0;
        for (var i = 0; i < layers.length; i++) {
            var info = layers[i];
            var dur  = info.outPoint - info.inPoint;
            if (dur <= 0) { count++; continue; }

            var name = info.name;
            var n = 1;
            while (findItemByName(name)) {
                name = info.name + " " + n;
                n++;
            }

            comp.layers.precompose([info.index], name, true);

            var precompItem = findItemByName(name);
            if (!precompItem) { count++; continue; }

            // Find the precomp layer by source name — more reliable than
            // comp.layer(info.index) which can point to the wrong layer
            // after indices shift.
            var precompLayer = null;
            for (var j = 1; j <= comp.numLayers; j++) {
                try {
                    if (comp.layer(j).source && comp.layer(j).source.name === name) {
                        precompLayer = comp.layer(j);
                        break;
                    }
                } catch (e) {}
            }

            // ── Step 1 ──────────────────────────────────────────────────────
            // Set precomp layer startTime = inPoint BEFORE shortening the
            // precomp duration.  With startTime=inPoint the maximum valid
            // outPoint = startTime + newDuration = inPoint + dur = outPoint,
            // so AE cannot clamp it when we trim in step 3.
            if (precompLayer) {
                try { precompLayer.startTime = info.inPoint; } catch (e) {}
            }

            // ── Step 2 ──────────────────────────────────────────────────────
            // Shift the inner layer to t=0 in the precomp.
            // AE placed it at its original comp-time position (inPoint … outPoint).
            // We shift startTime, inPoint, and outPoint by the same delta so
            // the source frames shown are identical — only the comp-time
            // position changes.  Keyframes follow because they live in comp time.
            if (precompItem.numLayers > 0) {
                var il     = precompItem.layer(1);
                var ilIn   = il.inPoint;
                var ilDur  = il.outPoint - ilIn;
                if (ilIn !== 0) {
                    var shift = -ilIn;
                    walkProps(il, function(prop) { shiftPropKeys(prop, shift); });
                    try { il.startTime += shift; } catch (e) {}
                    try { il.inPoint   = 0;      } catch (e) {}
                    try { il.outPoint  = ilDur;  } catch (e) {}
                }
            }

            // ── Step 3 ──────────────────────────────────────────────────────
            // Trim precomp to the exact clip duration.
            try { precompItem.duration = dur; } catch (e) {}

            // ── Step 4 ──────────────────────────────────────────────────────
            // Explicitly restore the precomp layer's visible range in the
            // parent comp — overrides any AE auto-adjustment from steps 1-3.
            if (precompLayer) {
                try { precompLayer.inPoint  = info.inPoint;  } catch (e) {}
                try { precompLayer.outPoint = info.outPoint; } catch (e) {}
            }

            count++;
        }

        app.endUndoGroup();
        return ok("Precomposed " + plural(count, "layer") + " individually.");
    } catch (e) {
        app.endUndoGroup();
        return fail("Failed: " + e.toString());
    }
}

function jx_enableFrameBlending(modeStr) {
    var comp = getComp();
    if (!comp) return fail("No active composition.");

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail("Select at least one layer.");

    var blendMode = (modeStr === "pixel")
        ? FrameBlendingType.PIXEL_MOTION
        : FrameBlendingType.FRAME_MIX;

    app.beginUndoGroup("jx: Frame Blending");
    try {
        comp.frameBlending = true;
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
            if (sel[i] instanceof AVLayer) {
                sel[i].frameBlendingType = blendMode;
                count++;
            }
        }
        app.endUndoGroup();
        var label = (modeStr === "pixel") ? "Pixel Motion" : "Frame Mix";
        return ok("Frame blending (" + label + ") on " + plural(count, "layer") + ".");
    } catch (e) {
        app.endUndoGroup();
        return fail("Failed: " + e.toString());
    }
}

function jx_enableMotionBlur() {
    var comp = getComp();
    if (!comp) return fail("No active composition.");

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail("Select at least one layer.");

    app.beginUndoGroup("jx: Motion Blur");
    try {
        comp.motionBlur = true;
        for (var i = 0; i < sel.length; i++) {
            sel[i].motionBlur = true;
        }
        app.endUndoGroup();
        return ok("Motion blur on " + plural(sel.length, "layer") + ".");
    } catch (e) {
        app.endUndoGroup();
        return fail("Failed: " + e.toString());
    }
}

// Shifts all keyframes on a property by delta seconds, preserving interpolation and easing.
function shiftPropKeys(prop, delta) {
    if (prop.numKeys === 0) return;
    var keys = [];
    for (var k = 1; k <= prop.numKeys; k++) {
        var kd = {
            time: prop.keyTime(k) + delta,
            value: prop.keyValue(k),
            interpIn: prop.keyInInterpolationType(k),
            interpOut: prop.keyOutInterpolationType(k),
            easeIn: null, easeOut: null,
            spatialIn: null, spatialOut: null
        };
        try { kd.easeIn = prop.keyInTemporalEase(k); } catch(e) {}
        try { kd.easeOut = prop.keyOutTemporalEase(k); } catch(e) {}
        try { kd.spatialIn = prop.keyInSpatialTangent(k); } catch(e) {}
        try { kd.spatialOut = prop.keyOutSpatialTangent(k); } catch(e) {}
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
                var newIn = [], newOut = [];
                for (var e = 0; e < kd.easeIn.length; e++) {
                    newIn.push(new KeyframeEase(kd.easeIn[e].speed, kd.easeIn[e].influence));
                    newOut.push(new KeyframeEase(kd.easeOut[e].speed, kd.easeOut[e].influence));
                }
                prop.setTemporalEaseAtKey(k, newIn, newOut);
            } catch(e) {}
        }
        if (kd.spatialIn && kd.spatialOut) {
            try { prop.setSpatialTangentsAtKey(k, kd.spatialIn, kd.spatialOut); } catch(e) {}
        }
    }
}

function jx_trimCompToWorkArea() {
    var comp = getComp();
    if (!comp) return fail("No active composition.");

    app.beginUndoGroup("jx: Trim Comp to Work Area");
    try {
        var offset = comp.workAreaStart;
        var dur = comp.workAreaDuration;

        // Shift all layers and their keyframes back by offset so work area
        // start becomes comp time 0, preserving graph shapes.
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            (function(lyr) {
                walkProps(lyr, function(prop) { shiftPropKeys(prop, -offset); });
                lyr.startTime -= offset;
            })(layer);
        }

        comp.duration = dur;
        comp.displayStartTime = 0;
        app.endUndoGroup();
        return ok("Comp trimmed to work area.");
    } catch (e) {
        app.endUndoGroup();
        return fail("Failed: " + e.toString());
    }
}

// ============================================================
// COLOR
// ============================================================

function jx_applyFFXPreset(presetPath) {
    var comp = getComp();
    if (!comp) return fail("No active composition.");

    var presetFile = new File(presetPath);
    if (!presetFile.exists) return fail("File not found:\n" + presetPath);

    app.beginUndoGroup("jx: Apply Color Preset");
    try {
        var adj = comp.layers.addSolid(
            [1, 1, 1],
            "jx Color",
            comp.width,
            comp.height,
            comp.pixelAspect,
            comp.duration
        );
        adj.adjustmentLayer = true;
        adj.startTime = comp.workAreaStart;
        adj.outPoint = comp.workAreaStart + comp.workAreaDuration;
        adj.moveToBeginning();
        adj.applyPreset(presetFile);
        app.endUndoGroup();
        return ok("Color preset applied to new adjustment layer.");
    } catch (e) {
        app.endUndoGroup();
        return fail("Failed: " + e.toString());
    }
}

// ============================================================
// KEYFRAME STRETCH
// Stretches all keyframes on each selected layer to exactly
// span the layer's in/out points, preserving graph shape.
// Ease speeds are divided by the scale factor so the curve
// shape is maintained in the graph editor.
// ============================================================

function jx_stretchKeyframesToClip() {
    var comp = getComp();
    if (!comp) return fail("No active composition.");

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail("Select at least one layer.");

    app.beginUndoGroup("jx: Stretch Keyframes to Clip");
    try {
        var stretched = 0;
        for (var i = 0; i < sel.length; i++) {
            if (stretchLayer(sel[i])) stretched++;
        }
        app.endUndoGroup();
        if (stretched === 0) return ok("No stretchable keyframes found.");
        return ok("Stretched keys on " + plural(stretched, "layer") + ".");
    } catch (e) {
        app.endUndoGroup();
        return fail("Failed: " + e.toString());
    }
}

function stretchLayer(layer) {
    var clipStart = layer.inPoint;
    var clipDur   = layer.outPoint - layer.inPoint;
    if (clipDur <= 0) return false;

    // Phase 1 — snapshot every property's selected keys before touching anything.
    // Modifying keys on one property causes AE to clear selectedKeys on others,
    // so we must read all selections upfront.
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
                time:      prop.keyTime(idx),
                value:     prop.keyValue(idx),
                interpIn:  prop.keyInInterpolationType(idx),
                interpOut: prop.keyOutInterpolationType(idx),
                easeIn: null, easeOut: null,
                spatialIn: null, spatialOut: null
            };
            try { kd.easeIn    = prop.keyInTemporalEase(idx);   } catch (e) {}
            try { kd.easeOut   = prop.keyOutTemporalEase(idx);  } catch (e) {}
            try { kd.spatialIn = prop.keyInSpatialTangent(idx); } catch (e) {}
            try { kd.spatialOut= prop.keyOutSpatialTangent(idx);} catch (e) {}
            keys.push(kd);
        }
        propData.push({ prop: prop, selIndices: sel, keys: keys, firstTime: firstTime, span: span });
    });

    if (propData.length === 0) return false;

    // Phase 2 — apply the stretch to every snapshotted property.
    for (var i = 0; i < propData.length; i++) {
        var pd        = propData[i];
        var prop      = pd.prop;
        var scale     = clipDur / pd.span;
        var firstTime = pd.firstTime;
        var keys      = pd.keys;
        var selIdx    = pd.selIndices;

        // Remove selected keys highest-index-first so earlier indices stay valid
        for (var k = selIdx.length - 1; k >= 0; k--) prop.removeKey(selIdx[k]);

        // Re-add at scaled positions
        var newTimes = [];
        for (var k = 0; k < keys.length; k++) {
            var t = clipStart + (keys[k].time - firstTime) * scale;
            newTimes.push(t);
            try { prop.setValueAtTime(t, keys[k].value); } catch (e) {}
        }

        // Restore interpolation by locating each key by its new time
        // (non-selected keys remain, so sequential indexing is unreliable)
        for (var k = 0; k < keys.length; k++) {
            var kd  = keys[k];
            var t   = newTimes[k];
            var idx = -1;
            for (var m = 1; m <= prop.numKeys; m++) {
                if (Math.abs(prop.keyTime(m) - t) < 0.0001) { idx = m; break; }
            }
            if (idx < 0) continue;

            try { prop.setInterpolationTypeAtKey(idx, kd.interpIn, kd.interpOut); } catch (e) {}
            if (kd.easeIn && kd.easeOut) {
                try {
                    var ni = [], no = [];
                    for (var ei = 0; ei < kd.easeIn.length; ei++) {
                        ni.push(new KeyframeEase(kd.easeIn[ei].speed / scale, kd.easeIn[ei].influence));
                        no.push(new KeyframeEase(kd.easeOut[ei].speed / scale, kd.easeOut[ei].influence));
                    }
                    prop.setTemporalEaseAtKey(idx, ni, no);
                } catch (e) {}
            }
            if (kd.spatialIn && kd.spatialOut) {
                try { prop.setSpatialTangentsAtKey(idx, kd.spatialIn, kd.spatialOut); } catch (e) {}
            }
        }
    }

    return true;
}

// ============================================================
// UPDATE CHECK (curl fallback for restricted CEP networks)
// Uses system.callSystem so it bypasses the CEP browser sandbox.
// curl is built-in on macOS and Windows 10+.
// ============================================================

function jx_fetchUpdateInfo() {
    try {
        var url = "https://api.github.com/repos/williamm0/Extension/releases/latest";
        var result = system.callSystem(
            'curl -s --max-time 8 --user-agent "jxtools-cep" "' + url + '"'
        );
        return result ? result : '';
    } catch (e) {
        return '';
    }
}

// ============================================================
// EASING
// Applies bezier ease to all keyframes on selected layers.
// easeOutInf and easeInInf are influence values (0-100).
// ============================================================

function jx_applyEase(easeOutInf, easeInInf) {
    var comp = getComp();
    if (!comp) return fail("No active composition.");

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail("Select at least one layer.");

    app.beginUndoGroup("jx: Apply Ease");
    try {
        var count = 0;
        for (var i = 0; i < sel.length; i++) {
            walkProps(sel[i], function (prop) {
                if (prop.numKeys < 2) return;
                for (var k = 1; k <= prop.numKeys; k++) {
                    try {
                        prop.setInterpolationTypeAtKey(
                            k,
                            KeyframeInterpolationType.BEZIER,
                            KeyframeInterpolationType.BEZIER
                        );
                    } catch (e) {}
                    try {
                        var val = prop.keyValue(k);
                        var dim = (val instanceof Array) ? val.length : 1;
                        var eIn  = [], eOut = [];
                        for (var d = 0; d < dim; d++) {
                            eIn.push(new KeyframeEase(0, easeInInf));
                            eOut.push(new KeyframeEase(0, easeOutInf));
                        }
                        prop.setTemporalEaseAtKey(k, eIn, eOut);
                    } catch (e) {}
                    count++;
                }
            });
        }
        app.endUndoGroup();
        if (count === 0) return ok("No keyframes found on selected layers.");
        return ok("Ease applied to " + plural(count, "keyframe") + ".");
    } catch (e) {
        app.endUndoGroup();
        return fail("Failed: " + e.toString());
    }
}
