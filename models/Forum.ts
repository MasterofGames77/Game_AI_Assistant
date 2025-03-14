import mongoose from 'mongoose';

// Define the schema for individual posts within a forum topic
const PostSchema = new mongoose.Schema({
  userId: { type: String, required: true },    // The ID of the user who posted
  message: { type: String, required: true },   // The content of the post
  timestamp: { type: Date, default: Date.now }, // When the post was created
  createdBy: { type: String },
  metadata: {                   // Add metadata for posts
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    likes: { type: Number, default: 0 }
  }
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
    createdBy: { type: String },  // Add this
    createdAt: { type: Date, default: Date.now }
  }],
  metadata: {
    gameTitle: { type: String, required: true },
    category: { type: String, required: true },
    tags: [String],  // Add this back
    totalTopics: { type: Number, default: 0 },
    totalPosts: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    lastActiveUser: { type: String },
    viewCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Add middleware to update metadata
ForumSchema.pre('save', function(this: any, next) {
  // Update total topics
  this.metadata.totalTopics = this.topics.length;
  
  // Update total posts
  this.metadata.totalPosts = this.topics.reduce((acc: number, topic: any) => {
    return acc + (topic.posts ? topic.posts.length : 0);
  }, 0);
  
  // Update last activity
  this.metadata.lastActivityAt = new Date();
  
  next();
});

// Export the Forum model
const Forum = mongoose.models.Forum || mongoose.model('Forum', ForumSchema);
export default Forum;