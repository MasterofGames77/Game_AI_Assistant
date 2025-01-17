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
  }]
}, {
  timestamps: true
});

// Export the Forum model
export default mongoose.models.Forum || mongoose.model('Forum', ForumSchema);