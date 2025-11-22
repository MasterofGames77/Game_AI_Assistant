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
  imageUrl?: string; // Optional image URL for questions with screenshots
}

export interface SideBarProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (id: string) => void;
  onClear: () => void;
  onTwitchAuth: () => void;
  onNavigateToAccount: () => void;
  activeView: "chat" | "forum" | "feedback";
  setActiveView: (view: "chat" | "forum" | "feedback") => void;
  conversationCount: number;
  onLoadMore?: (newConversations: Conversation[]) => void;
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
    attachments?: Array<{
      type: 'image' | 'link' | 'file';
      url: string;
      name: string;
    }>;
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
  addPost: (forumId: string, message: string, imageFiles?: File[]) => Promise<void>;
  editPost: (forumId: string, postId: string, message: string, imageFiles?: File[], existingAttachments?: any[]) => Promise<void>;
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
  isOnBreak?: boolean;
  breakStartTime?: Date;
}

export interface HealthStatusWidgetProps {
  healthStatus: HealthStatus;
  onRecordBreak: () => void;
  onEndBreak: () => void;
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
  shouldShowHealthTips?: boolean;
  independentHealthTips?: string[];
  isOnBreak?: boolean;
  breakStartTime?: Date;
  lastBreakTime?: Date;
  breakIntervalMinutes?: number;
  lastSessionStart?: Date;
  error?: string;
}

// New interfaces for Phase 1 - Enhanced Recommendations
export interface PreferenceProfile {
  dominantGenres?: string[];
  learningStyle?: string;
  difficultyPreference?: string;
  playstyleTags?: string[];
  recentInterests?: string[];
  seasonalTrends?: string[];
}

export interface GameplayPatterns {
  avgQuestionsPerSession?: number;
  sessionFrequency?: 'daily' | 'weekly' | 'sporadic';
  difficultyProgression?: number[];
  genreDiversity?: number;
  engagementDepth?: number;
}

export interface RecommendationHistory {
  lastRecommendations?: Date;
  recommendedGames?: string[];
  acceptedSuggestions?: string[];
  declinedSuggestions?: string[];
  dismissedRecently?: boolean;
  lastAnalysisTime?: Date;
}

export interface PersonalizedData {
  preferenceProfile?: PreferenceProfile;
  gameplayPatterns?: GameplayPatterns;
  recommendationHistory?: RecommendationHistory;
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
  // NEW FIELD FOR PHASE 1 - Completely optional
  personalized?: PersonalizedData;
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
export interface TimerState {
  remainingSeconds: number;
  savedAt: Date;
  breakIntervalMinutes: number;
}

export interface HealthMonitoring {
  breakReminderEnabled: boolean;   // Whether break reminders are enabled
  breakIntervalMinutes: number;    // Break interval in minutes (default: 45)
  lastBreakTime?: Date;           // Last time user took a break
  lastSessionStart?: Date;        // When current session started
  totalSessionTime: number;       // Total session time in minutes
  breakCount: number;             // Number of breaks taken today
  lastBreakReminder?: Date;       // Last time break reminder was shown
  healthTipsEnabled: boolean;     // Whether to show health tips
  isOnBreak?: boolean;           // Whether user is currently on a break
  breakStartTime?: Date;          // When the current break started
  timerState?: TimerState;        // Server-side timer state for cross-browser persistence
}

export interface UpdateHealthSettingsResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface EarlyAccessSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetup: (username: string, password?: string) => Promise<void>;
  userEmail: string;
  userId: string;
}

export interface SubscriptionData {
  hasProAccess: boolean;
  subscriptionStatus: {
    type: string;
    status: string;
    expiresAt?: string;
    canCancel?: boolean;
  };
}

export interface AccountData {
  username: string;
  email: string;
  hasProAccess: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  conversationCount: number;
  achievements: Array<{ name: string; dateEarned: Date }>;
  progress: {
    totalQuestions: number;
    [key: string]: number;
  };
  hasPassword?: boolean;
  healthMonitoring?: HealthMonitoring;
}


