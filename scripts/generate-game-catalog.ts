/**
 * Generate a unified game catalog file from legacy lists.
 *
 * During migration:
 * - `games.json` is the canonical source-of-truth.
 * - This script is only used to bootstrap `games.json` from legacy lists.
 *
 * Output:
 * - data/automated-users/games.json
 *
 * The new file supports:
 * - multiple genres per game
 * - a "modes" array (single/multi) to mark hybrid games
 *
 * Usage:
 *   npx tsx scripts/generate-game-catalog.ts
 */
import fs from 'fs';
import path from 'path';

type LegacyGenreFile = Record<string, string[]>;

type GameCatalogEntry = {
  title: string;
  genres: string[];
  modes: Array<'single' | 'multi'>;
};

function normalizeTitle(title: string): string {
  return (title || '').toLowerCase().trim();
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function main() {
  const singlePath = path.join(process.cwd(), 'data', 'automated-users', 'single-player.json');
  const multiPath = path.join(process.cwd(), 'data', 'automated-users', 'multiplayer.json');
  const outPath = path.join(process.cwd(), 'data', 'automated-users', 'games.json');

  const single = readJson<LegacyGenreFile>(singlePath);
  const multi = readJson<LegacyGenreFile>(multiPath);

  const map = new Map<
    string,
    { title: string; genres: Set<string>; modes: Set<'single' | 'multi'> }
  >();

  const add = (title: string, genre: string, mode: 'single' | 'multi') => {
    const key = normalizeTitle(title);
    if (!key) return;
    const entry = map.get(key) || { title, genres: new Set<string>(), modes: new Set<'single' | 'multi'>() };
    entry.title = title; // keep last-seen casing
    entry.genres.add(genre);
    entry.modes.add(mode);
    map.set(key, entry);
  };

  for (const [genre, games] of Object.entries(single)) {
    for (const title of games || []) add(title, genre, 'single');
  }

  for (const [genre, games] of Object.entries(multi)) {
    for (const title of games || []) add(title, genre, 'multi');
  }

  const games: GameCatalogEntry[] = Array.from(map.values())
    .map(v => ({
      title: v.title,
      genres: Array.from(v.genres),
      modes: Array.from(v.modes),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const out = { games };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`✅ Wrote ${games.length} game entries to ${outPath}`);
}

main();