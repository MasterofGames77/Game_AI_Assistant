export type ForumCategory = 'speedruns' | 'gameplay' | 'mods' | 'general' | 'help';

const CANONICAL: ForumCategory[] = ['speedruns', 'gameplay', 'mods', 'general', 'help'];

/**
 * Normalize forum category into one of the canonical values used in DB.
 * Accepts common display variants like "Help & Support", "General Discussion", etc.
 */
export function normalizeForumCategory(input: string | undefined | null): ForumCategory {
  const raw = (input || '').toString().toLowerCase().trim();
  if (!raw) return 'general';

  if (raw === 'help' || raw.includes('help') || raw.includes('support')) return 'help';
  if (raw === 'general' || (raw.includes('general') && raw.includes('discussion'))) return 'general';
  if (raw === 'mods' || raw.includes('mod')) return 'mods';
  if (raw === 'speedruns' || raw.includes('speed')) return 'speedruns';
  if (raw === 'gameplay' || raw.includes('gameplay')) return 'gameplay';

  // If it already matches a canonical value, use it.
  if (CANONICAL.includes(raw as ForumCategory)) return raw as ForumCategory;
  return 'general';
}

export function forumCategoryDisplayName(category: ForumCategory): string {
  switch (category) {
    case 'help':
      return 'Help & Support';
    case 'general':
      return 'General Discussion';
    case 'gameplay':
      return 'Gameplay';
    case 'mods':
      return 'Mods';
    case 'speedruns':
      return 'Speedruns';
    default:
      return 'General Discussion';
  }
}

