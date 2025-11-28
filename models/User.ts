import mongoose, { Document, Schema } from 'mongoose';
import { Achievement, Progress, Subscription, UsageLimit, HealthMonitoring, ChallengeProgress, ChallengeStreak, ChallengeReward } from '../types';

export interface IUser extends Document {
  userId: string;
  username: string;
  email: string;
  password?: string; // Optional for backward compatibility with legacy users
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  requiresPasswordSetup?: boolean; // Flag for legacy users who need to set password
  // New fields for enhanced security
  passwordResetCode?: string; // 6-digit verification code
  passwordResetCodeExpires?: Date; // Code expiration time
  lastPasswordResetRequest?: Date; // For rate limiting
  conversationCount: number;
  hasProAccess: boolean;
  achievements: Achievement[];
  progress: Progress;
  subscription?: Subscription;
  usageLimit?: UsageLimit;
  healthMonitoring?: HealthMonitoring;
  streak?: {
    lastActivityDate?: Date;
    currentStreak?: number;
    longestStreak?: number;
  };
  challengeProgress?: ChallengeProgress;
  challengeStreak?: ChallengeStreak;
  challengeRewards?: ChallengeReward[];
  avatarUrl?: string; // Current avatar URL
  avatarHistory?: Array<{ url: string; uploadedAt: Date }>; // Last 6 avatars
  gameTracking?: {
    wishlist: Array<{
      gameName: string;
      addedAt: Date;
      notes?: string;
    }>;
    currentlyPlaying: Array<{
      gameName: string;
      startedAt: Date;
      notes?: string;
    }>;
  };
  createdAt?: Date; // Mongoose timestamp
  updatedAt?: Date; // Mongoose timestamp
  // Methods
  hasActiveProAccess(): boolean;
  getSubscriptionStatus(): {
    type: string;
    status: string;
    expiresAt?: Date;
    daysUntilExpiration?: number;
    canUpgrade?: boolean;
    showWarning?: boolean;
    canCancel?: boolean;
    canReactivate?: boolean;
  };
  canAskQuestion(): {
    allowed: boolean;
    reason?: string;
    questionsRemaining?: number;
    cooldownUntil?: Date;
    nextWindowReset?: Date;
  };
  recordQuestionUsage(): void;
  getUsageStatus(): {
    questionsUsed: number;
    questionsRemaining: number;
    questionsLimit: number;
    windowResetTime?: Date;
    cooldownUntil?: Date;
    isInCooldown: boolean;
    isProUser: boolean;
  };
  shouldShowBreakReminder(): {
    shouldShow: boolean;
    timeSinceLastBreak: number;
    timeSinceLastReminder: number;
    nextBreakIn?: number;
  };
  startBreak(): void;
  endBreak(): void;
  recordBreak(): void;
  getHealthTips(): string[];
  updateStreak(): void;
  syncStreakStatus(): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date | null;
  }>;
}

