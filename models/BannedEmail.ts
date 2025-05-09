import mongoose from 'mongoose';

const bannedEmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  bannedAt: {
    type: Date,
    default: Date.now
  },
  originalUserId: {
    type: String,
    required: true
  }
});

const BannedEmail = mongoose.models.BannedEmail || mongoose.model('BannedEmail', bannedEmailSchema);

export default BannedEmail; 