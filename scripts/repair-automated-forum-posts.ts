/**
 * Repair script: scan existing forums for automated-user posts that don't match forum category.
 * Can run in dry-run mode (report only) or apply mode (move posts into correct game+category forum).
 *
 * Scope (per user request):
 * - Original automated users: MysteriousMrEnter, WaywardJammer, InterdimensionalHipster
 * - All COMMON + EXPERT automated users (identified by User.gamerProfile.type in DB)
 *
 * Usage:
 * - Dry run (recommended first):
 *   npx tsx scripts/repair-automated-forum-posts.ts --dry-run
 *
 * - Apply migrations:
 *   npx tsx scripts/repair-automated-forum-posts.ts --apply
 *
 * Optional flags:
 *   --max-forums=200
 *   --max-moves=200
 *   --include-archived
 */
import mongoose from 'mongoose';
import { connectToWingmanDB } from '../utils/databaseConnections';
import Forum from '../models/Forum';
import User from '../models/User';

type NormalizedCategory = 'general' | 'gameplay' | 'mods' | 'speedruns' | 'help';

type ScriptOptions = {
  dryRun: boolean;
  includeArchived: boolean;
  maxForums: number;
  maxMoves: number;
};

const ORIGINAL_AUTOMATED_USERS = new Set<string>([
  'MysteriousMrEnter',
  'WaywardJammer',
  'InterdimensionalHipster',
]);

function normalizeCategory(input: string | undefined | null): NormalizedCategory {
  const c = (input || '').toLowerCase().trim();
  if (!c) return 'general';
  if (c.includes('mod')) return 'mods';
  if (c.includes('speed')) return 'speedruns';
  if (c.includes('gameplay')) return 'gameplay';
  if (c.includes('help') || c.includes('support')) return 'help';
  if (c.includes('general')) return 'general';
  return (c as NormalizedCategory) || 'general';
}

function inferCategoryFromText(text: string): NormalizedCategory {
  const t = (text || '').toLowerCase();
  if (!t) return 'general';

  // Keyword signals
  const mods =
    /\b(mod|mods|modding|install|installer|load order|patch|plugin|compatib|conflict|crash|recompiled|overhaul)\b/i.test(
      t
    );
  const speedruns =
    /\b(speedrun|pb|rta|route|split|strat|setup|reset|timing|skip|frame|cycle)\b/i.test(t);
  const gameplay =
    /\b(combo|matchup|inputs?|mechanic|strategy|boss|movement|build|controls?)\b/i.test(t);
  const helpTone =
    /\b(help|stuck|any tips|any advice|trouble|issue|problem|can't|cannot|how do i|what should i)\b/i.test(
      t
    );

  // Priority: mods/speedruns are most distinctive. If none, gameplay. If only help tone, help.
  if (mods) return 'mods';
  if (speedruns) return 'speedruns';
  if (gameplay) return 'gameplay';
  if (helpTone) return 'help';
  return 'general';
}

function isTextAlignedWithCategory(text: string, category: NormalizedCategory): boolean {
  if (!text) return false;
  if (category === 'general') return true;

  const inferred = inferCategoryFromText(text);

  // Help forums can contain any issue type; treat as aligned if it looks like help or any category keyword.
  if (category === 'help') {
    return inferred !== 'general';
  }

  return inferred === category;
}

