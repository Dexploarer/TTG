import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  loadSoundtrackManifest,
  resolvePlaylist,
  toAbsoluteTrackUrl,
  type SoundtrackManifest,
} from "@/lib/audio/soundtrack";

const AUDIO_SETTINGS_STORAGE_KEY = "ltcg.audio.settings.v1";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  musicMuted: boolean;
  sfxMuted: boolean;
}

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.65,
  sfxVolume: 0.8,
  musicMuted: false,
  sfxMuted: false,
};

function loadStoredSettings(): AudioSettings {
  if (typeof window === "undefined") return DEFAULT_AUDIO_SETTINGS;
  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AUDIO_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      musicVolume: clamp01(parsed.musicVolume ?? DEFAULT_AUDIO_SETTINGS.musicVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_AUDIO_SETTINGS.sfxVolume),
      musicMuted: Boolean(parsed.musicMuted),
      sfxMuted: Boolean(parsed.sfxMuted),
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

interface AudioContextValue {
  loading: boolean;
  ready: boolean;
  contextKey: string;
  currentTrack: string | null;
  autoplayBlocked: boolean;
  settings: AudioSettings;
  setContextKey: (contextKey: string) => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicMuted: (muted: boolean) => void;
  setSfxMuted: (muted: boolean) => void;
  toggleMusicMuted: () => void;
  toggleSfxMuted: () => void;
  playSfx: (sfxId: string) => void;
  soundtrack: SoundtrackManifest | null;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(() => loadStoredSettings());
  const [contextKey, setContextKey] = useState("landing");
  const [soundtrack, setSoundtrack] = useState<SoundtrackManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxPoolRef = useRef<HTMLAudioElement[]>([]);
  const settingsRef = useRef<AudioSettings>(settings);
  const soundtrackRef = useRef<SoundtrackManifest | null>(soundtrack);
  const currentQueueRef = useRef<string[]>([]);
  const trackIndexRef = useRef(0);
  const shuffleModeRef = useRef(false);
  const unlockedRef = useRef(false);

  settingsRef.current = settings;
  soundtrackRef.current = soundtrack;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    musicAudioRef.current = audio;

    const pool: HTMLAudioElement[] = [];
    for (let i = 0; i < 8; i += 1) {
      const sfx = new Audio();
      sfx.preload = "auto";
      sfx.crossOrigin = "anonymous";
      pool.push(sfx);
    }
    sfxPoolRef.current = pool;

    return () => {
      audio.pause();
      audio.src = "";
      musicAudioRef.current = null;
      for (const sfx of sfxPoolRef.current) {
        sfx.pause();
        sfx.src = "";
      }
      sfxPoolRef.current = [];
    };
  }, []);

  const safePlay = useCallback(async (audio: HTMLAudioElement) => {
    try {
      await audio.play();
      setAutoplayBlocked(false);
    } catch {
      setAutoplayBlocked(true);
    }
  }, []);

  const playTrackAtIndex = useCallback(
    (index: number) => {
      const audio = musicAudioRef.current;
      const queue = currentQueueRef.current;
      if (!audio || queue.length === 0 || index < 0 || index >= queue.length) return;

      const next = queue[index]!;
      trackIndexRef.current = index;
      setCurrentTrack(next);

      const nextUrl = toAbsoluteTrackUrl(next);
      if (audio.src !== nextUrl) {
        audio.src = nextUrl;
        audio.load();
      }
      audio.currentTime = 0;

      const currentSettings = settingsRef.current;
      audio.volume = currentSettings.musicMuted ? 0 : clamp01(currentSettings.musicVolume);
      if (currentSettings.musicMuted || currentSettings.musicVolume <= 0) {
        audio.pause();
        return;
      }
      if (unlockedRef.current) {
        void safePlay(audio);
      }
    },
    [safePlay],
  );

  const advanceTrack = useCallback(() => {
    const queue = currentQueueRef.current;
    if (queue.length === 0) return;

    let nextIndex = trackIndexRef.current + 1;
    if (nextIndex >= queue.length) {
      if (shuffleModeRef.current) {
        currentQueueRef.current = shuffle([...queue]);
      }
      nextIndex = 0;
    }

    playTrackAtIndex(nextIndex);
  }, [playTrackAtIndex]);

  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    const onEnded = () => advanceTrack();
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [advanceTrack]);

  useEffect(() => {
    const unlock = () => {
      unlockedRef.current = true;
      const current = musicAudioRef.current;
      if (!current) return;
      const currentSettings = settingsRef.current;
      if (!current.src) return;
      if (currentSettings.musicMuted || currentSettings.musicVolume <= 0) return;
      void safePlay(current);
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [safePlay]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const manifest = await loadSoundtrackManifest("/soundtrack.in");
        if (!cancelled) setSoundtrack(manifest);
      } catch {
        if (!cancelled) {
          setSoundtrack({
            playlists: { default: [] },
            sfx: {},
            source: "/soundtrack.in",
            loadedAt: Date.now(),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;

    audio.volume = settings.musicMuted ? 0 : clamp01(settings.musicVolume);
    if (settings.musicMuted || settings.musicVolume <= 0) {
      if (!audio.paused) audio.pause();
      return;
    }

    if (audio.src && audio.paused && unlockedRef.current) {
      void safePlay(audio);
    }
  }, [settings.musicMuted, settings.musicVolume, safePlay]);

  useEffect(() => {
    if (!soundtrack) return;

    const resolved = resolvePlaylist(soundtrack, contextKey);
    shuffleModeRef.current = resolved.shuffle;

    const queue = resolved.shuffle ? shuffle([...resolved.tracks]) : [...resolved.tracks];
    currentQueueRef.current = queue;

    if (queue.length === 0) {
      const audio = musicAudioRef.current;
      if (audio) audio.pause();
      setCurrentTrack(null);
      return;
    }

    playTrackAtIndex(0);
  }, [soundtrack, contextKey, playTrackAtIndex]);

  useEffect(() => {
    window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const playSfx = useCallback((sfxId: string) => {
    const manifest = soundtrackRef.current;
    const src = manifest?.sfx[sfxId.toLowerCase()];
    if (!src) return;

    const currentSettings = settingsRef.current;
    if (currentSettings.sfxMuted || currentSettings.sfxVolume <= 0) return;

    const pool = sfxPoolRef.current;
    if (pool.length === 0) return;

    const slot = pool.find((audio) => audio.paused || audio.ended) ?? pool[0];
    if (!slot) return;

    slot.pause();
    slot.currentTime = 0;
    slot.src = toAbsoluteTrackUrl(src);
    slot.volume = clamp01(currentSettings.sfxVolume);
    void slot.play().catch(() => {});
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      loading,
      ready: Boolean(soundtrack),
      contextKey,
      currentTrack,
      autoplayBlocked,
      settings,
      setContextKey,
      setMusicVolume: (volume: number) =>
        setSettings((prev) => ({ ...prev, musicVolume: clamp01(volume) })),
      setSfxVolume: (volume: number) =>
        setSettings((prev) => ({ ...prev, sfxVolume: clamp01(volume) })),
      setMusicMuted: (muted: boolean) =>
        setSettings((prev) => ({ ...prev, musicMuted: muted })),
      setSfxMuted: (muted: boolean) =>
        setSettings((prev) => ({ ...prev, sfxMuted: muted })),
      toggleMusicMuted: () =>
        setSettings((prev) => ({ ...prev, musicMuted: !prev.musicMuted })),
      toggleSfxMuted: () =>
        setSettings((prev) => ({ ...prev, sfxMuted: !prev.sfxMuted })),
      playSfx,
      soundtrack,
    }),
    [loading, soundtrack, contextKey, currentTrack, autoplayBlocked, settings, playSfx],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextValue {
  const value = useContext(AudioContext);
  if (!value) {
    throw new Error("useAudio must be used within AudioProvider");
  }
  return value;
}

function formatTrackLabel(track: string | null): string {
  if (!track) return "No track";
  const parts = track.split("/");
  return parts[parts.length - 1] || track;
}

export function AudioControlsDock() {
  const {
    settings,
    setMusicVolume,
    setSfxVolume,
    toggleMusicMuted,
    toggleSfxMuted,
    autoplayBlocked,
    currentTrack,
    contextKey,
    loading,
  } = useAudio();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-3 right-3 z-[60]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="paper-panel px-3 py-1.5 text-xs font-black uppercase tracking-wider hover:-translate-y-0.5 transition-transform"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Audio
      </button>

      {open && (
        <div className="paper-panel mt-2 w-72 p-3 bg-[#fdfdfb]/95 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-[10px] uppercase tracking-wider text-[#121212]/60"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {loading ? "Loading soundtrack..." : `Context: ${contextKey}`}
            </p>
            <p
              className="text-[10px] text-[#121212]/50 truncate max-w-[130px] text-right"
              style={{ fontFamily: "Special Elite, cursive" }}
              title={currentTrack ?? "No track"}
            >
              {formatTrackLabel(currentTrack)}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[11px] font-bold uppercase"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Music
                </span>
                <button
                  type="button"
                  onClick={toggleMusicMuted}
                  className="text-[10px] underline uppercase"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {settings.musicMuted ? "Unmute" : "Mute"}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(settings.musicVolume * 100)}
                onChange={(event) => setMusicVolume(Number(event.target.value) / 100)}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[11px] font-bold uppercase"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  SFX
                </span>
                <button
                  type="button"
                  onClick={toggleSfxMuted}
                  className="text-[10px] underline uppercase"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {settings.sfxMuted ? "Unmute" : "Mute"}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(settings.sfxVolume * 100)}
                onChange={(event) => setSfxVolume(Number(event.target.value) / 100)}
                className="w-full"
              />
            </div>
          </div>

          {autoplayBlocked && (
            <p
              className="text-[10px] text-[#b45309] mt-2"
              style={{ fontFamily: "Special Elite, cursive" }}
            >
              Browser blocked autoplay. Click anywhere once to enable music.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AudioContextGate({ context }: { context: string }) {
  const { setContextKey } = useAudio();

  useEffect(() => {
    setContextKey(context);
  }, [context, setContextKey]);

  return null;
}
