import mongoose from 'mongoose';

// Define the schema for individual posts within a forum topic
const PostSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  userId: { type: String, required: true },
  message: { 
    type: String, 
    required: true,
    minlength: [1, 'Message cannot be empty'],
    maxlength: [5000, 'Message too long']
  },
  timestamp: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  metadata: {
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    editedBy: { type: String },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: String }],
    attachments: [{
      type: { type: String, enum: ['image', 'link', 'file'] },
      url: String,
      name: String
    }],
    status: { 
      type: String, 
      enum: ['active', 'hidden', 'deleted'],
      default: 'active'
    }
  }
});

// Define the schema for a forum topic
const TopicSchema = new mongoose.Schema({
  topicId: { 
    type: String, 
    required: true,
    index: true,
  },
  topicTitle: { 
    type: String, 
    required: true,
    minlength: [3, 'Title too short'],
    maxlength: [100, 'Title too long']
  },
  description: { type: String, maxlength: 500 },
  posts: [PostSchema],
  isPrivate: { type: Boolean, default: false },
  allowedUsers: [{ type: String }],
  createdBy: { type: String, required: true },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: -1
  },
  metadata: {
    lastPostAt: { type: Date },
    lastPostBy: { type: String },
    postCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['active', 'locked', 'archived'],
      default: 'active'
    }
  }
});

// Define the schema for a forum
const ForumSchema = new mongoose.Schema({
  forumId: {
    type: String,
    required: true,
    index: true
  },
  gameTitle: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  topics: [TopicSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: { type: String, required: true },
  metadata: {
    category: { type: String, required: true },
    tags: [{ type: String }],
    totalTopics: { type: Number, default: 0 },
    totalPosts: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    lastActiveUser: { type: String },
    viewCount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['active', 'maintenance', 'archived'],
      default: 'active'
    },
    moderators: [{ type: String }],
    settings: {
      allowNewTopics: { type: Boolean, default: true },
      requireApproval: { type: Boolean, default: false },
      maxTopicsPerUser: { type: Number, default: 10 },
      maxPostsPerTopic: { type: Number, default: 1000 }
    }
  }
}, {
  timestamps: true
});

// Add middleware to update metadata
ForumSchema.pre('save', function(this: any, next) {
  this.metadata.totalTopics = this.topics.length;
  this.metadata.totalPosts = this.topics.reduce((acc: number, topic: any) => {
    return acc + (topic.posts ? topic.posts.length : 0);
  }, 0);
  this.metadata.lastActivityAt = new Date();
  this.updatedAt = new Date();
  next();
});

// Create compound indexes for better query performance
PostSchema.index({ userId: 1, timestamp: 1 });
TopicSchema.index({ allowedUsers: 1 });

// Create indexes for metadata fields that are frequently queried
ForumSchema.index({ 'metadata.gameTitle': 1 });
ForumSchema.index({ 'metadata.category': 1 });
ForumSchema.index({ 'metadata.tags': 1 });

// Virtual for active topics
ForumSchema.virtual('activeTopics').get(function() {
  return this.topics.filter(topic => topic && topic.metadata && topic.metadata.status === 'active');
});

ForumSchema.methods.updateActivity = async function(userId: string) {
  this.metadata.lastActivityAt = new Date();
  this.metadata.lastActiveUser = userId;
  await this.save();
};

ForumSchema.methods.incrementViewCount = async function() {
  this.metadata.viewCount += 1;
  await this.save();
};

// Export the Forum model
const Forum = mongoose.models.Forum || mongoose.model('Forum', ForumSchema);
export default Forum;