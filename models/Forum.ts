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
  title: {
    type: String,
    required: true,
    trim: true,
  },
  isPrivate: { type: Boolean, default: false },
  allowedUsers: [{ type: String }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: { type: String, required: true },
  posts: [PostSchema],
  metadata: {
    totalPosts: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    viewCount: { type: Number, default: 0 },
    viewedBy: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'archived', 'locked'],
      default: 'active'
    }
  }
}, {
  timestamps: true
});

// Create compound indexes for better query performance
PostSchema.index({ userId: 1, timestamp: 1 });
TopicSchema.index({ allowedUsers: 1 });

// Create indexes for metadata fields that are frequently queried
ForumSchema.index({ 'metadata.gameTitle': 1 });
ForumSchema.index({ 'metadata.category': 1 });
ForumSchema.index({ 'metadata.tags': 1 });

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