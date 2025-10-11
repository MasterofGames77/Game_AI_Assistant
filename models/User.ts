import mongoose, { Document, Schema } from 'mongoose';

interface Progress {
  firstQuestion?: number;
  frequentAsker?: number;
  rpgEnthusiast?: number;
  bossBuster?: number;
  platformerPro?: number;
  survivalSpecialist?: number;
  strategySpecialist?: number;
  simulationSpecialist?: number;
  fightingFanatic?: number;
  actionAficionado?: number;
  battleRoyale?: number;
  sportsChampion?: number;
  adventureAddict?: number;
  shooterSpecialist?: number;
  puzzlePro?: number;
  racingRenegade?: number;
  stealthExpert?: number;
  horrorHero?: number;
  triviaMaster?: number;
  storySeeker?: number;
  beatEmUpBrawler?: number;
  rhythmMaster?: number;
  sandboxBuilder?: number;
  totalQuestions?: number;
  dailyExplorer?: number;
  speedrunner?: number;
  collectorPro?: number;
  dataDiver?: number;
  performanceTweaker?: number;
  conversationalist?: number;
  proAchievements: {
    gameMaster: number;
    speedDemon: number;
    communityLeader: number;
    achievementHunter: number;
    proStreak: number;
    expertAdvisor: number;
    genreSpecialist: number;
    proContributor: number;
  };
}

interface Achievement {
  name: string;
  dateEarned: Date;
}

// New subscription interface
interface Subscription {
  status: 'free_period' | 'active' | 'canceled' | 'past_due' | 'unpaid' | 'expired' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  // Early access specific fields
  earlyAccessGranted?: boolean;
  earlyAccessStartDate?: Date;
  earlyAccessEndDate?: Date;
  transitionToPaid?: boolean;
  // Payment details
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  billingCycle?: string;
}

// Usage limit interface for free users
interface UsageLimit {
  freeQuestionsUsed: number;        // Questions used in current window
  freeQuestionsLimit: number;       // Max questions per window (default: 7)
  windowStartTime: Date;           // When current window started
  windowDurationHours: number;     // Window duration (default: 1 hour)
  lastQuestionTime: Date;          // Last question timestamp
  cooldownUntil?: Date;            // When user can ask next question
}

export interface IUser extends Document {
  userId: string;
  username: string;
  email: string;
  password?: string; // Optional for backward compatibility with legacy users
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  requiresPasswordSetup?: boolean; // Flag for legacy users who need to set password
  conversationCount: number;
  hasProAccess: boolean;
  achievements: Achievement[];
  progress: Progress;
  subscription?: Subscription;
  usageLimit?: UsageLimit;
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

// Method to check if user has active Pro access
UserSchema.methods.hasActiveProAccess = function(): boolean {
  const now = new Date();
  
  // Check legacy hasProAccess flag (for users who were granted Pro access before subscription system)
  if (this.hasProAccess) {
    return true;
  }
  
  // Check early access period
  if (this.subscription?.earlyAccessGranted && 
      this.subscription?.earlyAccessEndDate && 
      this.subscription.earlyAccessEndDate > now) {
    return true;
  }
  
  // Check paid subscription
  if (this.subscription?.status === 'active' && 
      this.subscription?.currentPeriodEnd && 
      this.subscription.currentPeriodEnd > now) {
    return true;
  }
  
  // Check canceled subscription (still active until period end)
  if (this.subscription?.status === 'canceled' && 
      this.subscription?.cancelAtPeriodEnd && 
      this.subscription?.currentPeriodEnd && 
      this.subscription.currentPeriodEnd > now) {
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
  const now = new Date();
  
  // Pro users have unlimited access
  if (this.hasActiveProAccess()) {
    return {
      allowed: true,
      questionsRemaining: -1 // Unlimited
    };
  }
  
  // If no usage limit data, initialize it
  if (!this.usageLimit) {
    this.usageLimit = {
      freeQuestionsUsed: 0,
      freeQuestionsLimit: 10,
      windowStartTime: now,
      windowDurationHours: 1,
      lastQuestionTime: now
    };
    return {
      allowed: true,
      questionsRemaining: 7
    };
  }
  
  const usageLimit = this.usageLimit;
  const windowEndTime = new Date(usageLimit.windowStartTime.getTime() + (usageLimit.windowDurationHours * 60 * 60 * 1000));
  
  // Check if we're in cooldown period
  if (usageLimit.cooldownUntil && usageLimit.cooldownUntil > now) {
    return {
      allowed: false,
      reason: 'You are in cooldown period. Please wait before asking another question.',
      cooldownUntil: usageLimit.cooldownUntil,
      nextWindowReset: windowEndTime
    };
  }
  
  // Check if current window has expired
  if (now >= windowEndTime) {
    // Reset the window
    usageLimit.freeQuestionsUsed = 0;
    usageLimit.windowStartTime = now;
    usageLimit.cooldownUntil = undefined;
    
    return {
      allowed: true,
      questionsRemaining: usageLimit.freeQuestionsLimit
    };
  }
  
  // Check if user has reached the limit
  if (usageLimit.freeQuestionsUsed >= usageLimit.freeQuestionsLimit) {
    // Set cooldown until window resets
    usageLimit.cooldownUntil = windowEndTime;
    
    return {
      allowed: false,
      reason: `You've used all ${usageLimit.freeQuestionsLimit} free questions. Please wait 1 hour or upgrade to Pro for unlimited access.`,
      cooldownUntil: usageLimit.cooldownUntil,
      nextWindowReset: windowEndTime
    };
  }
  
  return {
    allowed: true,
    questionsRemaining: usageLimit.freeQuestionsLimit - usageLimit.freeQuestionsUsed
  };
};

// Method to record question usage
UserSchema.methods.recordQuestionUsage = function(): void {
  const now = new Date();
  
  // Pro users don't need to track usage
  if (this.hasActiveProAccess()) {
    return;
  }
  
  // Initialize usage limit if it doesn't exist
  if (!this.usageLimit) {
    this.usageLimit = {
      freeQuestionsUsed: 0,
      freeQuestionsLimit: 10,
      windowStartTime: now,
      windowDurationHours: 1,
      lastQuestionTime: now
    };
  }
  
  // Increment usage count
  this.usageLimit.freeQuestionsUsed += 1;
  this.usageLimit.lastQuestionTime = now;
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
  const now = new Date();
  
  // Pro users have unlimited access
  if (this.hasActiveProAccess()) {
    return {
      questionsUsed: 0,
      questionsRemaining: -1, // Unlimited
      questionsLimit: -1,
      isInCooldown: false,
      isProUser: true
    };
  }
  
  // If no usage limit data, return default
  if (!this.usageLimit) {
    return {
      questionsUsed: 0,
      questionsRemaining: 10,
      questionsLimit: 10,
      isInCooldown: false,
      isProUser: false
    };
  }
  
  const usageLimit = this.usageLimit;
  const windowEndTime = new Date(usageLimit.windowStartTime.getTime() + (usageLimit.windowDurationHours * 60 * 60 * 1000));
  const isInCooldown = usageLimit.cooldownUntil ? usageLimit.cooldownUntil > now : false;
  
  return {
    questionsUsed: usageLimit.freeQuestionsUsed,
    questionsRemaining: Math.max(0, usageLimit.freeQuestionsLimit - usageLimit.freeQuestionsUsed),
    questionsLimit: usageLimit.freeQuestionsLimit,
    windowResetTime: windowEndTime,
    cooldownUntil: usageLimit.cooldownUntil,
    isInCooldown,
    isProUser: false
  };
};

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;