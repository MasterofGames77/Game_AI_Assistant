/**
 * De-duplicate forums that have the SAME (gameTitle, category, title) but different forumIds.
 * Applies ONLY to forums created by automated users.
 *
 * Strategy:
 * - Group active, public forums by normalized gameTitle + normalized category + normalized title
 * - For groups with > 1:
 *   - Pick canonical forum: earliest createdAt
 *   - Move automated-user posts from duplicates into canonical
 *   - If a duplicate has no remaining posts after move, archive it
 *   - If a duplicate still has human posts, rename it to a unique title (so the UI isn't confusing)
 *
 * Usage:
 *   npx tsx scripts/dedupe-automated-forums.ts --dry-run
 *   npx tsx scripts/dedupe-automated-forums.ts --apply
 *
 * Options:
 *   --max-groups=200
 *   --max-forums=2000
 *   --include-archived
 */
import mongoose from 'mongoose';
import { connectToWingmanDB } from '../utils/databaseConnections';
import Forum from '../models/Forum';
import User from '../models/User';
import { normalizeForumCategory } from '../utils/forumCategory';

type ScriptOptions = {
  dryRun: boolean;
  includeArchived: boolean;
  maxGroups: number;
  maxForums: number;
};

const ORIGINAL_AUTOMATED_USERS = new Set<string>([
  'MysteriousMrEnter',
  'WaywardJammer',
  'InterdimensionalHipster',
]);

function normalizeText(s: string): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
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

