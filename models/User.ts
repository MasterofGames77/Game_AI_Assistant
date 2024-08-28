import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  conversations: { type: Array, required: true },
}, { collection: 'userID' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;