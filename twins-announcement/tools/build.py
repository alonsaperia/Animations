"""Voices (Kokoro, pitched up to kid range), timeline, music and SFX.
Usage: python tools/build.py <kokoro.onnx> <voices.bin>
Writes audio/lines/*.wav, audio/timeline.json, audio/mix_en.wav, audio/mix_he.wav"""
import json, sys, subprocess, numpy as np, soundfile as sf
SR = 44100
KIDS = {  # kokoro voice, speed, pitch factor (formants shifted with the pitch -> child-like)
    "ella":  ("af_bella", 1.0, 1.3),
    "eitan": ("af_sky", 1.05, 1.5),
    "nili":  ("af_heart", 0.92, 1.48),
}
LINES = [("L1", ["ella"]), ("L2", ["ella"]), ("L3", ["nili"]), ("L4", ["eitan"]), ("L5", ["ella", "eitan", "nili"]), ("L6", ["ella", "eitan", "nili"])]
text = json.load(open("text.json"))["en"]

def kid_line(lid, who):
    from kokoro_onnx import Kokoro
    global K
    if "K" not in globals(): K = Kokoro(sys.argv[1], sys.argv[2])
    v, sp, pf = KIDS[who]
    a, sr = K.create(text[lid], voice=v, speed=sp, lang="en-us")
    raw = f"audio/lines/{lid}_{who}_raw.wav"; out = f"audio/lines/{lid}_{who}.wav"
    sf.write(raw, a, sr)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"rubberband=pitch={pf}:formant=shifted,aresample={SR}", "-ac", "1", out], check=True)
    y, _ = sf.read(out); 
    nz = np.where(np.abs(y) > 0.01)[0]; y = y[max(0, nz[0] - 400): nz[-1] + 2000]   # trim silence
    return y.astype(np.float32)

voice = {}
for lid, whos in LINES:
    parts = [kid_line(lid, w) for w in whos]
    n = max(len(p) + int(.05 * SR) * i for i, p in enumerate(parts))
    mix = np.zeros(n, np.float32)
    for i, p in enumerate(parts): o = int(.05 * SR) * i; mix[o:o + len(p)] += p / len(parts) ** .5
    voice[lid] = mix / max(1e-6, np.abs(mix).max()) * .9
    sf.write(f"audio/lines/{lid}.wav", voice[lid], SR)
D = {k: len(v) / SR for k, v in voice.items()}

# ---------------- timeline ----------------
t = 0.0; shots = {}; lines = {}; ev = {}
def shot(name, dur): 
    global t; shots[name] = [round(t, 3), round(t + dur, 3)]; t += dur
def line(lid, at, who): lines[lid] = {"start": round(at, 3), "end": round(at + D[lid], 3), "who": who}
s = t; line("L1", s + 1.4, "ella"); shot("A1", 1.4 + D["L1"] + .6)
s = t; ev["drawer"] = s + .5; ev["card"] = s + 1.4; ev["turn"] = s + 2.0; line("L2", s + 2.6, "ella"); shot("A2", 2.6 + D["L2"] + .5)
s = t; ev["ringA"] = s + .3; shot("A3", 1.5)
s = t; line("L3", s + .9, "nili"); ev["ringB"] = s + .9; shot("A4", .9 + D["L3"] + .6)
s = t; line("L4", s + .4, "eitan"); ev["rawr"] = s + .4 + D["L4"] + .05; shot("A5", .4 + D["L4"] + 1.1)
s = t; shot("A6", 1.4)
s = t; ev["pass"] = s + 2.4; ev["kick"] = s + 4.7; shot("B", 5.4)
s = t; ev["tada"] = s; line("L5", s + .5, "all"); shot("C", .5 + D["L5"] + 3.0)
s = t; line("L6", s + 1.0, "all"); ev["love"] = s + 1.0 + D["L6"] + .4; shot("D", 1.0 + D["L6"] + 4.2)
DUR = round(t, 3)
json.dump({"duration": DUR, "shots": shots, "lines": lines, "events": {k: round(v, 3) for k, v in ev.items()}}, open("audio/timeline.json", "w"), indent=1)
print("duration", DUR, {k: round(v, 2) for k, v in D.items()})

# ---------------- music + sfx ----------------
N = int(DUR * SR) + SR
def env(n, a=.004, d=1.2):
    x = np.arange(n) / SR; return np.minimum(1, x / a) * np.exp(-x / d)
def bell(f, dur=1.4, amp=.3):
    n = int(dur * SR); x = np.arange(n) / SR
    s = np.sin(2*np.pi*f*x) + .35*np.sin(2*np.pi*2*f*x)*np.exp(-x*3) + .12*np.sin(2*np.pi*3.01*f*x)*np.exp(-x*5)
    return (s * env(n, .003, dur / 3) * amp).astype(np.float32)
def pluck(f, dur=.5, amp=.25):
    n = int(dur * SR); x = np.arange(n) / SR
    return ((np.sin(2*np.pi*f*x) + .3*np.sin(2*np.pi*2*f*x)) * env(n, .005, .18) * amp).astype(np.float32)
