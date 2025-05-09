import mongoose from 'mongoose';

const userViolationSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    unique: true 
  },
  violations: [{
    offendingWords: [String],
    content: String,
    timestamp: { 
      type: Date, 
      default: Date.now 
    }
  }],
  warningCount: {
    type: Number,
    default: 0
  },
  banCount: {
    type: Number,
    default: 0
  },
  banExpiresAt: {
    type: Date,
    default: null
  },
  isPermanentlyBanned: {
    type: Boolean,
    default: false
  }
});

const UserViolation = mongoose.models.UserViolation || mongoose.model('UserViolation', userViolationSchema);

export default UserViolation; 