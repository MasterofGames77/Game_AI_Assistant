import mongoose from 'mongoose';

// Define the schema for individual posts within a forum topic
const PostSchema = new mongoose.Schema({
  userId: { type: String, required: true },    // The ID of the user who posted
  message: { type: String, required: true },   // The content of the post
  timestamp: { type: Date, default: Date.now } // When the post was created
});

// Define the schema for a forum topic
const ForumSchema = new mongoose.Schema({
  _id: { type: String, required: true },         // Forum ID
  title: { type: String, required: true },       // Forum title
  topics: [{                                     // Array of topics within the forum
    _id: { type: String, required: true },
    topicTitle: { type: String, required: true },
    posts: [PostSchema],
    isPrivate: { type: Boolean, default: false },
    allowedUsers: [String],
    createdAt: { type: Date, default: Date.now }
  }],
  metadata: {
    totalTopics: { type: Number, default: 0 },
    totalPosts: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    lastActiveUser: { type: String },
    tags: [String],
    category: { type: String, required: true },
    viewCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Add middleware to update metadata
ForumSchema.pre('save', function(this: any, next) {
  this.metadata.totalTopics = this.topics.length;
  this.metadata.totalPosts = this.topics.reduce((acc: any, topic: any) => acc + topic.posts.length, 0);
  this.metadata.lastActivityAt = new Date();
  next();
});

// Export the Forum model
export default mongoose.models.Forum || mongoose.model('Forum', ForumSchema);