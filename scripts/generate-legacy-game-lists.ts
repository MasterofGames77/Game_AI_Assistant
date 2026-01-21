/**
 * Generate legacy lists from games.json:
 * - data/automated-users/single-player.json
 * - data/automated-users/multiplayer.json
 *
 * This supports the transition where games.json is the source of truth.
 * The legacy files are treated as compatibility artifacts only.
 *
 * Usage:
 *   npx tsx scripts/generate-legacy-game-lists.ts
 */
import fs from 'fs';
import path from 'path';

type GameCatalogFile = {
  games: Array<{
    title: string;
    genres: string[];
    modes?: Array<'single' | 'multi'>;
  }>;
};

type LegacyGenreFile = Record<string, string[]>;

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function ensureArrayUniqueSorted(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function main() {
  const catalogPath = path.join(process.cwd(), 'data', 'automated-users', 'games.json');
  const singleOutPath = path.join(process.cwd(), 'data', 'automated-users', 'single-player.json');
  const multiOutPath = path.join(process.cwd(), 'data', 'automated-users', 'multiplayer.json');

  const catalog = readJson<GameCatalogFile>(catalogPath);
  if (!catalog?.games || !Array.isArray(catalog.games)) {
    throw new Error('Invalid games.json format. Expected { "games": [...] }');
  }

  const single: LegacyGenreFile = {};
  const multi: LegacyGenreFile = {};

  for (const game of catalog.games) {
    if (!game?.title || !Array.isArray(game.genres) || game.genres.length === 0) continue;
    const modes = Array.isArray(game.modes) ? game.modes : [];
    const inSingle = modes.includes('single');
    const inMulti = modes.includes('multi');

    for (const genre of game.genres) {
      if (inSingle) {
        if (!single[genre]) single[genre] = [];
        single[genre].push(game.title);
      }
      if (inMulti) {
        if (!multi[genre]) multi[genre] = [];
        multi[genre].push(game.title);
      }
    }
  }

  // Normalize ordering for stable diffs
  for (const key of Object.keys(single)) {
    single[key] = ensureArrayUniqueSorted(single[key]);
  }
  for (const key of Object.keys(multi)) {
    multi[key] = ensureArrayUniqueSorted(multi[key]);
  }

  writeJson(singleOutPath, single);
  writeJson(multiOutPath, multi);

  console.log(`✅ Wrote legacy single-player.json genres: ${Object.keys(single).length}`);
  console.log(`✅ Wrote legacy multiplayer.json genres: ${Object.keys(multi).length}`);
}

main();