const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 32,
    match: /^[\w#@.-]+$/
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Optional for legacy users
  passwordResetToken: { type: String, required: false },
  passwordResetExpires: { type: Date, required: false },
  requiresPasswordSetup: { type: Boolean, default: false },
  // New fields for enhanced security
  passwordResetCode: { type: String, required: false },
  passwordResetCodeExpires: { type: Date, required: false },
  lastPasswordResetRequest: { type: Date, required: false },
  conversationCount: { type: Number, required: true, default: 0 },
  hasProAccess: { type: Boolean, default: false },
  achievements: [
    {
      name: { type: String, required: true },
      dateEarned: { type: Date, required: true },
    },
  ],
  progress: {
    firstQuestion: { type: Number, default: 0 },
    frequentAsker: { type: Number, default: 0 },
    rpgEnthusiast: { type: Number, default: 0 },
    bossBuster: { type: Number, default: 0 },
    platformerPro: { type: Number, default: 0 },
    survivalSpecialist: { type: Number, default: 0 },
    strategySpecialist: { type: Number, default: 0 },
    actionAficionado: { type: Number, default: 0 },
    fightingFanatic: { type: Number, default: 0 },
    simulationSpecialist: { type: Number, default: 0 },
    battleRoyale: { type: Number, default: 0 },
    sportsChampion: { type: Number, default: 0 },
    adventureAddict: { type: Number, default: 0 },
    shooterSpecialist: { type: Number, default: 0 },
    puzzlePro: { type: Number, default: 0 },
    racingRenegade: { type: Number, default: 0 },
    stealthExpert: { type: Number, default: 0 },
    horrorHero: { type: Number, default: 0 },
    triviaMaster: { type: Number, default: 0 },
    storySeeker: { type: Number, default: 0 },
    beatEmUpBrawler: { type: Number, default: 0 },
    rhythmMaster: { type: Number, default: 0 },
    sandboxBuilder: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    dailyExplorer: { type: Number, default: 0 },
    speedrunner: { type: Number, default: 0 },
    collectorPro: { type: Number, default: 0 },
    dataDiver: { type: Number, default: 0 },
    performanceTweaker: { type: Number, default: 0 },
    conversationalist: { type: Number, default: 0 },
    proAchievements: {
      gameMaster: { type: Number, default: 0 },
      speedDemon: { type: Number, default: 0 },
      communityLeader: { type: Number, default: 0 },
      achievementHunter: { type: Number, default: 0 },
      proStreak: { type: Number, default: 0 },
      expertAdvisor: { type: Number, default: 0 },
      genreSpecialist: { type: Number, default: 0 },
      proContributor: { type: Number, default: 0 }
    },
    // NEW FIELD FOR PHASE 1 - Personalized recommendations data (completely optional)
    personalized: {
      preferenceProfile: {
        dominantGenres: [{ type: String }],
        learningStyle: { type: String },
        difficultyPreference: { type: String },
        playstyleTags: [{ type: String }],
        recentInterests: [{ type: String }],
        seasonalTrends: [{ type: String }]
      },
      gameplayPatterns: {
        avgQuestionsPerSession: { type: Number },
        sessionFrequency: { type: String },
        difficultyProgression: [{ type: Number }],
        genreDiversity: { type: Number },
        engagementDepth: { type: Number }
      },
      recommendationHistory: {
        lastRecommendations: { type: Date },
        recommendedGames: [{ type: String }],
        acceptedSuggestions: [{ type: String }],
        declinedSuggestions: [{ type: String }],
        dismissedRecently: { type: Boolean },
        lastAnalysisTime: { type: Date }
      }
    }
  },
  // New subscription schema
  subscription: {
    status: { 
      type: String, 
      enum: ['free_period', 'active', 'canceled', 'past_due', 'unpaid', 'expired', 'trialing'],
      default: 'expired'
    },
    stripeCustomerId: { type: String, sparse: true },
    stripeSubscriptionId: { type: String, sparse: true },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date },
    // Early access specific fields
    earlyAccessGranted: { type: Boolean, default: false },
    earlyAccessStartDate: { type: Date },
    earlyAccessEndDate: { type: Date },
    transitionToPaid: { type: Boolean, default: false },
    // Payment details
    paymentMethod: { type: String },
    amount: { type: Number },
    currency: { type: String, default: 'usd' },
    billingCycle: { type: String, default: 'monthly' }
  },
  // Usage limit schema for free users
  usageLimit: {
    freeQuestionsUsed: { type: Number, default: 0 },
    freeQuestionsLimit: { type: Number, default: 10 },
    windowStartTime: { type: Date, default: Date.now },
    windowDurationHours: { type: Number, default: 1 },
    lastQuestionTime: { type: Date },
    cooldownUntil: { type: Date }
  },
  // Health monitoring schema
  healthMonitoring: {
    breakReminderEnabled: { type: Boolean, default: true },
    breakIntervalMinutes: { type: Number, default: 45 },
    lastBreakTime: { type: Date },
    lastSessionStart: { type: Date },
    totalSessionTime: { type: Number, default: 0 },
    breakCount: { type: Number, default: 0 },
    lastBreakReminder: { type: Date },
    healthTipsEnabled: { type: Boolean, default: true },
    lastHealthTipTime: { type: Date },
    isOnBreak: { type: Boolean, default: false },
    breakStartTime: { type: Date },
    // Server-side timer state for cross-browser persistence
    timerState: {
      remainingSeconds: { type: Number },
      savedAt: { type: Date },
      breakIntervalMinutes: { type: Number }
    }
  },
  // Daily streak tracking
  streak: {
    lastActivityDate: { type: Date },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 }
  },
  // Daily challenge progress
  challengeProgress: {
    challengeId: { type: String },
    date: { type: String }, // YYYY-MM-DD format
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    progress: { type: Number }, // For count-based challenges
    target: { type: Number } // For count-based challenges
  },
  // Daily challenge streak tracking
  challengeStreak: {
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String } // YYYY-MM-DD format
  },
  // Challenge milestone rewards
  challengeRewards: [{
    milestone: { type: Number, required: true },
    type: { 
      type: String, 
      enum: ['badge', 'title', 'icon', 'special'],
      required: true 
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String },
    dateEarned: { type: Date, default: Date.now }
  }],
  // Avatar/profile picture
  avatarUrl: { type: String },
  avatarHistory: [{
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  // Game tracking - wishlist and currently playing
  gameTracking: {
    wishlist: [{
      gameName: { type: String, required: true },
      addedAt: { type: Date, default: Date.now },
      notes: { type: String } // Optional user notes about the game
    }],
    currentlyPlaying: [{
      gameName: { type: String, required: true },
      startedAt: { type: Date, default: Date.now },
      notes: { type: String } // Optional user notes about progress
    }]
  }
}, { collection: 'users' });

