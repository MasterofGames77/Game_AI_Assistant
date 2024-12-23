// import mongoose from 'mongoose';

// // Define the schema for individual posts within a forum topic
// const PostSchema = new mongoose.Schema({
//   userId: { type: String, required: true },    // The ID of the user who posted
//   message: { type: String, required: true },   // The content of the post
//   timestamp: { type: Date, default: Date.now } // When the post was created
// });

// // Define the schema for a forum topic
// const ForumSchema = new mongoose.Schema({
//   forumId: { type: String, required: true },       // Unique ID for the forum (specific to the game)
//   topicTitle: { type: String, required: true },    // Title of the conversation topic
//   posts: { type: [PostSchema], default: [] },      // Array of posts in the topic
//   isPrivate: { type: Boolean, default: false },    // Whether the conversation is private
//   allowedUsers: { type: [String], default: [] }    // List of userIds allowed to view private conversations
// }, {
//   timestamps: true  // Automatically add createdAt and updatedAt timestamps
// });

// // Export the Forum model
// export default mongoose.models.Forum || mongoose.model('Forum', ForumSchema);