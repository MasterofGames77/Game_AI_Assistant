import mongoose from 'mongoose';

// Check if model already exists before defining
const UserViolation = mongoose.models.UserViolation || mongoose.model('UserViolation', new mongoose.Schema({
  userId: { type: String, required: true },
  violations: [{
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    content: String,
    action: String,
    expiresAt: Date
  }]
}));

export default UserViolation; 