// Create indexes for subscription-related queries
UserSchema.index({ 'subscription.status': 1 });
UserSchema.index({ 'subscription.earlyAccessGranted': 1 });
UserSchema.index({ 'subscription.earlyAccessEndDate': 1 });
UserSchema.index({ 'subscription.currentPeriodEnd': 1 });
// Note: stripeCustomerId and stripeSubscriptionId already have sparse indexes from schema definition

// Create indexes for usage limit queries
UserSchema.index({ 'usageLimit.windowStartTime': 1 });
UserSchema.index({ 'usageLimit.cooldownUntil': 1 });

// Create indexes for authentication queries
UserSchema.index({ 'passwordResetToken': 1 });
UserSchema.index({ 'requiresPasswordSetup': 1 });
// New indexes for enhanced security
UserSchema.index({ 'passwordResetCode': 1 });
UserSchema.index({ 'lastPasswordResetRequest': 1 });

// Method to check if user has active Pro access
UserSchema.methods.hasActiveProAccess = function(): boolean {
  const now = new Date();
  const subscription = this.subscription;
  const currentPeriodEnd = subscription?.currentPeriodEnd;
  const hasFuturePeriod = currentPeriodEnd ? currentPeriodEnd > now : false;

  const hasActiveEarlyAccess =
    subscription?.earlyAccessGranted &&
    subscription?.earlyAccessEndDate &&
    subscription.earlyAccessEndDate > now;

  const hasManualLegacyAccess =
    this.hasProAccess && !subscription;

  const hasActivePaidSubscription =
    subscription?.status === 'active' &&
    (hasFuturePeriod || !currentPeriodEnd);

  const hasCanceledButActiveSubscription =
    subscription?.status === 'canceled' &&
    subscription?.cancelAtPeriodEnd &&
    hasFuturePeriod;

  if (
    hasActiveEarlyAccess ||
    hasManualLegacyAccess ||
    hasActivePaidSubscription ||
    hasCanceledButActiveSubscription
  ) {
    return true;
  }

  return false;
};

