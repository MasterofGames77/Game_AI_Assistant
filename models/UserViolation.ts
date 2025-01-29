import mongoose from 'mongoose';

const UserViolationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  violations: [{
    content: String,
    offendingWords: [String],
    timestamp: { type: Date, default: Date.now }
  }],
  banExpiresAt: { type: Date, default: null, nullable: true },
  warningCount: { type: Number, default: 0 }
});

export default mongoose.model('UserViolation', UserViolationSchema); 