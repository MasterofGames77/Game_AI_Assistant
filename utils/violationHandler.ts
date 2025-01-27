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

  // Check if user is banned
  if (violation.banExpiresAt && violation.banExpiresAt > new Date()) {
    return { action: 'banned', expiresAt: violation.banExpiresAt };
  }

  // Add new violation
  violation.violations.push({ offendingWords, content: offendingWords.join(', ') });
  violation.warningCount += 1;

  if (violation.warningCount >= 3) {
    // Set 30-day ban
    violation.banExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await violation.save();
    return { action: 'banned', expiresAt: violation.banExpiresAt };
  }

  await violation.save();
  return { action: 'warning', count: violation.warningCount };
}; 