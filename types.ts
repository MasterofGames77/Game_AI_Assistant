import { Decimal128 } from 'mongoose';
import { ReactNode } from "react";

export interface Achievement {
  name: string;
  dateEarned: Date;
}

export interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

export interface State {
  hasError: boolean;
}

export interface Conversation {
  _id: string;
  username: string;
  question: string;
  response: string;
  timestamp: Date;
}

export interface SideBarProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (id: string) => void;
  onClear: () => void;
  onTwitchAuth: () => void;
  onNavigateToAccount: () => void;
  activeView: "chat" | "forum";
  setActiveView: (view: "chat" | "forum") => void;
  conversationCount: number;
}

export interface ProStatusProps {
  hasProAccess: boolean;
  username?: string | null;
}

export interface SubscriptionStatus {
  type:
    | "free_period"
    | "paid_active"
    | "canceled_active"
    | "expired_free"
    | "no_subscription";
  status: string;
  expiresAt?: Date;
  daysUntilExpiration?: number;
  canUpgrade?: boolean;
  canCancel?: boolean;
  canReactivate?: boolean;
  showWarning?: boolean;
}

export interface CleanupResult {
  totalUsers: number;
  expiredEarlyAccess: number;
  expiredPaidSubscriptions: number;
  updatedStatuses: number;
  errors: string[];
  timestamp: Date;
}

export interface UserViolation {
  type: string;
  timestamp: Date;
  content?: string;
  action?: string;
  expiresAt?: Date;
}

export interface Post {
  username: string;
  message: string;
  timestamp: Date;
}

