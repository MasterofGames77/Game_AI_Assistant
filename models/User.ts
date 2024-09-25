import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  conversationCount: { type: Number, required: true, default: 0 },  // Track the number of conversations
  hasProAccess: { type: Boolean, default: false },  // Whether the user has Pro Access
}, { collection: 'userID' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;