function parseArguments(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    dryRun: true,
    includeArchived: false,
    maxForums: 500,
    maxMoves: 500,
  };

  for (const arg of args) {
    if (arg === '--apply') {
      options.dryRun = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--include-archived') {
      options.includeArchived = true;
    } else if (arg.startsWith('--max-forums=')) {
      const n = parseInt(arg.split('=')[1] || '', 10);
      if (!Number.isNaN(n) && n > 0) options.maxForums = n;
    } else if (arg.startsWith('--max-moves=')) {
      const n = parseInt(arg.split('=')[1] || '', 10);
      if (!Number.isNaN(n) && n > 0) options.maxMoves = n;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Repair automated forum posts (category alignment)

Usage:
  npx tsx scripts/repair-automated-forum-posts.ts --dry-run
  npx tsx scripts/repair-automated-forum-posts.ts --apply

Options:
  --dry-run            Report only (default)
  --apply              Move mismatched automated posts
  --max-forums=200      Limit forums scanned (default: 500)
  --max-moves=200       Limit post-threads moved (default: 500)
  --include-archived    Include forums with metadata.status != "active"
      `.trim());
      process.exit(0);
    }
  }

  return options;
}

function categoryToTitle(category: NormalizedCategory, gameTitle: string): string {
  const titles: Record<NormalizedCategory, string> = {
    general: 'General Discussion',
    gameplay: 'Gameplay',
    mods: 'Mods',
    speedruns: 'Speedruns',
    help: 'Help & Support',
  };
  return `${gameTitle} - ${titles[category]}`;
}

function normalizeGameTitle(title: string): string {
  return (title || '').toLowerCase().trim();
}

async function getAutomatedUsernamesFromDB(): Promise<Set<string>> {
  // Avoid Set iteration/spread so this script type-checks under stricter downlevel settings
  const usernames = new Set<string>(Array.from(ORIGINAL_AUTOMATED_USERS));

  const gamerUsers = await User.find({
    'gamerProfile.type': { $in: ['common', 'expert'] },
  })
    .select('username')
    .lean();

  for (const u of gamerUsers) {
    if (u?.username) usernames.add(u.username);
  }

  return usernames;
}

async function findOrCreateForumForGameAndCategory(params: {
  gameTitle: string;
  category: NormalizedCategory;
  // NOTE: keep types loose here so Next.js typecheck doesn't trip on mongoose lean() inference
  existingIndex: Map<string, { forumId: string; _id: any; title: string }>;
  dryRun: boolean;
}): Promise<{ forumId: string; _id: any; title: string; created: boolean }> {
  const gameKey = normalizeGameTitle(params.gameTitle);
  const key = `${gameKey}|${params.category}`;
  const existing = params.existingIndex.get(key);
  if (existing) {
    return { ...existing, created: false };
  }

  const title = categoryToTitle(params.category, params.gameTitle);

  if (params.dryRun) {
    // Fake placeholder; caller should not actually write.
    return {
      forumId: `DRY_RUN_NEW_FORUM_${Date.now()}`,
      _id: new mongoose.Types.ObjectId(),
      title,
      created: true,
    };
  }

  const forumId = `forum_repair_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const created = await Forum.create({
    forumId,
    title,
    gameTitle: params.gameTitle,
    category: params.category,
    isPrivate: false,
    allowedUsers: [],
    createdBy: 'system_repair',
    posts: [],
    metadata: {
      totalPosts: 0,
      lastActivityAt: new Date(),
      viewCount: 0,
      viewedBy: [],
      status: 'active',
    },
  });

  params.existingIndex.set(key, { forumId: created.forumId, _id: created._id, title: created.title });
  return { forumId: created.forumId, _id: created._id, title: created.title, created: true };
}

async function main() {
  const options = parseArguments();
  console.log('[repair-automated-forum-posts] Starting...', options);

  await connectToWingmanDB();

  const automatedUsernames = await getAutomatedUsernamesFromDB();
  console.log(`[repair-automated-forum-posts] Automated usernames loaded: ${automatedUsernames.size}`);

  const forumQuery: any = {};
  if (!options.includeArchived) {
    forumQuery['metadata.status'] = 'active';
  }

  const forums = await Forum.find(forumQuery)
    .select('forumId _id title gameTitle category posts metadata')
    .lean();

  console.log(`[repair-automated-forum-posts] Forums fetched: ${forums.length}`);

  // Build an index for destination lookups: gameTitleNormalized|category -> forum
  const forumIndex = new Map<string, { forumId: string; _id: any; title: string }>();
  for (const f of forums) {
    const gameKey = normalizeGameTitle(f.gameTitle || '');
    const cat = normalizeCategory(f.category);
    if (!gameKey) continue;
    forumIndex.set(`${gameKey}|${cat}`, {
      forumId: f.forumId,
      _id: (f as any)._id,
      title: f.title,
    });
  }

  const limitedForums = forums.slice(0, options.maxForums);

  let scannedPosts = 0;
  let mismatchedRoots = 0;
  let movedThreads = 0;
  let createdForums = 0;
  let skippedNoInference = 0;
  let skippedNoRoot = 0;

  for (const forum of limitedForums) {
    const forumCategory = normalizeCategory(forum.category);
    const gameTitle = forum.gameTitle || forum.title || '';
    const posts: any[] = Array.isArray((forum as any).posts) ? (forum as any).posts : [];
    if (!gameTitle || posts.length === 0) continue;

    // Build reply graph within this forum
    const childrenByParent = new Map<string, string[]>();
    const postsById = new Map<string, any>();
    for (const p of posts) {
      if (!p?._id) continue;
      const id = p._id.toString();
      postsById.set(id, p);
      if (p.replyTo) {
        const parentId = p.replyTo.toString();
        const list = childrenByParent.get(parentId) || [];
        list.push(id);
        childrenByParent.set(parentId, list);
      }
    }

    // Only migrate threads whose ROOT post is an automated user post
    for (const p of posts) {
      if (!p?._id) continue;
      if (p.replyTo) continue; // not root

      scannedPosts++;
      if (scannedPosts % 2000 === 0) {
        console.log(`[repair-automated-forum-posts] Progress: scannedPosts=${scannedPosts}, movedThreads=${movedThreads}`);
      }

      const username = p.username || p.createdBy;
      if (!username || !automatedUsernames.has(username)) continue;
      if (p.metadata?.status && p.metadata.status !== 'active') continue;

      const message = (p.message || '').toString();
      if (!message.trim()) continue;

      const aligned = isTextAlignedWithCategory(message, forumCategory);
      if (aligned) continue;

      mismatchedRoots++;
      const inferred = inferCategoryFromText(message);

      // If we can't infer a meaningful destination, just flag.
      if (inferred === 'general' || inferred === forumCategory) {
        skippedNoInference++;
        continue;
      }

      // Gather automated descendants (thread) to move with the root
      const rootId = p._id.toString();
      const toMoveIds: string[] = [];
      const stack = [rootId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        const currentPost = postsById.get(current);
        if (currentPost) {
          const u = currentPost.username || currentPost.createdBy;
          if (u && automatedUsernames.has(u) && (currentPost.metadata?.status ?? 'active') === 'active') {
            toMoveIds.push(current);
          }
        }
        const kids = childrenByParent.get(current) || [];
        for (const k of kids) stack.push(k);
      }

      if (toMoveIds.length === 0) {
        skippedNoRoot++;
        continue;
      }

      const toMovePosts = toMoveIds
        .map(id => postsById.get(id))
        .filter(Boolean);

      if (options.dryRun) {
        console.log(
          `[DRY RUN] Would move thread: game="${gameTitle}", from="${forumCategory}" -> "${inferred}", rootAuthor="${username}", posts=${toMovePosts.length}, forumId=${forum.forumId}`
        );
        movedThreads++;
        if (movedThreads >= options.maxMoves) break;
        continue;
      }

      const destination = await findOrCreateForumForGameAndCategory({
        gameTitle,
        category: inferred,
        existingIndex: forumIndex,
        dryRun: false,
      });
      if (destination.created) createdForums++;

      // Move posts: pull from source, push into destination
      const objectIds = toMovePosts.map(pst => pst._id);

      await Forum.updateOne(
        { forumId: forum.forumId },
        {
          $pull: { posts: { _id: { $in: objectIds } } },
          $inc: { 'metadata.totalPosts': -toMovePosts.length },
          $set: { 'metadata.lastActivityAt': new Date(), updatedAt: new Date() },
        }
      );

      await Forum.updateOne(
        { forumId: destination.forumId },
        {
          $push: { posts: { $each: toMovePosts } },
          $inc: { 'metadata.totalPosts': toMovePosts.length },
          $set: { 'metadata.lastActivityAt': new Date(), updatedAt: new Date() },
        }
      );

      console.log(
        `[APPLIED] Moved thread: game="${gameTitle}", from="${forumCategory}" -> "${inferred}", posts=${toMovePosts.length}, srcForumId=${forum.forumId}, dstForumId=${destination.forumId}`
      );

      movedThreads++;
      if (movedThreads >= options.maxMoves) break;
    }

    if (movedThreads >= options.maxMoves) break;
  }

  console.log('='.repeat(72));
  console.log('[repair-automated-forum-posts] Done');
  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        forumsScanned: Math.min(forums.length, options.maxForums),
        scannedPosts,
        mismatchedRootThreadsFound: mismatchedRoots,
        movedThreads,
        createdForums,
        skippedNoInference,
        skippedNoRoot,
      },
      null,
      2
    )
  );

  // Close connection for script exit
  await mongoose.disconnect();
}

main().catch(async err => {
  console.error('[repair-automated-forum-posts] Fatal error:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});

