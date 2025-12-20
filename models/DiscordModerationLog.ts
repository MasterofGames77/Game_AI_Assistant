import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for Discord Moderation Log document
 * Stores all moderation actions for audit and review
 */
export interface IDiscordModerationLog extends Document {
  timestamp: Date;
  guildId: string; // Discord server (guild) ID
  discordUserId: string; // Discord user ID
  username?: string; // Username (for reference)
  violationType: 'offensive_content' | 'ai_inappropriate' | 'other';
  offendingWords: string[];
  messageContent?: string; // Original message (optional, may be truncated)
  actionTaken: 'warning' | 'timeout' | 'ban' | 'kick' | 'unban';
  duration?: number; // Duration in seconds (for timeouts)
  reason: string;
  totalViolations: number; // Total violation count at time of action
  success: boolean; // Whether the action was successful
  errorMessage?: string; // Error message if action failed
  createdAt?: Date;
  updatedAt?: Date;
}

const discordModerationLogSchema = new Schema<IDiscordModerationLog>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    guildId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    discordUserId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    username: {
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
      enum: ['warning', 'timeout', 'ban', 'kick', 'unban'],
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
    collection: 'discordmoderationlogs',
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Create indexes for common queries
discordModerationLogSchema.index({ guildId: 1, timestamp: -1 });
discordModerationLogSchema.index({ discordUserId: 1, timestamp: -1 });
discordModerationLogSchema.index({ actionTaken: 1, timestamp: -1 });
discordModerationLogSchema.index({ guildId: 1, discordUserId: 1, timestamp: -1 });
discordModerationLogSchema.index({ success: 1, timestamp: -1 }); // For finding failed actions

const DiscordModerationLog =
  mongoose.models.DiscordModerationLog ||
  mongoose.model<IDiscordModerationLog>('DiscordModerationLog', discordModerationLogSchema);

export default DiscordModerationLog;