export interface Forum {
  _id: string;
  forumId: string;
  title: string;
  gameTitle: string;
  category: string;
  isPrivate: boolean;
  allowedUsers: string[];
  posts: ForumPost[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata: ForumMetadata;
}

export interface ForumMetadata {
  totalPosts: number;
  lastActivityAt: Date;
  viewCount: number;
  status: 'active' | 'archived' | 'locked';
}

export interface ForumPost {
  _id: string;
  username: string;
  message: string;
  timestamp: Date;
  createdBy: string;
  likes: string[]; // Array of usernames who liked the post
  metadata: {
    edited: boolean;
    editedAt?: Date;
    editedBy?: string;
    likes?: number;
    likedBy?: string[];
  };
}

export interface DiscordRequest {
  user_id: string;
  guild_id: string;
  permissions: string;
}

export interface VerificationResponse {
  message: string;
  status: 'ALLOW' | 'DENY';
  userData?: {
    id: string;
    hasProAccess: boolean;
    roles?: string[];
  };
}

export interface ForumContextType {
  forums: Forum[];
  currentForum: Forum | null;
  loading: boolean;
  error: string | null;
  fetchForums: (page: number, limit: number) => Promise<Forum[]>;
  createForum: (forumData: Partial<Forum>) => Promise<Forum | null>;
  deleteForum: (forumId: string) => Promise<void>;
  addPost: (forumId: string, message: string) => Promise<void>;
  deletePost: (forumId: string, postId: string) => Promise<void>;
  likePost: (forumId: string, postId: string) => Promise<void>;
  updateForumUsers: (forumId: string, allowedUsers: string[]) => Promise<boolean>;
  setCurrentForum: (forum: Forum | null) => void;
  setError: (error: string | null) => void;
}

export interface ForumListProps {
  forumId: string;
}

export interface ContentCheckResult {
  isValid: boolean;
  error?: string;
  offendingWords?: string[];
  violationResult?: {
    action: 'warning' | 'banned' | 'permanent_ban';
    count?: number;
    expiresAt?: Date;
    message?: string;
    banCount?: number;
  };
}

export interface Metrics {
  initialMemory?: {
    heapTotal: string;
    heapUsed: string;
    rss: string;
    external: string;
  };
  finalMemory?: {
    heapTotal: string;
    heapUsed: string;
    rss: string;
    external: string;
  };
  dbConnection?: number;
  questionProcessing?: number;
  databaseMetrics?: {
    operation: string;
    executionTime: string;
    memoryUsed: string;
    result: any;
  };
  aiCacheMetrics?: any;
  responseSize?: {
    bytes: number;
    kilobytes: string;
  };
  requestRate?: {
    totalRequests: number;
    requestsPerSecond: string;
  };
  totalTime?: number;
}

// SplashDB User interface (from splash page backend)
export interface ISplashUser extends Document {
  email: string;
  userId: string;
  position: number | null;
  isApproved: boolean;
  hasProAccess: boolean;
}

export interface GameData {
  title: string;
  console: string;
  release_date: string;
  genre: string;
  developer: string;
  publisher: string;
  critic_score: Decimal128;
  total_sales: Decimal128;
  // Add other fields as necessary
}

export interface AchievementData {
  username: string;
  achievements: Array<{
    name: string;
    dateEarned: string;
  }>;
  isPro: boolean;
  message: string;
  totalAchievements: number;
}

export interface PrivateForumUserManagementProps {
  forumId: string;
  allowedUsers: string[];
  createdBy: string;
  currentUsername: string;
  onUsersUpdated: (newUsers: string[]) => void;
}

export interface CheckNewAchievementsRequest {
  username: string;
  lastChecked: string | null; // ISO string or null
}

export interface CheckNewAchievementsResponse {
  hasNewAchievements: boolean;
  username?: string;
  achievements?: Array<{
    name: string;
    dateEarned: string;
  }>;
  isPro?: boolean;
  message?: string;
  totalAchievements?: number;
  error?: string;
}

export interface UseAchievementPollingProps {
  username: string | null;
  isEnabled: boolean;
  pollingInterval?: number; // in milliseconds, default 30000 (30 seconds)
}

// Health monitoring interfaces
export interface HealthMonitoringProps {
  username: string | null;
  isEnabled: boolean;
  checkInterval?: number; // in milliseconds, default 60000 (1 minute)
}

export interface HealthStatus {
  shouldShowBreak: boolean;
  timeSinceLastBreak: number;
  nextBreakIn?: number;
  breakCount: number;
  isMonitoring: boolean;
}

export interface HealthStatusWidgetProps {
  healthStatus: HealthStatus;
  onRecordBreak: () => void;
  onSnoozeReminder: () => void;
}

export interface SnoozeReminderResponse {
  success: boolean;
  snoozeUntil?: Date;
  message?: string;
  error?: string;
}

export interface RecordBreakResponse {
  success: boolean;
  breakCount: number;
  message?: string;
  error?: string;
}

export interface HealthStatusResponse {
  shouldShowBreak: boolean;
  timeSinceLastBreak: number;
  nextBreakIn?: number;
  breakCount: number;
  showReminder: boolean;
  healthTips?: string[];
  error?: string;
}

export interface Progress {
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

// New subscription interface
export interface Subscription {
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
export interface UsageLimit {
  freeQuestionsUsed: number;        // Questions used in current window
  freeQuestionsLimit: number;       // Max questions per window (default: 7)
  windowStartTime: Date;           // When current window started
  windowDurationHours: number;     // Window duration (default: 1 hour)
  lastQuestionTime: Date;          // Last question timestamp
  cooldownUntil?: Date;            // When user can ask next question
}

// Health monitoring interface
export interface HealthMonitoring {
  breakReminderEnabled: boolean;   // Whether break reminders are enabled
  breakIntervalMinutes: number;    // Break interval in minutes (default: 45)
  lastBreakTime?: Date;           // Last time user took a break
  lastSessionStart?: Date;        // When current session started
  totalSessionTime: number;       // Total session time in minutes
  breakCount: number;             // Number of breaks taken today
  lastBreakReminder?: Date;       // Last time break reminder was shown
  healthTipsEnabled: boolean;     // Whether to show health tips
  ergonomicsReminders: boolean;   // Whether to show ergonomics reminders
}

export interface UpdateHealthSettingsResponse {
  success: boolean;
  message?: string;
  error?: string;
}