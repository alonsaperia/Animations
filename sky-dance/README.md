# How the Sky Works — kids' 3D explainer (~2:16, 1920×1080, 30 fps)

Day & night, hours, months (Moon phases), weeks, years & seasons, solar eclipse. Built with three.js, rendered frame-by-frame in headless Chromium, voiced with the free Kokoro TTS (`af_heart`).

## Files
- `script.json` — narration, one list of lines per chapter.
- `tools/tts.py` — speaks the script with Kokoro, writes `audio/vo.wav` and `audio/timeline.json` (every line's start/end; the whole edit is timed from this).
- `src/main.js` — scenes, models, overlay; `window.renderAt(t)` draws any moment.
- `render.mjs` — `node render.mjs stills 3,20,95 stills` or `WORKERS=4 node render.mjs video renders/silent.mp4 30`.
- `sources.md` — facts and simplifications.

## Rebuild
```bash
npm install
# voice (needs kokoro-onnx + model files from github.com/thewh1teagle/kokoro-onnx releases)
python tools/tts.py kokoro-v1.0.int8.onnx voices-v1.0.bin af_heart 0.88
WORKERS=4 node render.mjs video renders/silent.mp4 30
ffmpeg -i renders/silent.mp4 -i audio/vo.wav -map 0:v -map 1:a -c:v copy -af "apad,loudnorm=I=-16:TP=-1.5" -c:a aac -b:a 192k -shortest -movflags +faststart renders/how-the-sky-works.mp4
```
Your own recording: replace `audio/vo.wav` and update the line times in `audio/timeline.json`.

Preview: `python3 -m http.server 8000`, open `index.html` and click to play, or `index.html?t=95` for one frame.
