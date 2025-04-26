export interface Conversation {
  _id: string;
  userId: string;
  question: string;
  response: string;
  timestamp: Date;
}

export interface SideBarProps {
  userId: string;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: () => void;
  conversations: Conversation[];
}

export interface UserViolation {
  type: string;
  timestamp: Date;
  content?: string;
  action?: string;
  expiresAt?: Date;
}

export interface Post {
  userId: string;
  message: string;
  timestamp: Date;
}

export interface Forum {
  _id: string;
  forumId: string;
  title: string;
  description: string;
  topics: Topic[];
  metadata: ForumMetadata;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ForumMetadata {
  gameTitle: string;
  category: string;
  tags: string[];
  totalTopics: number;
  totalPosts: number;
  lastActivityAt: Date;
  viewCount: number;
  status: string;
  settings: ForumSettings;
  moderators: string[];
}

export interface ForumSettings {
  allowNewTopics: boolean;
  requireApproval: boolean;
  maxTopicsPerUser: number;
  maxPostsPerTopic: number;
}

export interface Topic {
  topicId: string;
  topicTitle: string;
  description: string;
  posts: ForumPost[];
  isPrivate: boolean;
  allowedUsers: string[];
  createdBy: string;
  createdAt: Date;
  metadata: TopicMetadata;
}

export interface TopicMetadata {
  lastPostAt: Date;
  lastPostBy: string;
  postCount: number;
  viewCount: number;
  status: string;
}

export interface ForumPost {
  userId: string;
  message: string;
  timestamp: Date;
  createdBy: string;
  metadata?: PostMetadata;
}

export interface PostMetadata {
  edited: boolean;
  editedBy?: string;
  editedAt?: Date;
  likes: number;
  status: string;
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
  topics: Topic[];
  loading: boolean;
  error: string | null;
  fetchForums: (page: number, limit: number) => Promise<Forum[]>;
  fetchTopics: (forumId: string) => Promise<void>;
  addPost: (forumId: string, topicId: string, message: string) => Promise<void>;
  createTopic: (forumId: string, topicData: Partial<Topic>) => Promise<void>;
  deleteTopic: (forumId: string, topicId: string) => Promise<void>;
  deleteForum: (forumId: string) => Promise<void>;
  setCurrentForum: (forum: Forum | null) => void;
  setError: (error: string | null) => void;
}

export interface ForumListProps {
  forumId: string;
  initialTopics?: Topic[];
}