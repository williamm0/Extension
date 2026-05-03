from pathlib import Path
import json, random, shutil, zipfile
root = Path(__file__).resolve().parent
(root/'training').mkdir(parents=True, exist_ok=True)
(root/'weights').mkdir(parents=True, exist_ok=True)
random.seed(84)

families = {
    'snap':      dict(words='snap punch impact hit hard sharp aggressive attack slam fast whip flick smack popin quick'.split(), traits=[.92,.88,.48,.10,.26,.12,.10], curve=[.09,-.10,.22,1.20]),
    'bounce':    dict(words='bounce bouncy elastic rubber spring playful pop fun bubbly jump hop boing'.split(), traits=[.72,.24,.20,.88,.48,.05,.34], curve=[.22,-.52,.40,1.46]),
    'float':     dict(words='float dreamy airy soft gentle calm drift smooth cloud glide flow slow'.split(), traits=[.22,.10,.18,.04,.06,.01,.05], curve=[.54,.02,.78,.99]),
    'cinematic': dict(words='cinematic heavy slow weight gravity massive dramatic title trailer epic strong'.split(), traits=[.34,.25,.88,.00,.04,.00,.08], curve=[.76,-.02,.70,.93]),
    'jitter':    dict(words='anxious nervous jitter shaky glitch chaotic panic uneasy twitch shake'.split(), traits=[.80,.84,.36,.05,.14,.82,.12], curve=[.19,1.16,.62,.05]),
    'luxury':    dict(words='luxury premium clean elegant expensive silky graceful minimal smooth classy'.split(), traits=[.30,.08,.42,.00,.02,.00,.02], curve=[.82,.00,.82,1.00]),
    'scary':     dict(words='scary horror creepy dark suspense fear haunted weird eerie'.split(), traits=[.56,.94,.60,.02,.20,.55,.20], curve=[.24,.82,.55,.12]),
    'sad':       dict(words='sad tired lonely slow melancholic exhausted soft droop fall'.split(), traits=[.16,.30,.74,.00,.00,.04,.04], curve=[.66,.04,.68,.88]),
    'robot':     dict(words='linear robot constant mechanical flat steady normal basic default even'.split(), traits=[.45,.45,.35,.00,.00,.00,.00], curve=[.33,.33,.67,.67]),
    'anticipate':dict(words='anticipate windup wind-up pullback back recoil prepare reverse preload'.split(), traits=[.64,.52,.38,.26,.36,.08,.78], curve=[.20,-.72,.46,1.28]),
    'smooth':    dict(words='smooth ease easing easy clean soft simple normal flow nice'.split(), traits=[.32,.12,.30,.00,.03,.00,.00], curve=[.62,.02,.74,1.00]),
    'fast':      dict(words='fast quick speedy rapid snappy faster speed rush instant'.split(), traits=[.86,.56,.24,.10,.12,.08,.04], curve=[.16,-.03,.34,1.10]),
    'slow':      dict(words='slow slower lazy chill gradual relaxed soft easein'.split(), traits=[.14,.10,.52,.00,.00,.00,.02], curve=[.72,.03,.72,.94]),
    'overshoot': dict(words='overshoot over past exceed push pop overswing overdo'.split(), traits=[.66,.38,.28,.46,.88,.06,.18], curve=[.28,-.28,.36,1.74]),
    'settle':    dict(words='settle landing stop rest finish hold gentle end'.split(), traits=[.28,.16,.54,.08,.06,.00,.00], curve=[.54,.02,.88,.98]),
    'zoom_in':   dict(words='zoomin zoom-in zoom in pushin push-in push close closer punchin punch-in approach'.split(), traits=[.78,.42,.44,.16,.18,.04,.12], curve=[.18,-.06,.42,1.12]),
    'zoom_out':  dict(words='zoomout zoom-out zoom out pullout pull-out pull away wide wider reveal'.split(), traits=[.36,.18,.62,.02,.03,.00,.04], curve=[.68,.03,.84,.96]),
    'slam_in':   dict(words='slamin slam-in slam in smashin smash-in crashin crash-in bangin bang-in'.split(), traits=[.98,.94,.72,.08,.28,.16,.18], curve=[.06,-.12,.18,1.24]),
    'slam_out':  dict(words='slamout slam-out slam out smashout smash-out crashout crash-out exit hardout hard-out'.split(), traits=[.92,.88,.70,.04,.18,.12,.05], curve=[.12,.02,.28,1.12]),
    'mid_deep':  dict(words='middeep mid-deep mid deep medium deep mediumdeep balanced depth deepish controlled'.split(), traits=[.46,.30,.62,.04,.08,.00,.04], curve=[.44,.02,.64,.98]),
    'fast_slow': dict(words='fastslow fast-slow fast slow quickslow quick-slow speedramp speed ramp'.split(), traits=[.62,.34,.44,.05,.10,.02,.08], curve=[.20,-.02,.78,.96]),
    'slow_fast': dict(words='slowfast slow-fast slow fast rampup ramp-up build accelerate acceleration'.split(), traits=[.58,.30,.42,.04,.10,.02,.10], curve=[.72,.02,.36,1.06]),
}

