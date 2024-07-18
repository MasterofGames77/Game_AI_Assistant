import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  question: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  conversations: [conversationSchema]
});

const User = mongoose.model('User', userSchema);
export default User;