function parseArguments(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    dryRun: true,
    includeArchived: false,
    maxGroups: 500,
    maxForums: 5000,
  };

  for (const arg of args) {
    if (arg === '--apply') options.dryRun = false;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--include-archived') options.includeArchived = true;
    else if (arg.startsWith('--max-groups=')) {
      const n = parseInt(arg.split('=')[1] || '', 10);
      if (!Number.isNaN(n) && n > 0) options.maxGroups = n;
    } else if (arg.startsWith('--max-forums=')) {
      const n = parseInt(arg.split('=')[1] || '', 10);
      if (!Number.isNaN(n) && n > 0) options.maxForums = n;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
De-dupe automated forums (same game+category+title)

Usage:
  npx tsx scripts/dedupe-automated-forums.ts --dry-run
  npx tsx scripts/dedupe-automated-forums.ts --apply

Options:
  --dry-run
  --apply
  --max-groups=200
  --max-forums=2000
  --include-archived
      `.trim());
      process.exit(0);
    }
  }

  return options;
}

async function main() {
  const options = parseArguments();
  console.log('[dedupe-automated-forums] Starting...', options);

  await connectToWingmanDB();
  const automatedUsernames = await getAutomatedUsernamesFromDB();
  console.log(`[dedupe-automated-forums] Automated usernames loaded: ${automatedUsernames.size}`);

  const query: any = { isPrivate: false };
  if (!options.includeArchived) query['metadata.status'] = 'active';

  const forums = await Forum.find(query)
    .select('forumId _id title gameTitle category createdBy createdAt posts metadata')
    .sort({ createdAt: 1 })
    .limit(options.maxForums)
    .lean();

  const eligibleForums = forums.filter(f => f.createdBy && automatedUsernames.has(f.createdBy));
  console.log(`[dedupe-automated-forums] Forums fetched: ${forums.length}, eligible automated forums: ${eligibleForums.length}`);

  const groups = new Map<string, any[]>();
  for (const f of eligibleForums) {
    const key = `${normalizeText(f.gameTitle || '')}|${normalizeForumCategory(f.category)}|${normalizeText(f.title || '')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  const duplicateGroups = Array.from(groups.entries()).filter(([, arr]) => arr.length > 1);
  console.log(`[dedupe-automated-forums] Duplicate groups found: ${duplicateGroups.length}`);

  let processedGroups = 0;
  let movedPosts = 0;
  let archivedForums = 0;
  let renamedForums = 0;

  for (const [key, group] of duplicateGroups.slice(0, options.maxGroups)) {
    processedGroups++;
    const canonical = group[0]; // already sorted by createdAt asc
    const dupes = group.slice(1);

    const canonicalId = canonical.forumId;
    const gameTitle = canonical.gameTitle;
    const category = normalizeForumCategory(canonical.category);
    const title = canonical.title;

    console.log(
      `${options.dryRun ? '[DRY RUN]' : '[APPLY]'} Group ${processedGroups}/${Math.min(duplicateGroups.length, options.maxGroups)}: "${title}" (${gameTitle}, ${category}) canonical=${canonicalId} dupes=${dupes.map(d => d.forumId).join(', ')}`
    );

    for (const dupe of dupes) {
      const dupeId = dupe.forumId;

      // Split dupe posts into automated vs non-automated
      const posts = Array.isArray(dupe.posts) ? dupe.posts : [];
      const automatedPosts = posts.filter((p: any) => {
        const u = p?.username || p?.createdBy;
        return u && automatedUsernames.has(u) && (p.metadata?.status ?? 'active') === 'active';
      });
      const nonAutomatedPosts = posts.filter((p: any) => {
        const u = p?.username || p?.createdBy;
        return !u || !automatedUsernames.has(u);
      });

      if (options.dryRun) {
        console.log(
          `  - Would move ${automatedPosts.length} automated post(s) from ${dupeId} -> ${canonicalId}. Non-automated remaining: ${nonAutomatedPosts.length}`
        );
      } else {
        if (automatedPosts.length > 0) {
          const ids = automatedPosts.map((p: any) => p._id);
          await Forum.updateOne(
            { forumId: dupeId },
            {
              $pull: { posts: { _id: { $in: ids } } },
              $inc: { 'metadata.totalPosts': -automatedPosts.length },
              $set: { 'metadata.lastActivityAt': new Date(), updatedAt: new Date() },
            }
          );
          await Forum.updateOne(
            { forumId: canonicalId },
            {
              $push: { posts: { $each: automatedPosts } },
              $inc: { 'metadata.totalPosts': automatedPosts.length },
              $set: { 'metadata.lastActivityAt': new Date(), updatedAt: new Date() },
            }
          );
          movedPosts += automatedPosts.length;
        }

        // Refresh dupe forum to see what's left
        const refreshed = await Forum.findOne({ forumId: dupeId }).select('posts title metadata').lean() as any;
        const remainingPosts = Array.isArray(refreshed?.posts) ? refreshed.posts : [];
        const remainingNonAutomated = remainingPosts.filter((p: any) => {
          const u = p?.username || p?.createdBy;
          return !u || !automatedUsernames.has(u);
        });

        if (remainingPosts.length === 0) {
          await Forum.updateOne(
            { forumId: dupeId },
            { $set: { 'metadata.status': 'archived', updatedAt: new Date() } }
          );
          archivedForums++;
        } else if (remainingNonAutomated.length > 0) {
          // Rename to avoid duplicate title confusion but keep forum accessible for human posts
          const base = `${title} (Duplicate)`;
          let suffix = 2;
          let newTitle = base;

          // Ensure unique title for same game/category among active forums
          // (simple loop with suffix)
          while (true) {
            const exists = await Forum.findOne({
              gameTitle: { $regex: new RegExp(`^${gameTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              category,
              title: { $regex: new RegExp(`^${newTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              isPrivate: false,
              'metadata.status': 'active',
              forumId: { $ne: dupeId },
            }).lean();
            if (!exists) break;
            suffix++;
            newTitle = `${base} ${suffix}`;
          }

          await Forum.updateOne(
            { forumId: dupeId },
            { $set: { title: newTitle, updatedAt: new Date() } }
          );
          renamedForums++;
        } else {
          // Only automated posts remain; archive to reduce confusion
          await Forum.updateOne(
            { forumId: dupeId },
            { $set: { 'metadata.status': 'archived', updatedAt: new Date() } }
          );
          archivedForums++;
        }
      }
    }
  }

  console.log('='.repeat(72));
  console.log('[dedupe-automated-forums] Done');
  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        processedGroups,
        movedPosts,
        archivedForums,
        renamedForums,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async err => {
  console.error('[dedupe-automated-forums] Fatal error:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});