simple_phrases = [
    ('fast', 'fast'), ('slow', 'slow'), ('smooth', 'smooth'), ('normal', 'robot'), ('basic', 'robot'),
    ('default', 'robot'), ('linear', 'robot'), ('hard', 'snap'), ('sharp', 'snap'), ('soft', 'float'),
    ('pop', 'bounce'), ('bounce', 'bounce'), ('bouncy', 'bounce'), ('heavy', 'cinematic'), ('light', 'float'),
    ('easy', 'smooth'), ('clean', 'luxury'), ('nice', 'smooth'), ('quick', 'fast'), ('snappy', 'snap'),
    ('cinematic', 'cinematic'), ('dramatic', 'cinematic'), ('jitter', 'jitter'), ('glitch', 'jitter'),
    ('shake', 'jitter'), ('scary', 'scary'), ('sad', 'sad'), ('happy', 'bounce'), ('fun', 'bounce'),
    ('float', 'float'), ('dreamy', 'float'), ('luxury', 'luxury'), ('premium', 'luxury'), ('overshoot', 'overshoot'),
    ('settle', 'settle'), ('ease', 'smooth'), ('ease in', 'slow'), ('ease out', 'fast'), ('ease in out', 'smooth'),
    ('product card pop in', 'bounce'), ('text reveal', 'smooth'), ('logo hit', 'snap'), ('camera zoom', 'cinematic'),
    ('beat drop', 'snap'), ('transition', 'smooth'), ('subtitle pop', 'fast'), ('title drift', 'cinematic'),
    ('zoom in', 'zoom_in'), ('zoom out', 'zoom_out'), ('zoom-in', 'zoom_in'), ('zoom-out', 'zoom_out'),
    ('push in', 'zoom_in'), ('pull out', 'zoom_out'), ('slam in', 'slam_in'), ('slam out', 'slam_out'),
    ('slam-in', 'slam_in'), ('slam-out', 'slam_out'), ('smash in', 'slam_in'), ('smash out', 'slam_out'),
    ('mid deep', 'mid_deep'), ('mid-deep', 'mid_deep'), ('medium deep', 'mid_deep'), ('deep', 'mid_deep'),
    ('fast slow', 'fast_slow'), ('fast-slow', 'fast_slow'), ('slow fast', 'slow_fast'), ('slow-fast', 'slow_fast'),
    ('speed ramp', 'fast_slow'), ('ramp up', 'slow_fast'), ('quick slow', 'fast_slow'),
    ('hard zoom in', 'zoom_in'), ('soft zoom out', 'zoom_out'), ('heavy slam in', 'slam_in'), ('clean slam out', 'slam_out'),
]

modifiers = {
    'very': .18, 'super': .22, 'extreme': .30, 'tiny': -.18, 'subtle': -.22,
    'slight': -.16, 'more': .14, 'less': -.14, 'fast': .16, 'slow': -.16,
    'smooth': -.10, 'hard': .14, 'soft': -.14, 'little': -.10, 'big': .18,
}
connectors = ['with','but','and','then','like','for','as','that feels','motion is','make it','make','needs','should be','kind of']
objects = ['camera move','text reveal','logo hit','transition','zoom','zoom in','zoom out','slam in','slam out','beat cut','title card','graph','animation','keyframe move','product card','subtitle','caption','shake','intro','outro','button','clip','edit','velocity','speed ramp','phone edit','pack preview','main title','lower third','social edit','timeline move','motion card','story cut','zoom burst','slow reveal','hard punch','gentle settle']

samples=[]

def clamp(v,a,b): return max(a,min(b,v))
def jitter_curve(base):
    curve=[]
    for j,v in enumerate(base):
        amp=.05 if j in (0,2) else .12
        curve.append(round(v + random.uniform(-amp, amp),3))
    curve[0]=clamp(curve[0],.02,.96); curve[2]=clamp(curve[2],.02,.98)
    curve[1]=clamp(curve[1],-1.4,1.4); curve[3]=clamp(curve[3],-.4,2.35)
    return curve

def add_sample(prompt,fam,intensity=1.0,noise=.035):
    spec=families[fam]
    traits=[round(clamp(v*intensity + random.uniform(-noise,noise),0,1.35),3) for v in spec['traits']]
    samples.append({'prompt':prompt,'family':fam,'traits':traits,'curve':jitter_curve(spec['curve'])})

# Simple real-world prompts get lots of coverage.
for phrase,fam in simple_phrases:
    for _ in range(120):
        variants=[phrase, f'make it {phrase}', f'{phrase} graph', f'{phrase} animation', f'{phrase} easing', f'{phrase} curve', f'{phrase} keyframes']
        add_sample(random.choice(variants), fam, random.uniform(.82,1.18), .025)

