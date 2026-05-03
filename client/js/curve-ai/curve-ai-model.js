var JXCurveAI = (function () {
    var data = window.JX_CURVE_AI_DATA || { emotions: {}, tokens: {}, phrases: [] };
    var meta = window.JX_CURVE_AI_MODEL_META || { sampleCount: 0, featureCount: 0, families: [] };
    var weightShards = window.JX_CURVE_AI_WEIGHT_SHARDS || [];
    var weights = mergeWeightShards(weightShards);
    var outputs = ['h1x', 'h1y', 'h2x', 'h2y'];

    function mergeWeightShards(shards) {
        var merged = {};
        for (var i = 0; i < shards.length; i++) {
            var shard = shards[i] || {};
            Object.keys(shard).forEach(function (key) { merged[key] = shard[key]; });
        }
        return merged;
    }

    function clamp(value, min, max) {
        value = parseFloat(value);
        if (isNaN(value)) value = 0;
        return Math.max(min, Math.min(max, value));
    }

    function round(value) { return Math.round(value * 1000) / 1000; }

    function tokenize(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9.%\-\s]/g, ' ')
            .replace(/-/g, ' ')
            .split(/\s+/)
            .filter(Boolean);
    }

    function blankTraits() {
        return { energy: 0, tension: 0, weight: 0, bounce: 0, overshoot: 0, chaos: 0, anticipation: 0, confidence: 0 };
    }

    function addWeightedTraits(target, source, weight) {
        Object.keys(source || {}).forEach(function (key) {
            if (typeof target[key] !== 'number') target[key] = 0;
            target[key] += source[key] * weight;
        });
        target.confidence += weight;
    }

    function featureVector(text) {
        var prompt = String(text || '').toLowerCase();
        var toks = tokenize(prompt);
        var counts = {};
        toks.forEach(function (token) { counts[token] = (counts[token] || 0) + 1; });
        counts.bias = 1;
        counts.len = Math.min(toks.length / 10, 2);
        counts.intensity = toks.filter(function (token) { return data.tokens[token] || token === 'very' || token === 'super' || token === 'extreme' || token === 'subtle' || token === 'tiny'; }).length / 3;
        counts.has_percent = prompt.indexOf('%') !== -1 ? 1 : 0;
        counts.has_negative = toks.some(function (token) { return token === 'no' || token === 'less' || token === 'without'; }) ? 1 : 0;
        counts.has_and = toks.indexOf('and') !== -1 ? 1 : 0;
        counts.has_but = toks.indexOf('but') !== -1 ? 1 : 0;
        return counts;
    }

    function neuralPredict(text) {
        if (!Object.keys(weights).length) return null;
        var features = featureVector(text);
        var raw = [0, 0, 0, 0];
        Object.keys(features).forEach(function (key) {
            var vector = weights[key];
            if (!vector) return;
            var amount = features[key];
            for (var i = 0; i < 4; i++) raw[i] += vector[i] * amount;
        });
        return {
            h1: { x: round(clamp(raw[0], 0.02, 0.96)), y: round(clamp(raw[1], -1.4, 1.4)) },
            h2: { x: round(clamp(raw[2], 0.02, 0.98)), y: round(clamp(raw[3], -0.4, 2.35)) }
        };
    }

    function readNumberIntent(text, traits) {
        var speed = text.match(/(?:speed|energy|fast|intensity)\s*(?:=|:|at|to)?\s*(\d{1,3})\s*%?/);
        if (speed) traits.energy += clamp(parseInt(speed[1], 10) / 100, 0, 1) * 0.55;
        var bounce = text.match(/(?:bounce|overshoot|spring)\s*(?:=|:|at|to)?\s*(\d{1,3})\s*%?/);
        if (bounce) {
            var amount = clamp(parseInt(bounce[1], 10) / 100, 0, 1);
            traits.bounce += amount * 0.65;
            traits.overshoot += amount * 0.45;
        }
        var slow = text.match(/(?:slow|soft)\s*(?:=|:|at|to)?\s*(\d{1,3})\s*%?/);
        if (slow) {
            var softness = clamp(parseInt(slow[1], 10) / 100, 0, 1);
            traits.energy -= softness * 0.36;
            traits.tension -= softness * 0.24;
        }
    }

    function inferTraits(text) {
        var lower = String(text || '').toLowerCase();
        var tokens = tokenize(lower);
        var traits = blankTraits();
        tokens.forEach(function (token) {
            var emotion = data.tokens[token] || token;
            if (data.emotions[emotion]) addWeightedTraits(traits, data.emotions[emotion], 1);
        });
        (data.phrases || []).forEach(function (phrase) {
            for (var i = 0; i < phrase.match.length; i++) {
                if (lower.indexOf(phrase.match[i]) !== -1) addWeightedTraits(traits, phrase.delta, 1.2);
            }
        });
        readNumberIntent(lower, traits);
        if (!traits.confidence) addWeightedTraits(traits, data.emotions.elegant || {}, 0.7);
        var divisor = Math.max(1, traits.confidence);
        ['energy', 'tension', 'weight', 'bounce', 'overshoot', 'chaos', 'anticipation'].forEach(function (key) {
            traits[key] = clamp(traits[key] / divisor, -1, 1.4);
        });
        traits.confidence = clamp(traits.confidence / 4, 0.18, 1);
        return traits;
    }

    function traitsToCurve(traits) {
        var energy = clamp(traits.energy, 0, 1);
        var tension = clamp(traits.tension, 0, 1);
        var weight = clamp(traits.weight, 0, 1);
        var bounce = clamp(traits.bounce, 0, 1);
        var overshoot = clamp(traits.overshoot, 0, 1);
        var chaos = clamp(traits.chaos, 0, 1);
        var anticipation = clamp(traits.anticipation, 0, 1);
        var out = clamp(0.18 + energy * 0.18 + weight * 0.44 - tension * 0.10 - chaos * 0.08, 0.04, 0.92);
        var inn = clamp(0.18 + weight * 0.26 + tension * 0.24 - energy * 0.12 + chaos * 0.18, 0.04, 0.92);
        var h1y = clamp(0.02 - anticipation * 0.72 - bounce * 0.36 + chaos * 0.76, -1.35, 1.35);
        var h2y = clamp(1.0 + overshoot * 0.82 + bounce * 0.42 - chaos * 0.72 - weight * 0.08, -0.35, 2.25);
        if (tension > 0.78 && energy > 0.62) { out = clamp(out * 0.58, 0.04, 0.62); inn = clamp(inn * 0.72, 0.04, 0.68); }
        if (weight > 0.68) { out = clamp(out + 0.18, 0.04, 0.94); h2y = clamp(h2y - 0.12, -0.35, 2.25); }
        if (chaos > 0.52) { h1y = clamp(0.76 + chaos * 0.52, -1.35, 1.35); h2y = clamp(0.24 - chaos * 0.30 + overshoot * 0.18, -0.35, 2.25); }
        return { h1: { x: round(out), y: round(h1y) }, h2: { x: round(1 - inn), y: round(h2y) } };
    }

    function blendCurves(modelCurve, traitCurve, confidence) {
        if (!modelCurve) return traitCurve;
        var modelWeight = clamp(0.58 + confidence * 0.26, 0.58, 0.84);
        var traitWeight = 1 - modelWeight;
        return {
            h1: {
                x: round(modelCurve.h1.x * modelWeight + traitCurve.h1.x * traitWeight),
                y: round(modelCurve.h1.y * modelWeight + traitCurve.h1.y * traitWeight)
            },
            h2: {
                x: round(modelCurve.h2.x * modelWeight + traitCurve.h2.x * traitWeight),
                y: round(modelCurve.h2.y * modelWeight + traitCurve.h2.y * traitWeight)
            }
        };
    }

    function describeTraits(traits) {
        var labels = [];
        if (traits.energy > 0.62) labels.push('fast'); else if (traits.energy < 0.30) labels.push('slow');
        if (traits.weight > 0.58) labels.push('heavy');
        if (traits.bounce > 0.42) labels.push('bouncy');
        if (traits.overshoot > 0.32) labels.push('overshoot');
        if (traits.chaos > 0.44) labels.push('jitter');
        if (traits.tension > 0.58) labels.push('tense'); else if (traits.tension < 0.22) labels.push('soft');
        return labels.length ? labels.join(' · ') : 'balanced';
    }

    function predict(text) {
        var traits = inferTraits(text);
        var traitCurve = traitsToCurve(traits);
        var modelCurve = neuralPredict(text);
        var confidence = clamp(traits.confidence + (modelCurve ? 0.18 : 0), 0.18, 1);
        return {
            curve: blendCurves(modelCurve, traitCurve, confidence),
            modelCurve: modelCurve,
            traitCurve: traitCurve,
            traits: traits,
            summary: describeTraits(traits),
            confidence: Math.round(confidence * 100),
            model: { type: 'ridge-regression-ensemble', sampleCount: meta.sampleCount || 0, featureCount: Object.keys(weights).length, shards: weightShards.length }
        };
    }

    return {
        predict: predict,
        inferTraits: inferTraits,
        traitsToCurve: traitsToCurve,
        neuralPredict: neuralPredict,
        tokenize: tokenize,
        metadata: meta,
        version: meta.version || data.version || 'local'
    };
})();
