# jx Curve Model

Curve description model for v2.0.1-alpha. It predicts graph-editor cubic bezier handles from short editor prompts and longer emotion, camera, timing, and physics descriptions.

## Current Pack

- 18,168 training prompts.
- 1,817 training shard files in training/.
- 74 heavily repeated simple and editor prompts.
- Dedicated terms include zoom in, zoom out, slam in, slam out, mid deep, fast slow, slow fast, product card pop in, text reveal, logo hit, camera zoom, beat drop, hard zoom in, soft zoom out, and clean slam out.
- Dedicated motion families include zoom_in, zoom_out, slam_in, slam_out, mid_deep, fast_slow, and slow_fast.
- JavaScript regression weight shards live in weights/.
- curve-ai-model.js blends trained regression output with semantic trait inference for safer cubic bezier handles.
- curve-ai-presets.js now includes a larger suggestion pool and the panel shuffles launch chips every time it opens.

## Suggestion Behavior

The panel shows 12 prompt chips per launch. The chips are randomly selected from JX_CURVE_AI_SUGGESTION_POOL, with JX_CURVE_AI_EXAMPLES kept as a stable fallback.

## Regenerate

Run this from client/js/curve-ai:

python3 train-curve-ai.py
