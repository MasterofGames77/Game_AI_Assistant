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

export interface Post {
  userId: string;
  message: string;
  timestamp: Date;
}

export interface Forum {
  _id: string;
  title: string;
  topics: ForumTopic[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ForumTopic {
  _id: string;
  forumId: string;
  gameTitle: string;
  category?: string;
  topicTitle: string;
  posts: Array<{ userId: string; message: string }>;
  createdBy: string;
  isPrivate: boolean;
  allowedUsers: string[];
  createdAt: Date;
}

export interface ForumPost {
  userId: string;
  message: string;
  timestamp: Date;
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