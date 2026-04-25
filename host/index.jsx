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
        var indices = [];
        for (var i = 0; i < sel.length; i++) {
            indices.push(sel[i].index);
        }
        indices.sort(function(a, b) { return a - b; });

        var baseName = "Precomp";
        var n = 1;
        var name = baseName + " " + n;
        while (findItemByName(name)) {
            n++;
            name = baseName + " " + n;
        }

        comp.layers.precompose(indices, name, true);
        app.endUndoGroup();
        return ok("Precomposed " + plural(indices.length, "layer") + " into \"" + name + "\".");
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
                sel[i].frameBlending = true;
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

function jx_trimCompToWorkArea() {
    var comp = getComp();
    if (!comp) return fail("No active composition.");

    app.beginUndoGroup("jx: Trim Comp to Work Area");
    try {
        var start = comp.workAreaStart;
        var dur = comp.workAreaDuration;
        comp.duration = dur;
        comp.displayStartTime = start;
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
    var clipDur = layer.outPoint - layer.inPoint;
    if (clipDur <= 0) return false;

    var found = false;
    walkProps(layer, function(prop) {
        if (prop.numKeys < 2) return;

        var firstTime = prop.keyTime(1);
        var lastTime = prop.keyTime(prop.numKeys);
        var span = lastTime - firstTime;
        if (span < 0.0001) return;

        found = true;
        var scale = clipDur / span;

        // Snapshot all keyframe data
        var keys = [];
        for (var k = 1; k <= prop.numKeys; k++) {
            var kd = {
                time: prop.keyTime(k),
                value: prop.keyValue(k),
                interpIn: prop.keyInInterpolationType(k),
                interpOut: prop.keyOutInterpolationType(k),
                easeIn: null,
                easeOut: null,
                spatialIn: null,
                spatialOut: null
            };
            try { kd.easeIn = prop.keyInTemporalEase(k); } catch (e) {}
            try { kd.easeOut = prop.keyOutTemporalEase(k); } catch (e) {}
            try { kd.spatialIn = prop.keyInSpatialTangent(k); } catch (e) {}
            try { kd.spatialOut = prop.keyOutSpatialTangent(k); } catch (e) {}
            keys.push(kd);
        }

        // Remove all keys (reverse order)
        for (var k = prop.numKeys; k >= 1; k--) prop.removeKey(k);

        // Re-add at scaled times
        for (var k = 0; k < keys.length; k++) {
            var newTime = clipStart + (keys[k].time - firstTime) * scale;
            try { prop.setValueAtTime(newTime, keys[k].value); } catch (e) {}
        }

        // Restore interpolation + easing
        for (var k = 1; k <= prop.numKeys; k++) {
            var kd = keys[k - 1];

            try { prop.setInterpolationTypeAtKey(k, kd.interpIn, kd.interpOut); } catch (e) {}

            // Scale speeds inversely so the curve shape is preserved
            if (kd.easeIn && kd.easeOut) {
                try {
                    var newIn = [], newOut = [];
                    for (var e = 0; e < kd.easeIn.length; e++) {
                        newIn.push(new KeyframeEase(kd.easeIn[e].speed / scale, kd.easeIn[e].influence));
                        newOut.push(new KeyframeEase(kd.easeOut[e].speed / scale, kd.easeOut[e].influence));
                    }
                    prop.setTemporalEaseAtKey(k, newIn, newOut);
                } catch (e) {}
            }

            // Spatial tangents define path shape, not timing, so leave them unchanged
            if (kd.spatialIn && kd.spatialOut) {
                try { prop.setSpatialTangentsAtKey(k, kd.spatialIn, kd.spatialOut); } catch (e) {}
            }
        }
    });

    return found;
}

// ============================================================
// GRAPH COPY
// Returns JSON with all keyframe data including interpolation
// and ease handles so the graph shape can be fully restored.
// ============================================================

function jx_copyGraphs() {
    var comp = getComp();
    if (!comp) return JSON.stringify({ success: false, message: "No active composition.", data: null });

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return JSON.stringify({ success: false, message: "Select at least one layer.", data: null });

    try {
        var result = [];
        for (var i = 0; i < sel.length; i++) {
            var props = [];
            gatherProps(sel[i], props, "");
            if (props.length > 0) result.push({ layerName: sel[i].name, properties: props });
        }

        if (result.length === 0) {
            return JSON.stringify({ success: false, message: "No keyframed properties found.", data: null });
        }

        var totalKeys = 0;
        for (var i = 0; i < result.length; i++) {
            for (var j = 0; j < result[i].properties.length; j++) {
                totalKeys += result[i].properties[j].keys.length;
            }
        }

        return JSON.stringify({
            success: true,
            message: "Copied " + plural(totalKeys, "keyframe") + " from " + plural(result.length, "layer") + ".",
            data: result
        });
    } catch (e) {
        return JSON.stringify({ success: false, message: "Copy failed: " + e.toString(), data: null });
    }
}

function gatherProps(propGroup, out, pathPrefix) {
    for (var i = 1; i <= propGroup.numProperties; i++) {
        var prop = propGroup.property(i);
        var path = pathPrefix ? (pathPrefix + " / " + prop.name) : prop.name;

        if (prop.propertyType === PropertyType.PROPERTY) {
            if (prop.numKeys === 0) continue;

            var pd = { name: prop.name, path: path, matchName: prop.matchName, keys: [] };

            for (var k = 1; k <= prop.numKeys; k++) {
                var kd = {
                    time: prop.keyTime(k),
                    value: safeValue(prop.keyValue(k)),
                    interpIn: prop.keyInInterpolationType(k),
                    interpOut: prop.keyOutInterpolationType(k)
                };
                try {
                    var ei = prop.keyInTemporalEase(k);
                    var eo = prop.keyOutTemporalEase(k);
                    kd.easeIn = [];
                    kd.easeOut = [];
                    for (var e = 0; e < ei.length; e++) {
                        kd.easeIn.push({ speed: ei[e].speed, influence: ei[e].influence });
                        kd.easeOut.push({ speed: eo[e].speed, influence: eo[e].influence });
                    }
                } catch (e) {}
                try {
                    kd.spatialIn = safeValue(prop.keyInSpatialTangent(k));
                    kd.spatialOut = safeValue(prop.keyOutSpatialTangent(k));
                } catch (e) {}
                pd.keys.push(kd);
            }

            out.push(pd);
        } else {
            gatherProps(prop, out, path);
        }
    }
}

function safeValue(v) {
    if (v instanceof Array) return v;
    return v;
}

// ============================================================
// GRAPH PASTE
// ============================================================

function jx_pasteGraphs(jsonStr) {
    var comp = getComp();
    if (!comp) return fail("No active composition.");

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return fail("Select at least one layer.");

    var layersData;
    try {
        layersData = JSON.parse(jsonStr);
    } catch (e) {
        return fail("Graph data is corrupted.");
    }

    app.beginUndoGroup("jx: Paste Graphs");
    try {
        var applied = 0;
        for (var i = 0; i < sel.length; i++) {
            var layer = sel[i];
            var src = layersData[Math.min(i, layersData.length - 1)];

            for (var j = 0; j < src.properties.length; j++) {
                var pd = src.properties[j];
                var target = findPropByMatchName(layer, pd.matchName);
                if (!target) continue;

                for (var k = target.numKeys; k >= 1; k--) target.removeKey(k);

                for (var k = 0; k < pd.keys.length; k++) {
                    try { target.setValueAtTime(pd.keys[k].time, pd.keys[k].value); } catch (e) {}
                }

                for (var k = 1; k <= target.numKeys; k++) {
                    var kd = pd.keys[k - 1];
                    try { target.setInterpolationTypeAtKey(k, kd.interpIn, kd.interpOut); } catch (e) {}

                    if (kd.easeIn && kd.easeOut) {
                        try {
                            var newIn = [], newOut = [];
                            for (var e = 0; e < kd.easeIn.length; e++) {
                                newIn.push(new KeyframeEase(kd.easeIn[e].speed, kd.easeIn[e].influence));
                                newOut.push(new KeyframeEase(kd.easeOut[e].speed, kd.easeOut[e].influence));
                            }
                            target.setTemporalEaseAtKey(k, newIn, newOut);
                        } catch (e) {}
                    }

                    if (kd.spatialIn && kd.spatialOut) {
                        try { target.setSpatialTangentsAtKey(k, kd.spatialIn, kd.spatialOut); } catch (e) {}
                    }
                }
                applied++;
            }
        }
        app.endUndoGroup();
        return ok("Pasted graphs onto " + plural(applied, "property") + ".");
    } catch (e) {
        app.endUndoGroup();
        return fail("Paste failed: " + e.toString());
    }
}

function findPropByMatchName(propGroup, matchName) {
    for (var i = 1; i <= propGroup.numProperties; i++) {
        var p = propGroup.property(i);
        if (p.matchName === matchName) return p;
        if (p.propertyType !== PropertyType.PROPERTY) {
            var found = findPropByMatchName(p, matchName);
            if (found) return found;
        }
    }
    return null;
}
