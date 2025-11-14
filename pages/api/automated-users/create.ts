import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import User from '../../../models/User';
import { hashPassword } from '../../../utils/passwordUtils';
import crypto from 'crypto';

/**
 * Generate a secure random password for automated users
 * (Not used for API calls, but required by schema)
 */
const generateSecurePassword = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create automated user account with Pro access
 */
const createAutomatedUser = async (
  username: string,
  email: string,
  preferences: { genres: string[]; focus: string }
) => {
  const password = generateSecurePassword();
  const hashedPassword = await hashPassword(password);
  
  const userId = `auto-${username.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const user = new User({
    userId,
    email,
    username,
    password: hashedPassword,
    conversationCount: 0,
    hasProAccess: true, // Grant Pro access
    requiresPasswordSetup: false,
    achievements: [],
    progress: {
      firstQuestion: 0,
      frequentAsker: 0,
      rpgEnthusiast: 0,
      bossBuster: 0,
      platformerPro: 0,
      survivalSpecialist: 0,
      strategySpecialist: 0,
      actionAficionado: 0,
      fightingFanatic: 0,
      simulationSpecialist: 0,
      battleRoyale: 0,
      sportsChampion: 0,
      adventureAddict: 0,
      shooterSpecialist: 0,
      puzzlePro: 0,
      racingRenegade: 0,
      stealthExpert: 0,
      horrorHero: 0,
      triviaMaster: 0,
      storySeeker: 0,
      beatEmUpBrawler: 0,
      rhythmMaster: 0,
      sandboxBuilder: 0,
      totalQuestions: 0,
      dailyExplorer: 0,
      speedrunner: 0,
      collectorPro: 0,
      dataDiver: 0,
      performanceTweaker: 0,
      conversationalist: 0,
      proAchievements: {
        gameMaster: 0,
        speedDemon: 0,
        communityLeader: 0,
        achievementHunter: 0,
        proStreak: 0,
        expertAdvisor: 0,
        genreSpecialist: 0,
        proContributor: 0
      }
    },
    subscription: {
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: oneYearFromNow,
      cancelAtPeriodEnd: false,
      billingCycle: 'monthly',
      currency: 'usd',
      earlyAccessGranted: false
    }
  });

  await user.save();
  
  // Return user without password
  const { password: _, ...userResponse } = user.toObject();
  return {
    ...userResponse,
    preferences // Include preferences in response for reference
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Connect to database
    await connectToWingmanDB();

    // Check if users already exist
    const existingMysterious = await User.findOne({ username: 'MysteriousMrEnter' });
    const existingWayward = await User.findOne({ username: 'WaywardJammer' });

    if (existingMysterious && existingWayward) {
      return res.status(200).json({
        message: 'Automated users already exist',
        users: {
          mysteriousMrEnter: {
            userId: existingMysterious.userId,
            username: existingMysterious.username,
            email: existingMysterious.email,
            hasProAccess: existingMysterious.hasProAccess
          },
          waywardJammer: {
            userId: existingWayward.userId,
            username: existingWayward.username,
            email: existingWayward.email,
            hasProAccess: existingWayward.hasProAccess
          }
        }
      });
    }

    const createdUsers: any = {};

    // Create MysteriousMrEnter if doesn't exist
    if (!existingMysterious) {
      createdUsers.mysteriousMrEnter = await createAutomatedUser(
        'MysteriousMrEnter',
        'mysterious-mr-enter@wingman.internal',
        {
          genres: ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer'],
          focus: 'single-player'
        }
      );
    } else {
      createdUsers.mysteriousMrEnter = {
        userId: existingMysterious.userId,
        username: existingMysterious.username,
        email: existingMysterious.email,
        hasProAccess: existingMysterious.hasProAccess,
        message: 'User already exists'
      };
    }

    // Create WaywardJammer if doesn't exist
    if (!existingWayward) {
      createdUsers.waywardJammer = await createAutomatedUser(
        'WaywardJammer',
        'wayward-jammer@wingman.internal',
        {
          genres: ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox'],
          focus: 'multiplayer'
        }
      );
    } else {
      createdUsers.waywardJammer = {
        userId: existingWayward.userId,
        username: existingWayward.username,
        email: existingWayward.email,
        hasProAccess: existingWayward.hasProAccess,
        message: 'User already exists'
      };
    }

    return res.status(201).json({
      message: 'Automated users created successfully',
      users: createdUsers
    });

  } catch (error) {
    console.error('Error creating automated users:', error);
    return res.status(500).json({
      error: 'Failed to create automated users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

