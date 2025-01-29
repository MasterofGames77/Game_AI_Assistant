import UserViolation from '../models/UserViolation';

export const handleContentViolation = async (userId: string, offendingWords: string[]) => {
  const violation = await UserViolation.findOne({ userId });
  
  if (!violation) {
    // First violation - create record and warn
    await UserViolation.create({
      userId,
      violations: [{ offendingWords, content: offendingWords.join(', ') }],
      warningCount: 1
    });
    return { action: 'warning', count: 1 };
  }

  // Check if user was previously banned and ban period expired
  const wasPreviewslyBanned = violation.banExpiresAt && violation.banExpiresAt < new Date();
  
  if (wasPreviewslyBanned) {
    // Reset warning count after ban expires, but keep violation history
    violation.warningCount = 1;
    violation.banExpiresAt = new Date(0); // Use epoch date instead of null
    violation.violations.push({ offendingWords, content: offendingWords.join(', ') });
    await violation.save();
    return { action: 'warning', count: 1, message: 'Post-ban warning' };
  }

  // Check if currently banned
  if (violation.banExpiresAt && violation.banExpiresAt > new Date()) {
    return { action: 'banned', expiresAt: violation.banExpiresAt };
  }

  // Add new violation and increment warning count
  violation.violations.push({ offendingWords, content: offendingWords.join(', ') });
  violation.warningCount += 1;

  // Ban after second warning (post-ban) or third warning (initial)
  if ((wasPreviewslyBanned && violation.warningCount >= 2) || violation.warningCount >= 3) {
    violation.banExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await violation.save();
    return { action: 'banned', expiresAt: violation.banExpiresAt };
  }

  await violation.save();
  return { action: 'warning', count: violation.warningCount };
}; 