import { Decimal128 } from 'mongoose';
import { ReactNode } from "react";

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
  onResetUserId: () => void;
  onTwitchAuth: () => void;
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
  isProOnly: boolean;
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
  userId: string;
  achievements: { name: string; dateEarned: Date }[];
  isPro?: boolean;
  totalAchievements?: number;
}