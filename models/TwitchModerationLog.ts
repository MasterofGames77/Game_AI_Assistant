import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for Twitch Moderation Log document
 * Stores all moderation actions for audit and review
 */
export interface ITwitchModerationLog extends Document {
  timestamp: Date;
  channelName: string; // Channel name (lowercase, no #)
  twitchUsername: string; // Twitch username (lowercase)
  displayName?: string; // Display name (for reference)
  violationType: 'offensive_content' | 'ai_inappropriate' | 'other';
  offendingWords: string[];
  messageContent?: string; // Original message (optional, may be truncated)
  actionTaken: 'warning' | 'timeout' | 'ban' | 'unban';
  duration?: number; // Duration in seconds (for timeouts)
  reason: string;
  totalViolations: number; // Total violation count at time of action
  success: boolean; // Whether the action was successful
  errorMessage?: string; // Error message if action failed
  createdAt?: Date;
  updatedAt?: Date;
}

const twitchModerationLogSchema = new Schema<ITwitchModerationLog>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    channelName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    twitchUsername: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    displayName: {
      type: String,
      required: false,
      trim: true
    },
    violationType: {
      type: String,
      enum: ['offensive_content', 'ai_inappropriate', 'other'],
      required: true,
      default: 'offensive_content',
      index: true
    },
    offendingWords: {
      type: [String],
      required: true,
      default: []
    },
    messageContent: {
      type: String,
      required: false,
      maxlength: 500 // Limit message length in logs
    },
    actionTaken: {
      type: String,
      enum: ['warning', 'timeout', 'ban', 'unban'],
      required: true,
      index: true
    },
    duration: {
      type: Number,
      required: false // Only for timeouts
    },
    reason: {
      type: String,
      required: true
    },
    totalViolations: {
      type: Number,
      required: true,
      default: 0
    },
    success: {
      type: Boolean,
      required: true,
      default: true
    },
    errorMessage: {
      type: String,
      required: false
    }
  },
  {
    collection: 'twitchmoderationlogs',
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Create indexes for common queries
twitchModerationLogSchema.index({ channelName: 1, timestamp: -1 });
twitchModerationLogSchema.index({ twitchUsername: 1, timestamp: -1 });
twitchModerationLogSchema.index({ actionTaken: 1, timestamp: -1 });
twitchModerationLogSchema.index({ channelName: 1, twitchUsername: 1, timestamp: -1 });
twitchModerationLogSchema.index({ success: 1, timestamp: -1 }); // For finding failed actions

const TwitchModerationLog =
  mongoose.models.TwitchModerationLog ||
  mongoose.model<ITwitchModerationLog>('TwitchModerationLog', twitchModerationLogSchema);

export default TwitchModerationLog;

