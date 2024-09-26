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
}

export interface ForumTopic {
  _id: string;
  forumId: string;
  topicTitle: string;
  posts: ForumPost[];
  isPrivate: boolean;
  allowedUsers: string[];
}

export interface ForumPost {
  userId: string;
  message: string;
  timestamp: Date;
}