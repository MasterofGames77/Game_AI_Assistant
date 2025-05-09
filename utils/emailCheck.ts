import BannedEmail from '../models/BannedEmail';

export const isEmailBanned = async (email: string): Promise<boolean> => {
  const bannedEmail = await BannedEmail.findOne({ email: email.toLowerCase() });
  return !!bannedEmail;
};

export const banEmail = async (email: string, userId: string): Promise<void> => {
  await BannedEmail.create({
    email: email.toLowerCase(),
    originalUserId: userId
  });
}; 