// Method to get subscription status for display
UserSchema.methods.getSubscriptionStatus = function() {
  const now = new Date();
  
  // Check if user has Pro access (legacy or subscription-based)
  if (this.hasProAccess) {
    if (this.subscription?.earlyAccessGranted) {
      if (this.subscription.earlyAccessEndDate && this.subscription.earlyAccessEndDate > now) {
        const daysUntilExpiration = Math.ceil(
          (this.subscription.earlyAccessEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          type: 'free_period',
          status: 'Free Period Active',
          expiresAt: this.subscription.earlyAccessEndDate,
          daysUntilExpiration,
          canUpgrade: true,
          showWarning: daysUntilExpiration <= 30
        };
      } else {
        return {
          type: 'expired_free',
          status: 'Free Period Expired',
          canUpgrade: true,
          showWarning: true
        };
      }
    }
    
    if (this.subscription?.status === 'active' && 
        this.subscription?.currentPeriodEnd && 
        this.subscription.currentPeriodEnd > now) {
      return {
        type: 'paid_active',
        status: 'Paid Subscription Active',
        expiresAt: this.subscription.currentPeriodEnd,
        canCancel: true
      };
    }
    
    if (this.subscription?.status === 'canceled' && 
        this.subscription?.cancelAtPeriodEnd && 
        this.subscription?.currentPeriodEnd && 
        this.subscription.currentPeriodEnd > now) {
      return {
        type: 'canceled_active',
        status: 'Subscription Canceled (Active Until Period End)',
        expiresAt: this.subscription.currentPeriodEnd,
        canReactivate: true
      };
    }
    
    // If user has Pro access but no specific subscription data, show as active
    if (this.subscription?.status === 'active') {
      return {
        type: 'paid_active',
        status: 'Paid Subscription Active',
        expiresAt: this.subscription.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        canCancel: true
      };
    }
    
    // Legacy Pro users or users with Pro access but no subscription details
    return {
      type: 'paid_active',
      status: 'Paid Subscription Active',
      expiresAt: this.subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      canCancel: true
    };
  }
  
  return {
    type: 'no_subscription',
    status: 'No Active Subscription',
    canUpgrade: true
  };
};

// Method to check if user can ask a question (usage limit check)
UserSchema.methods.canAskQuestion = function(): {
  allowed: boolean;
  reason?: string;
  questionsRemaining?: number;
  cooldownUntil?: Date;
  nextWindowReset?: Date;
} {
  return {
    allowed: true,
    questionsRemaining: -1
  };
};

// Method to record question usage
UserSchema.methods.recordQuestionUsage = function(): void {
  // Question usage tracking is no longer needed now that all users have unlimited access.
  return;
};

// Method to get usage status for display
UserSchema.methods.getUsageStatus = function(): {
  questionsUsed: number;
  questionsRemaining: number;
  questionsLimit: number;
  windowResetTime?: Date;
  cooldownUntil?: Date;
  isInCooldown: boolean;
  isProUser: boolean;
} {
  return {
    questionsUsed: 0,
    questionsRemaining: -1,
    questionsLimit: -1,
    windowResetTime: undefined,
    cooldownUntil: undefined,
    isInCooldown: false,
    isProUser: this.hasActiveProAccess()
  };
};

// Method to check if user needs a break reminder
UserSchema.methods.shouldShowBreakReminder = function(): {
  shouldShow: boolean;
  timeSinceLastBreak: number;
  timeSinceLastReminder: number;
  nextBreakIn?: number;
} {
  const now = new Date();
  
  // If health monitoring is disabled, don't show reminders
  if (!this.healthMonitoring?.breakReminderEnabled) {
    return { shouldShow: false, timeSinceLastBreak: 0, timeSinceLastReminder: 0 };
  }
  
  const health = this.healthMonitoring;
  const breakInterval = health.breakIntervalMinutes || 45;
  
  // If user is currently on a break, don't show reminders
  if (health.isOnBreak) {
    return { shouldShow: false, timeSinceLastBreak: 0, timeSinceLastReminder: 0 };
  }
  
  // Calculate active session time since last break
  // Use session-based time tracking instead of wall clock time
  let timeSinceLastBreak = 0;
  
  if (health.lastBreakTime) {
    // If user has taken a break, calculate time since then
    // But only count time when the application was actually active
    const sessionStartTime = health.lastSessionStart;
    if (sessionStartTime && sessionStartTime > health.lastBreakTime) {
      // Session started after last break, so count from session start
      timeSinceLastBreak = Math.floor((now.getTime() - sessionStartTime.getTime()) / (1000 * 60));
    } else {
      // Session started before last break, so count from last break
      timeSinceLastBreak = Math.floor((now.getTime() - health.lastBreakTime.getTime()) / (1000 * 60));
    }
  } else if (health.lastSessionStart) {
    // No break taken yet, count from session start
    timeSinceLastBreak = Math.floor((now.getTime() - health.lastSessionStart.getTime()) / (1000 * 60));
  } else {
    // No session start time, can't calculate
    return { shouldShow: false, timeSinceLastBreak: 0, timeSinceLastReminder: 0 };
  }
  
  // Calculate time since last reminder
  const lastReminderTime = health.lastBreakReminder || new Date(0);
  const timeSinceLastReminder = Math.floor((now.getTime() - lastReminderTime.getTime()) / (1000 * 60));
  
  // Show reminder if:
  // 1. It's been longer than the break interval since last break
  // 2. It's been at least 5 minutes since last reminder (to avoid spam)
  const shouldShow = timeSinceLastBreak >= breakInterval && timeSinceLastReminder >= 5;
  
  return {
    shouldShow,
    timeSinceLastBreak,
    timeSinceLastReminder,
    nextBreakIn: shouldShow ? 0 : Math.max(0, breakInterval - timeSinceLastBreak)
  };
};

// Method to start a break
UserSchema.methods.startBreak = function(): void {
  const now = new Date();
  
  if (!this.healthMonitoring) {
    this.healthMonitoring = {
      breakReminderEnabled: true,
      breakIntervalMinutes: 45,
      totalSessionTime: 0,
      breakCount: 0,
      healthTipsEnabled: true
    };
  }
  
  // Initialize session start time if not set
  if (!this.healthMonitoring.lastSessionStart) {
    this.healthMonitoring.lastSessionStart = now;
  }
  
  // Start break state
  this.healthMonitoring.isOnBreak = true;
  this.healthMonitoring.breakStartTime = now;
  this.healthMonitoring.lastBreakReminder = now;
  
  // Don't update breakCount or lastBreakTime yet - that happens when break ends
};

// Method to end a break
UserSchema.methods.endBreak = function(): void {
  const now = new Date();
  
  if (!this.healthMonitoring || !this.healthMonitoring.isOnBreak) {
    return; // Not on a break, nothing to do
  }
  
  // End break state and record the completed break
  this.healthMonitoring.isOnBreak = false;
  this.healthMonitoring.lastBreakTime = now;
  this.healthMonitoring.breakCount += 1;
  this.healthMonitoring.breakStartTime = undefined;
  
  // Don't reset session start time - the session continues after the break
  // Only reset session start if it's been more than 24 hours (handled in checkStatus)
};

// Legacy method for backward compatibility - now starts a break instead of completing one
UserSchema.methods.recordBreak = function(): void {
  this.startBreak();
};

// Method to get health tips
UserSchema.methods.getHealthTips = function(): string[] {
  const tips = [
    "💡 Try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds to give your eyes a break",
    "🤲 Don't forget to stretch your hands, wrists, and arms during breaks - your body will thank you later",
    "🚶 Get up and walk around for a few minutes every hour, even if it's just around your room",
    "💧 Keep a water bottle nearby and take sips regularly - it's easy to forget to hydrate when you're focused",
    "🌱 Adding a plant or two to your gaming space can help improve air quality and make it feel more relaxing",
    "💡 Make sure your room has good lighting - dim screens in dark rooms can really strain your eyes",
    "🎧 Keep your headphone volume at a comfortable level - your future self will appreciate you protecting your hearing",
    "🧘 When things get intense, take a moment to breathe deeply - it helps reduce tension and keeps you focused",
    "👁️ Remember to blink regularly while gaming - it's easy to forget and can lead to dry, tired eyes",
    "⏰ Set time limits for your gaming sessions and stick to them - balance is key to healthy gaming",
    "😴 Make sure you're getting enough sleep - gaming late into the night can mess with your sleep schedule",
    "🍎 Keep healthy snacks nearby instead of reaching for junk food - your body needs good fuel",
    "🪑 Check your posture every now and then - sit up straight and keep your screen at eye level",
    "👥 Don't forget to maintain friendships and activities outside of gaming - real-world connections matter too",
    "🏃 Try to balance gaming with other hobbies and physical activities - variety keeps life interesting"
  ];
  
  // Return 2-3 random tips
  const shuffled = tips.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

// Method to update daily streak
UserSchema.methods.updateStreak = function(): void {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Initialize streak if it doesn't exist
  if (!this.streak) {
    this.streak = {
      lastActivityDate: today,
      currentStreak: 1,
      longestStreak: 1
    };
    return;
  }
  
  const lastActivity = this.streak.lastActivityDate 
    ? new Date(this.streak.lastActivityDate)
    : null;
  
  if (!lastActivity) {
    // First time tracking - start streak at 1
    this.streak.lastActivityDate = today;
    this.streak.currentStreak = 1;
    this.streak.longestStreak = Math.max(this.streak.longestStreak || 0, 1);
    return;
  }
  
  const lastActivityDate = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
  const daysDifference = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDifference === 0) {
    // Same day - no change to streak
    return;
  } else if (daysDifference === 1) {
    // Consecutive day - increment streak
    this.streak.currentStreak = (this.streak.currentStreak || 0) + 1;
    this.streak.longestStreak = Math.max(this.streak.longestStreak || 0, this.streak.currentStreak);
  } else {
    // Streak broken - reset to 1
    this.streak.currentStreak = 1;
  }
  
  // Update last activity date
  this.streak.lastActivityDate = today;
};

// Method to ensure streak accurately reflects recent activity
UserSchema.methods.syncStreakStatus = async function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!this.streak) {
    this.streak = {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null
    };
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null
    };
  }

  const streak = this.streak;
  const lastActivityRaw = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;

  if (!lastActivityRaw) {
    return {
      currentStreak: streak.currentStreak || 0,
      longestStreak: streak.longestStreak || 0,
      lastActivityDate: null
    };
  }

  const lastActivityDate = new Date(
    lastActivityRaw.getFullYear(),
    lastActivityRaw.getMonth(),
    lastActivityRaw.getDate()
  );

  const dayDifference = Math.floor(
    (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let streakUpdated = false;

  if (dayDifference > 1 && (streak.currentStreak || 0) !== 0) {
    streak.currentStreak = 0;
    streakUpdated = true;
  }

  if (streakUpdated) {
    await this.updateOne({
      $set: { 'streak.currentStreak': streak.currentStreak }
    });
  }

  return {
    currentStreak: streak.currentStreak || 0,
    longestStreak: streak.longestStreak || 0,
    lastActivityDate: streak.lastActivityDate || null
  };
};

// Delete model from cache if it exists (handles hot-reload in Next.js)
if (mongoose.models.User) {
  delete mongoose.models.User;
}

// Create the model (with fallback for safety)
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;