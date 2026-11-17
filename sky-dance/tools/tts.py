"""Speak script.json line by line with Kokoro; write audio/vo.wav and audio/timeline.json.
Usage: python tts.py <model.onnx> <voices.bin> [voice] [speed]"""
import json, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
model, voices = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "af_heart"
speed = float(sys.argv[4]) if len(sys.argv) > 4 else 0.88
k = Kokoro(model, voices)
script = json.load(open("script.json"))
GAP_LINE, GAP_SCENE, LEAD, TAIL = 0.9, 3.0, 1.5, 3.0
out, t, sr, timeline = [], 0.0, 24000, []
def silence(s): return np.zeros(int(s * sr), dtype=np.float32)
out.append(silence(LEAD)); t = LEAD
for sc in script:
    scene = {"scene": sc["scene"], "start": round(t - (LEAD if not timeline else GAP_SCENE / 2), 3), "lines": []}
    for i, line in enumerate(sc["lines"]):
        a, sr = k.create(line, voice=voice, speed=speed, lang="en-us")
        d = len(a) / sr
        scene["lines"].append({"text": line, "start": round(t, 3), "end": round(t + d, 3)})
        out.append(a.astype(np.float32)); t += d
        g = GAP_LINE if i < len(sc["lines"]) - 1 else GAP_SCENE
        out.append(silence(g)); t += g
    timeline.append(scene)
out.append(silence(TAIL)); t += TAIL
for i, s in enumerate(timeline):
    s["end"] = timeline[i + 1]["start"] if i + 1 < len(timeline) else round(t, 3)
timeline[0]["start"] = 0.0
sf.write("audio/vo.wav", np.concatenate(out), sr)
json.dump({"duration": round(t, 3), "scenes": timeline}, open("audio/timeline.json", "w"), indent=1)
print("duration", round(t, 2))
