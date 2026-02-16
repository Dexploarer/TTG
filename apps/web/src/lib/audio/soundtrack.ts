export interface SoundtrackManifest {
  playlists: Record<string, string[]>;
  sfx: Record<string, string>;
  source: string;
  loadedAt: number;
}

export interface ResolvedPlaylist {
  context: string;
  keysTried: string[];
  matchedKey: string | null;
  tracks: string[];
  shuffle: boolean;
}

const COMMENT_PREFIXES = ["#", ";", "//"];

function normalizeSectionName(value: string): string {
  return value.trim().toLowerCase();
}

function isComment(line: string): boolean {
  return COMMENT_PREFIXES.some((prefix) => line.startsWith(prefix));
}

function parseSectionHeader(line: string): string | null {
  if (!line.startsWith("[") || !line.endsWith("]")) return null;
  const section = line.slice(1, -1).trim();
  return section ? normalizeSectionName(section) : null;
}

function extractValue(line: string): string {
  const eqIndex = line.indexOf("=");
  if (eqIndex === -1) return line.trim();
  return line.slice(eqIndex + 1).trim();
}

function pushUnique(target: string[], value: string): void {
  if (!value || target.includes(value)) return;
  target.push(value);
}

export function parseSoundtrackIn(
  raw: string,
  source = "/soundtrack.in",
): SoundtrackManifest {
  const playlists: Record<string, string[]> = {};
  const sfx: Record<string, string> = {};

  let section = "default";
  playlists.default = [];

  const lines = raw.split(/\r?\n/);
  for (const originalLine of lines) {
    const line = originalLine.trim();
    if (!line || isComment(line)) continue;

    const maybeSection = parseSectionHeader(line);
    if (maybeSection) {
      section = maybeSection;
      if (section !== "sfx" && !playlists[section]) {
        playlists[section] = [];
      }
      continue;
    }

    if (section === "sfx" || section.startsWith("sfx:")) {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();
      if (!key || !value) continue;
      sfx[key] = value;
      continue;
    }

    const playlistKey = section || "default";
    if (!playlists[playlistKey]) playlists[playlistKey] = [];
    pushUnique(playlists[playlistKey], extractValue(line));
  }

  return {
    playlists,
    sfx,
    source,
    loadedAt: Date.now(),
  };
}

export async function loadSoundtrackManifest(
  source = "/soundtrack.in",
): Promise<SoundtrackManifest> {
  const response = await fetch(source, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${source} (${response.status})`);
  }
  const text = await response.text();
  return parseSoundtrackIn(text, source);
}

function uniqueOrdered(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

export function resolvePlaylist(
  manifest: SoundtrackManifest,
  contextKey: string,
): ResolvedPlaylist {
  const context = normalizeSectionName(contextKey || "default");
  const keysTried = uniqueOrdered([
    `page:${context}`,
    context,
    "default",
    "app",
    "global",
  ]);

  let matchedKey: string | null = null;
  let tracks: string[] = [];
  for (const key of keysTried) {
    const candidate = manifest.playlists[key];
    if (candidate && candidate.length > 0) {
      matchedKey = key;
      tracks = candidate;
      break;
    }
  }

  return {
    context,
    keysTried,
    matchedKey,
    tracks,
    shuffle: context === "landing",
  };
}

export function toAbsoluteTrackUrl(reference: string): string {
  if (typeof window === "undefined") return reference;
  try {
    return new URL(reference, window.location.origin).toString();
  } catch {
    return reference;
  }
}