// FeedbackForm.tsx:
export interface FeedbackFormProps {
  username: string | null;
  userType: "free" | "pro";
  onFeedbackSubmitted?: () => void;
}

export interface FeedbackFormData {
  category:
    | "bug_report"
    | "feature_request"
    | "improvement"
    | "general"
    | "complaint"
    | "praise";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
}

// MyFeedbackList.tsx:
export interface Feedback {
  feedbackId: string;
  category:
    | "bug_report"
    | "feature_request"
    | "improvement"
    | "general"
    | "complaint"
    | "praise";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "new" | "under_review" | "in_progress" | "resolved" | "closed";
  adminResponse?: string;
  adminResponseBy?: string;
  adminResponseAt?: Date;
  createdAt: string;
  updatedAt: string;
}

export interface MyFeedbackListProps {
  username: string | null;
}

// AdminFeedbackDashboard.tsx:
export interface DashboardStats {
  success: boolean;
  timeframe: {
    days: number;
    startDate: string;
    endDate: string;
  };
  overall: {
    totalFeedback: number;
    newFeedback: number;
    underReview: number;
    inProgress: number;
    resolved: number;
    closed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    proUsers: number;
    freeUsers: number;
    withResponses: number;
  };
  categories: {
    [key: string]: number;
  };
  topUsers: {
    feedbackId: string;
    username: string;
    title: string;
    status: string;
    createdAt: string;
  }[];
}

export interface AdminFeedbackDashboardProps {
  username: string | null;
}


// FeedbackList.tsx:
export interface Feedback {
  feedbackId: string;
  username: string;
  email: string;
  userType: "free" | "pro";
  category:
    | "bug_report"
    | "feature_request"
    | "improvement"
    | "general"
    | "complaint"
    | "praise";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "new" | "under_review" | "in_progress" | "resolved" | "closed";
  adminResponse?: string;
  adminResponseBy?: string;
  adminResponseAt?: Date;
  createdAt: string;
  updatedAt: string;
  metadata: {
    isRead: boolean;
    isArchived: boolean;
  };
}

export interface FeedbackListProps {
  username: string | null;
  onFeedbackSelect?: (feedback: Feedback) => void;
}


// FeedbackDetail.tsx:
export interface Feedback {
  feedbackId: string;
  username: string;
  email: string;
  userType: "free" | "pro";
  category:
    | "bug_report"
    | "feature_request"
    | "improvement"
    | "general"
    | "complaint"
    | "praise";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "new" | "under_review" | "in_progress" | "resolved" | "closed";
  adminResponse?: string;
  adminResponseBy?: string;
  adminResponseAt?: Date;
  createdAt: string;
  updatedAt: string;
  metadata: {
    isRead: boolean;
    isArchived: boolean;
  };
}

export interface FeedbackDetailProps {
  feedback: Feedback;
  username: string | null;
  onClose: () => void;
  onStatusUpdate?: () => void;
  onResponseSubmit?: () => void;
}


// FeedbackStats.tsx:
export interface StatsData {
  totalFeedback: number;
  newFeedback: number;
  underReview: number;
  inProgress: number;
  resolved: number;
  closed: number;
  criticalPriority: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  categoryBreakdown: {
    bug_report: number;
    feature_request: number;
    improvement: number;
    general: number;
    complaint: number;
    praise: number;
  };
  userTypeBreakdown: {
    free: number;
    pro: number;
  };
  timeRangeStats: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  responseStats: {
    totalResponses: number;
    averageResponseTime: number; // in hours
    responseRate: number; // percentage
  };
  trends: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
}

export interface FeedbackStatsProps {
  username: string | null;
}

export interface HealthTipsWidgetProps {
  tips: string[];
  onDismiss: () => void;
}

// Image Moderation:
export interface SafeSearchResult {
  adult: string;
  violence: string;
  racy: string;
  medical: string;
  spoof: string;
}

export interface ModerationResult {
  isApproved: boolean;
  isInappropriate: boolean;
  reasons: string[];
  safeSearch: SafeSearchResult;
  confidence: 'high' | 'medium' | 'low';
}