for fam, spec in families.items():
    words=spec['words']
    for _ in range(980):
        chosen=random.sample(words, random.randint(1,min(5,len(words))))
        phrase=[]
        if random.random()<.62: phrase.append(random.choice(list(modifiers)))
        phrase += chosen
        if random.random()<.75: phrase += [random.choice(connectors), random.choice(objects)]
        if random.random()<.42:
            other=random.choice([k for k in families if k!=fam])
            phrase += ['with', random.choice(families[other]['words'])]
        intensity=1.0 + sum(modifiers.get(token,0) for token in phrase)
        add_sample(' '.join(phrase), fam, clamp(intensity,.50,1.42))

keys=list(families)
for _ in range(12800):
    a,b=random.sample(keys,2)
    wa=random.uniform(.30,.78); wb=1-wa
    prompt=f"{random.choice(families[a]['words'])} {random.choice(connectors)} {random.choice(families[b]['words'])} {random.choice(objects)}"
    traits=[round(clamp(families[a]['traits'][j]*wa+families[b]['traits'][j]*wb+random.uniform(-.025,.025),0,1.35),3) for j in range(7)]
    curve=[round(families[a]['curve'][j]*wa+families[b]['curve'][j]*wb+random.uniform(-(.04 if j in (0,2) else .09),(.04 if j in (0,2) else .09)),3) for j in range(4)]
    curve[0]=clamp(curve[0],.02,.96); curve[2]=clamp(curve[2],.02,.98); curve[1]=clamp(curve[1],-1.4,1.4); curve[3]=clamp(curve[3],-.4,2.35)
    samples.append({'prompt':prompt,'family':a+'+'+b,'traits':traits,'curve':curve})

vocab=sorted({tok for s in samples for tok in s['prompt'].replace('-',' ').split() if tok not in connectors})
features=vocab + ['bias','len','intensity','has_percent','has_negative','has_and','has_but','short_prompt']

def vec(prompt):
    toks=prompt.replace('-',' ').split()
    counts={t:toks.count(t) for t in vocab}
    out=[counts.get(t,0) for t in vocab]
    out += [1, min(len(toks)/10,2), sum(1 for t in toks if t in modifiers)/3, 1 if '%' in prompt else 0, 1 if any(t in toks for t in ['no','less','without']) else 0, 1 if 'and' in toks else 0, 1 if 'but' in toks else 0, 1 if len(toks)<=2 else 0]
    return out
X=[vec(s['prompt']) for s in samples]
Y=[s['curve'] for s in samples]
n=len(features); m=4
W=[[0.0]*m for _ in range(n)]
lr=.0014; lam=.00035
for epoch in range(220):
    order=list(range(len(X)))
    random.shuffle(order)
    for idx in order:
        x,y=X[idx],Y[idx]
        pred=[sum(x[i]*W[i][j] for i in range(n)) for j in range(m)]
        for i,xi in enumerate(x):
            if not xi: continue
            for j in range(m):
                W[i][j] -= lr*((pred[j]-y[j])*xi + lam*W[i][j])
weights={features[i]:[round(v,6) for v in W[i]] for i in range(n) if any(abs(v)>1e-5 for v in W[i])}
metadata={'version':'2.0.1-alpha','sampleCount':len(samples),'featureCount':len(weights),'outputs':['h1.x','h1.y','h2.x','h2.y'],'families':list(families),'simplePhraseCount':len(simple_phrases)}

# Clean previous generated shards.
for path in (root/'training').glob('shard-*.json'): path.unlink()
for path in (root/'weights').glob('weights-*.js'): path.unlink()
(root/'training.zip').unlink(missing_ok=True)
(root/'training'/'synthetic-corpus.json').write_text(json.dumps(samples,separators=(',',':')))
(root/'training'/'training-summary.json').write_text(json.dumps(metadata,indent=2))
shard_size=10
shards=[]
for idx in range((len(samples)+shard_size-1)//shard_size):
    name=f'shard-{idx+1:04d}.json'
    shards.append(name)
    (root/'training'/name).write_text(json.dumps(samples[idx*shard_size:(idx+1)*shard_size],separators=(',',':')))
by_letter={}
for k,v in weights.items():
    letter=(k[0] if k and k[0].isalnum() else '_').lower()
    by_letter.setdefault(letter,{})[k]=v
for letter,obj in by_letter.items():
    (root/'weights'/f'weights-{letter}.js').write_text('JX_CURVE_AI_WEIGHT_SHARDS.push('+json.dumps(obj,separators=(',',':'))+');\n')
(root/'weights'/'weights-manifest.js').write_text('var JX_CURVE_AI_WEIGHT_SHARDS = [];\nvar JX_CURVE_AI_MODEL_META = '+json.dumps(metadata,separators=(',',':'))+';\n')
(root/'training'/'manifest.json').write_text(json.dumps({'shards':shards,**metadata},indent=2))
with zipfile.ZipFile(root/'training.zip', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(train.iterdir()):
        if path.is_file():
            archive.write(path, arcname=path.name)
print(json.dumps(metadata,indent=2))