def put(buf, sig, at):
    i = int(at * SR); j = min(len(buf), i + len(sig)); 
    if i < len(buf) and j > i: buf[i:j] += sig[:j - i]
def midi(m): return 440 * 2 ** ((m - 69) / 12)
music = np.zeros(N, np.float32)
bpm = 112; beat = 60 / bpm
prog = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]   # C Am F G
motif = [0, 1, 2, 1, 2, 0, 1, 2]                                    # chord-tone pattern, eighth notes
rng = np.random.default_rng(4)
calm_end = shots["A6"][1]
bar = 0; tt = 0.0
while tt < DUR + 1:
    ch = prog[bar % 4]; calm = tt < calm_end
    for k, idx in enumerate(motif):
        at = tt + k * beat / 2
        if calm and k % 2: continue
        up = 12 if (not calm and k in (2, 5)) else 0
        put(music, bell(midi(ch[idx] + 12 + up), 1.2, .16 if calm else .2), at)
    put(music, pluck(midi(ch[0] - 12), .6, .22 if calm else .3), tt)
    put(music, pluck(midi(ch[0] - 12), .6, .15 if calm else .25), tt + 2 * beat)
    if not calm:
        put(music, pluck(midi(ch[1] - 12), .4, .12), tt + beat); put(music, pluck(midi(ch[2] - 12), .4, .12), tt + 3 * beat)
    tt += 4 * beat; bar += 1
sfx = np.zeros(N, np.float32)
def noise(dur, amp, lp=.0):
    n = int(dur * SR); s = rng.standard_normal(n).astype(np.float32)
    if lp: 
        out = np.zeros(n, np.float32); y = 0.
        for i in range(n): y += lp * (s[i] - y); out[i] = y
        s = out / max(1e-6, np.abs(out).max())
    return s * amp
# tiptoe plinks in A1
a0, a1 = shots["A1"]
for k in range(int((a1 - a0 - .5) / .42)): put(sfx, bell(midi(84 + (k % 2) * 3), .25, .06), a0 + .2 + k * .42)
# drawer slide
d = noise(.6, .25, .08) * np.hanning(int(.6 * SR)).astype(np.float32); put(sfx, d, ev["drawer"])
put(sfx, noise(.35, .12, .3) * np.hanning(int(.35 * SR)).astype(np.float32), ev["card"])   # paper
for at, m in [(ev["ringA"], 88), (ev["ringB"], 91), (shots["A6"][0] + .2, 88), (shots["A6"][0] + .35, 91)]:
    put(sfx, bell(midi(m), 1.0, .12), at); put(sfx, bell(midi(m + 7), .8, .07), at + .07)
# kick thump + whoosh
n = int(.35 * SR); x = np.arange(n) / SR; f = 110 * np.exp(-x * 9) + 40
put(sfx, (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 12) * .6).astype(np.float32), ev["kick"])
w = noise(.7, .35, .15) * np.sin(np.linspace(0, np.pi, int(.7 * SR))).astype(np.float32) ** 2; put(sfx, w, ev["kick"] + .05)
# pass tap
put(sfx, (np.sin(2*np.pi*90*np.arange(int(.15*SR))/SR)*np.exp(-np.arange(int(.15*SR))/SR*25)*.35).astype(np.float32), ev["pass"])
# ta-da: pop + chord
put(sfx, noise(.12, .4) * np.exp(-np.arange(int(.12 * SR)) / SR * 40).astype(np.float32), ev["tada"])
for i, m in enumerate([72, 76, 79, 84]): put(sfx, bell(midi(m), 2.2, .14), ev["tada"] + i * .06)
for i, m in enumerate([67, 72, 76, 79]): put(sfx, bell(midi(m), 2.5, .1), ev["love"] + i * .09)
# rawr is voiced by nobody: a playful low "boing"
n = int(.4 * SR); x = np.arange(n) / SR
put(sfx, (np.sin(2 * np.pi * np.cumsum(180 + 120 * np.sin(x * 30)) / SR) * env(n, .01, .15) * .18).astype(np.float32), ev["rawr"])

def master(with_voice):
    v = np.zeros(N, np.float32)
    if with_voice:
        for lid, L in lines.items(): put(v, voice[lid], L["start"])
    # duck music under voice
    duck = np.ones(N, np.float32)
    if with_voice:
        for L in lines.values():
            i, j = int((L["start"] - .15) * SR), int((L["end"] + .2) * SR); duck[i:j] = .45
        k = int(.12 * SR); duck = np.convolve(duck, np.ones(k) / k, mode="same").astype(np.float32)
    m = music * .55 * duck + sfx * .8 + v * 1.0
    fade = np.ones(N, np.float32); fl = int(1.2 * SR); e = int(DUR * SR)
    fade[e - fl:e] = np.linspace(1, 0, fl); fade[e:] = 0
    m = m * fade; m = m[:int(DUR * SR)]
    return (m / np.abs(m).max() * .9).astype(np.float32)
sf.write("audio/mix_en.wav", master(True), SR)
sf.write("audio/mix_he.wav", master(False), SR)
print("mixed")