export interface ImageUploadRateLimit {
  username: string;
  uploadCount: number;
  windowStartTime: Date;
  lastUploadTime: Date;
}


// Automated Users:
export interface ScheduledTask {
  name: string;
  cronExpression: string;
  task: () => Promise<void>;
  isRunning: boolean;
}

export interface GameList {
  [genre: string]: string[];
}

export interface ActivityResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export interface ImageMapping {
  note?: string;
  games: {
    [gameTitle: string]: {
      images: string[];
      primary?: string;
    };
  };
}

/**
 * Load image usage tracking from JSON file
 */
export interface ImageUsage {
  note?: string;
  usage: {
    [username: string]: {
      [gameTitle: string]: string[]; // Array of image paths that have been used
    };
  };
}

export interface RecommendationsDisplayProps {
  username: string;
  recommendations: {
    strategyTips: {
      tips: string[];
      category: string;
    };
    learningPath: {
      suggestions: string[];
      nextSteps: string[];
    };
    personalizedTips: {
      tips: string[];
      basedOn: string;
    };
  };
  onDismiss?: () => void;
}

// Interface for stored timer data
export interface StoredTimerData {
  remainingSeconds: number;
  timestamp: number;
  sessionStartTime: number;
  breakIntervalMinutes: number;
}

export interface SaveTimerStateRequest {
  username: string;
  remainingSeconds: number;
  breakIntervalMinutes: number;
}

export interface CronTask {
  name: string;
  cronExpression: string;
  task: () => Promise<void>;
  isRunning: boolean;
  cronTask?: any; // The actual node-schedule job object
  lastRun?: Date;
  nextRun?: Date;
}

// Game Resume Interface:
export interface GameResumeResponse {
  game?: string;
  suggestion?: {
    type: 'challenge' | 'build' | 'achievement';
    title: string;
    description: string;
    questionPrompt: string;
  };
  error?: string;
}

export interface GameResumeData {
  game?: string;
  suggestion?: {
    type: 'challenge' | 'build' | 'achievement';
    title: string;
    description: string;
    questionPrompt: string;
  };
  error?: string;
}

export interface SmartGameResumeProps {
  username: string | null;
  onAskQuestion: (question: string) => void;
}

export interface UserContext {
  recentGames?: string[];
  topGenres?: string[];
  preferences?: {
    dominantGenres?: string[];
    learningStyle?: string;
    difficultyPreference?: string;
    playstyleTags?: string[];
    recentInterests?: string[];
  };
  activity?: {
    lastQuestionTime?: Date | string;
    questionsToday?: number;
    questionsThisWeek?: number;
    peakActivityHours?: number[]; // Hours of day (0-23) when user is most active
  };
  questionPatterns?: {
    commonCategories?: string[]; // Most common questionCategory values
    commonInteractionTypes?: string[]; // Most common interactionType values
    recentQuestionTypes?: string[]; // Recent question patterns (e.g., "how to", "best", "tips")
  };
}

export interface QuickTemplatesProps {
  username: string | null;
  onSelectTemplate: (question: string) => void;
}

export interface Template {
  id: string;
  label: string;
  question: string;
  icon: string;
  color: string;
  category: "general" | "game" | "genre" | "challenge";
  game?: string; // For game-specific templates
  genre?: string; // For genre-specific templates
  priority?: number; // Calculated priority score for smart suggestions
  matchReason?: string; // Why this template was prioritized
}

export interface UserContextResponse {
  recentGames?: string[];
  topGenres?: string[];
  preferences?: {
    dominantGenres?: string[];
    learningStyle?: string;
    difficultyPreference?: string;
    playstyleTags?: string[];
    recentInterests?: string[];
  };
  activity?: {
    lastQuestionTime?: Date | string;
    questionsToday?: number;
    questionsThisWeek?: number;
    peakActivityHours?: number[];
  };
  questionPatterns?: {
    commonCategories?: string[];
    commonInteractionTypes?: string[];
    recentQuestionTypes?: string[];
  };
  error?: string;
}