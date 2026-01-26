import fs from 'fs';
import path from 'path';

export type GameModeProfile = 'single' | 'multi' | 'hybrid' | 'unknown';

export type GameCatalogEntry = {
  title: string;
  /** Free-form genre keys, e.g. "rpg", "fps", "action-adventure" */
  genres: string[];
  /** Presence of content types (not exclusivity). */
  modes?: Array<'single' | 'multi'>;
};

type GameCatalogFile = {
  games: GameCatalogEntry[];
};

type LegacyGenreFile = Record<string, string[]>;

let cachedCatalog: Map<string, GameCatalogEntry> | null = null;
let cachedLegacyTitleToGenres: Map<string, Set<string>> | null = null;
let cachedLegacySingle: Set<string> | null = null;
let cachedLegacyMulti: Set<string> | null = null;

/**
 * Normalize game title for consistent comparison
 * Handles Unicode diacritics (e.g., Ōkami → okami, Ragnarök → ragnarok)
 * Uses Unicode normalization to decompose characters and remove diacritical marks
 */
function normalizeTitle(title: string): string {
  if (!title) return '';
  
  // Normalize to NFD (Normalization Form Decomposed) to separate base characters from diacritics
  // Then remove combining diacritical marks (Unicode category Mn: Mark, nonspacing)
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .toLowerCase()
    .trim();
  
  return normalized;
}

function safeReadJson<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadCatalogIfPresent(): Map<string, GameCatalogEntry> | null {
  const catalogPath = path.join(process.cwd(), 'data', 'automated-users', 'games.json');
  if (!fs.existsSync(catalogPath)) return null;

  const parsed = safeReadJson<GameCatalogFile>(catalogPath);
  if (!parsed?.games || !Array.isArray(parsed.games)) return null;

  const map = new Map<string, GameCatalogEntry>();
  for (const g of parsed.games) {
    if (!g?.title) continue;
    map.set(normalizeTitle(g.title), {
      title: g.title,
      genres: Array.isArray(g.genres) ? g.genres : [],
      modes: Array.isArray(g.modes) ? g.modes : undefined,
    });
  }
  return map;
}

function loadLegacyIndexes(): void {
  if (cachedLegacyTitleToGenres && cachedLegacySingle && cachedLegacyMulti) return;

  const singlePath = path.join(process.cwd(), 'data', 'automated-users', 'single-player.json');
  const multiPath = path.join(process.cwd(), 'data', 'automated-users', 'multiplayer.json');

  const single = safeReadJson<LegacyGenreFile>(singlePath) || {};
  const multi = safeReadJson<LegacyGenreFile>(multiPath) || {};

  const titleToGenres = new Map<string, Set<string>>();
  const singleSet = new Set<string>();
  const multiSet = new Set<string>();

  for (const [genre, games] of Object.entries(single)) {
    for (const title of games || []) {
      const key = normalizeTitle(title);
      if (!key) continue;
      singleSet.add(key);
      const set = titleToGenres.get(key) || new Set<string>();
      set.add(genre);
      titleToGenres.set(key, set);
    }
  }

  for (const [genre, games] of Object.entries(multi)) {
    for (const title of games || []) {
      const key = normalizeTitle(title);
      if (!key) continue;
      multiSet.add(key);
      const set = titleToGenres.get(key) || new Set<string>();
      set.add(genre);
      titleToGenres.set(key, set);
    }
  }

  cachedLegacyTitleToGenres = titleToGenres;
  cachedLegacySingle = singleSet;
  cachedLegacyMulti = multiSet;
}

function ensureLoaded(): void {
  if (!cachedCatalog) {
    cachedCatalog = loadCatalogIfPresent();
  }
  if (!cachedCatalog) {
    loadLegacyIndexes();
  }
}

export function getGameCatalogEntry(gameTitle: string): GameCatalogEntry | null {
  const key = normalizeTitle(gameTitle);
  if (!key) return null;
  ensureLoaded();
  return cachedCatalog?.get(key) || null;
}

export function getAllGenresForGame(gameTitle: string): string[] {
  const key = normalizeTitle(gameTitle);
  if (!key) return [];
  ensureLoaded();

  const fromCatalog = cachedCatalog?.get(key);
  if (fromCatalog) return fromCatalog.genres || [];

  const set = cachedLegacyTitleToGenres?.get(key);
  return set ? Array.from(set) : [];
}

/**
 * Pick a single "primary" genre for legacy callsites that expect one string.
 * If multiple genres exist, returns a stable-first choice.
 */
export function getPrimaryGenreForGame(gameTitle: string, fallback: string = 'rpg'): string {
  const genres = getAllGenresForGame(gameTitle);
  if (genres.length === 0) return fallback;
  return genres[0];
}

export function getGameModeProfile(gameTitle: string): GameModeProfile {
  const key = normalizeTitle(gameTitle);
  if (!key) return 'unknown';
  ensureLoaded();

  const fromCatalog = cachedCatalog?.get(key);
  if (fromCatalog?.modes && Array.isArray(fromCatalog.modes)) {
    const hasSingle = fromCatalog.modes.includes('single');
    const hasMulti = fromCatalog.modes.includes('multi');
    if (hasSingle && hasMulti) return 'hybrid';
    if (hasSingle) return 'single';
    if (hasMulti) return 'multi';
    return 'unknown';
  }

  const inSingle = cachedLegacySingle?.has(key) ?? false;
  const inMulti = cachedLegacyMulti?.has(key) ?? false;
  if (inSingle && inMulti) return 'hybrid';
  if (inSingle) return 'single';
  if (inMulti) return 'multi';
  return 'unknown';
}

