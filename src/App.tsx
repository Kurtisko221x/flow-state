import { useEffect, useRef, useState } from "react";
import { FlowAudio, type Mode } from "./audio";
import { celebrate } from "./confetti";

interface Done {
  task: string;
  minutes: number;
  at: number;
}

const audio = new FlowAudio();
const today = () => new Date().toDateString();

function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — fine, state just won't persist */
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
const MODES: { id: Mode; label: string }[] = [
  { id: "lofi", label: "☕ lo-fi" },
  { id: "synthwave", label: "🌆 synthwave" },
  { id: "rain", label: "🌧 rain" },
];

export function App() {
  const [now, setNow] = useState(new Date());
  const [task, setTask] = useState<string>(() => load("flow:task", ""));
  const [startedAt, setStartedAt] = useState<number>(() => load("flow:startedAt", 0));
  const [draft, setDraft] = useState("");
  const [done, setDone] = useState<Done[]>(() => {
    const saved = load<{ day: string; items: Done[] }>("flow:done", { day: "", items: [] });
    return saved.day === today() ? saved.items : [];
  });
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<Mode>("lofi");
  const [volume, setVolume] = useState(0.6);
  const [flash, setFlash] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => save("flow:task", task), [task]);
  useEffect(() => save("flow:startedAt", startedAt), [startedAt]);
  useEffect(() => save("flow:done", { day: today(), items: done }), [done]);
  useEffect(() => audio.setVolume(volume), [volume]);

  useEffect(() => {
    document.title = task ? `● ${task} — flow` : "flow state";
  }, [task]);

  // Space toggles music, F toggles fullscreen (when not typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement === input.current) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "f") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  function togglePlay() {
    if (playing) audio.stop();
    else audio.play(mode);
    setPlaying(!playing);
  }

  function switchMode(m: Mode) {
    setMode(m);
    if (playing) audio.play(m);
  }

  function start(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setTask(draft.trim());
    setStartedAt(Date.now());
    setDraft("");
    input.current?.blur();
  }

  function complete() {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    setDone((d) => [{ task, minutes, at: Date.now() }, ...d]);
    setTask("");
    setStartedAt(0);
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
    if (canvas.current) celebrate(canvas.current);
  }

  const elapsed = startedAt ? Math.floor((now.getTime() - startedAt) / 1000) : 0;
  const totalMin = done.reduce((n, d) => n + d.minutes, 0);

  return (
    <div className={`relative min-h-dvh overflow-hidden text-white select-none ${flash ? "flash" : ""}`}>
      <div className="bg" />
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-50 w-full h-full" />

      <div className="relative z-10 min-h-dvh flex flex-col items-center justify-center px-4 py-16">
        <div className="text-white/50 tracking-[0.3em] uppercase text-xs mb-4">
          {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </div>

        <div className="clock font-extralight tabular-nums leading-none">
          {pad(now.getHours())}
          <span className="colon">:</span>
          {pad(now.getMinutes())}
          <span className="text-[0.22em] tracking-normal text-white/30 align-top ml-3">{pad(now.getSeconds())}</span>
        </div>

        <div className="mt-14 w-full max-w-2xl text-center min-h-32">
          {task ? (
            <div className="task-in">
              <div className="text-white/40 text-xs uppercase tracking-[0.3em] mb-3">
                in flow · {pad(Math.floor(elapsed / 3600))}:{pad(Math.floor(elapsed / 60) % 60)}:{pad(elapsed % 60)}
              </div>
              <div className="text-3xl sm:text-4xl font-light tracking-tight">{task}</div>
              <button
                onClick={complete}
                className="mt-8 px-7 py-3 rounded-full bg-white text-black font-medium hover:scale-105 active:scale-95 transition"
              >
                done ✓
              </button>
            </div>
          ) : (
            <form onSubmit={start}>
              <input
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="na čom práve robíš?"
                maxLength={120}
                autoFocus
                className="w-full bg-transparent text-center text-3xl sm:text-4xl font-light outline-none placeholder:text-white/25 border-b border-white/15 focus:border-white/50 pb-3 transition"
              />
              <div className="text-white/30 text-xs mt-3">enter to start · space = music · f = fullscreen</div>
            </form>
          )}
        </div>
      </div>

      {/* player */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center" aria-label={playing ? "pause" : "play"}>
          {playing ? "⏸" : "▶"}
        </button>
        <div className={`eq ${playing ? "on" : ""}`}>
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => switchMode(m.id)} className={`px-3 py-1.5 rounded-lg text-xs ${mode === m.id ? "bg-white/15" : "text-white/50 hover:text-white"}`}>
              {m.label}
            </button>
          ))}
        </div>
        <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-20 accent-white hidden sm:block" aria-label="volume" />
      </div>

      {/* today */}
      {done.length > 0 && (
        <div className="fixed top-5 right-5 z-20 text-right text-xs text-white/40 space-y-1 max-w-56">
          <div className="text-white/70">
            {done.length} done · {totalMin} min focused
          </div>
          {done.slice(0, 5).map((d) => (
            <div key={d.at} className="truncate line-through decoration-white/20">
              {d.task}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
