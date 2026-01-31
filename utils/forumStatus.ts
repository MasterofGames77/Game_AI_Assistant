/**
 * Forum status rules:
 *
 * - **active**: Forum has had a new post within the last INACTIVE_AFTER_DAYS days. Viewing and posting allowed.
 * - **inactive**: No new post in INACTIVE_AFTER_DAYS days (derived from lastActivityAt). Viewing and posting still allowed; a new post sets it back to active.
 * - **archived**: Forum is read-only. Everyone can view posts; no one can post. Only the forum creator or admin can restore it to allow posting again.
 */
export const INACTIVE_AFTER_DAYS = 7;

const INACTIVE_AFTER_MS = INACTIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;

export type EffectiveForumStatus = 'active' | 'inactive' | 'archived';

/**
 * Returns the effective status for display and access checks.
 * Forums with stored status 'active' are considered 'inactive' if lastActivityAt is older than INACTIVE_AFTER_DAYS.
 */
export function getEffectiveForumStatus(metadata: {
  status?: string;
  lastActivityAt?: Date | string | null;
}): EffectiveForumStatus {
  const status = (metadata?.status || 'active').toLowerCase();
  // Treat legacy 'locked' as 'archived' (we simplified to a single read-only status)
  if (status === 'archived' || status === 'locked') {
    return 'archived';
  }
  const lastActivityAt = metadata?.lastActivityAt
    ? new Date(metadata.lastActivityAt)
    : new Date();
  const cutoff = new Date(Date.now() - INACTIVE_AFTER_MS);
  if (lastActivityAt < cutoff) {
    return 'inactive';
  }
  return 'active';
}
