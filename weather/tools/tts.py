"""Narrator (Kokoro af_heart) + kid lines (pitched Kokoro voices). Writes audio/vo.wav, audio/timeline.json.
Usage: python tools/tts.py <kokoro.onnx> <voices.bin>"""
import json, sys, subprocess, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
SR = 24000
k = Kokoro(sys.argv[1], sys.argv[2])
KIDS = {"ella": ("af_bella", 1.0, 1.3), "eitan": ("af_sky", 1.05, 1.5), "nili": ("af_heart", .92, 1.48)}
def narr(text): a, _ = k.create(text, voice="af_heart", speed=.88, lang="en-us"); return a.astype(np.float32)
def kid(text, who):
    v, sp, pf = KIDS[who]; a, _ = k.create(text, voice=v, speed=sp, lang="en-us")
    sf.write("audio/lines/_raw.wav", a, SR)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "audio/lines/_raw.wav", "-af", f"rubberband=pitch={pf}:formant=shifted", "audio/lines/_kid.wav"], check=True)
    y, _ = sf.read("audio/lines/_kid.wav"); nz = np.where(np.abs(y) > .01)[0]; return y[max(0, nz[0] - 200): nz[-1] + 1500].astype(np.float32)
def speak(line):
    if isinstance(line, str): return narr(line), "narrator", line
    who, text = line["who"], line["text"]
    if who == "all":
        parts = [kid(text, w) for w in KIDS]; n = max(len(p) + 1200 * i for i, p in enumerate(parts)); m = np.zeros(n, np.float32)
        for i, p in enumerate(parts): m[1200 * i:1200 * i + len(p)] += p / 1.7
        return m, who, text
    return kid(text, who), who, text
GAP_LINE, GAP_SCENE, LEAD, TAIL = .8, 2.4, 1.2, 3.0
out, t, timeline = [np.zeros(int(LEAD * SR), np.float32)], LEAD, []
for sc in json.load(open("script.json")):
    scene = {"scene": sc["scene"], "start": round(0 if not timeline else t - GAP_SCENE / 2, 3), "lines": []}
    for i, line in enumerate(sc["lines"]):
        a, who, text = speak(line); a = a / max(1e-6, np.abs(a).max()) * .9; d = len(a) / SR
        scene["lines"].append({"text": text, "who": who, "start": round(t, 3), "end": round(t + d, 3)})
        out.append(a); t += d
        g = GAP_LINE if i < len(sc["lines"]) - 1 else GAP_SCENE
        if isinstance(line, dict) and i < len(sc["lines"]) - 1: g = .45
        out.append(np.zeros(int(g * SR), np.float32)); t += g
    timeline.append(scene)
out.append(np.zeros(int(TAIL * SR), np.float32)); t += TAIL
for i, s in enumerate(timeline): s["end"] = timeline[i + 1]["start"] if i + 1 < len(timeline) else round(t, 3)
sf.write("audio/vo.wav", np.concatenate(out), SR)
json.dump({"duration": round(t, 3), "scenes": timeline}, open("audio/timeline.json", "w"), indent=1)
print("duration", round(t, 1)); [print(s["scene"], s["start"], s["end"]) for s in timeline]
