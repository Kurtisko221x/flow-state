<div align="center">

# 🌊 flow state

**No to-do lists. One huge clock, one task, generative lo-fi — and confetti when you ship.**

### [▶ Open the dashboard](https://kurtisko221x.github.io/flow-state/)

<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react"/>
<img src="https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
<img src="https://img.shields.io/badge/Web_Audio_API-ff6ec7?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Canvas-e100ff?style=for-the-badge&logo=html5&logoColor=white"/>

</div>

---

The app you leave open on your second monitor.

- 🕰️ **Typographically huge clock** with a breathing colon
- ✍️ **One input** — *"na čom práve robíš?"* — becomes your focus with a live flow timer
- ✅ **Done** → full-screen emoji confetti cannons 🎉 and a soft flash
- 🎧 **Generative music engine** — lo-fi (swung drums, Fmaj7–Em7–Dm7–Cmaj7, vinyl crackle), synthwave (driving octave bass + arps) and rain. Synthesized live with the Web Audio API: **zero audio files, nothing to license, never the same twice**
- 📊 today's finished tasks + focused minutes, persisted in `localStorage`
- ⌨️ `Space` play/pause · `F` fullscreen · `Enter` start task
- ♿ respects `prefers-reduced-motion`

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(enable it once in **Settings → Pages → Source: GitHub Actions**).

## The music engine (`src/audio.ts`)

A lookahead scheduler (25 ms tick, 120 ms horizon) places every note on the AudioContext clock, so timing
stays tight even when the tab is busy. Pads are detuned oscillator pairs through a warm low-pass; drums are
a pitch-swept sine kick and filtered noise for snare/hats; ambience is a looping noise buffer shaped into
crackle, rain or tape hiss.

## License

MIT
