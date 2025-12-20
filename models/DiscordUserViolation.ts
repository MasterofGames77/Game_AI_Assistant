import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for a single violation record
 */
export interface IDiscordViolationRecord {
  offendingWords: string[];
  message: string;
  timestamp: Date;
  actionTaken: 'warning' | 'timeout' | 'ban' | 'kick';
  duration?: number; // Duration in seconds (for timeouts)
  reason?: string;
}

/**
 * Interface for Discord User Violation document
 * Tracks violations per Discord user per server
 */
export interface IDiscordUserViolation extends Document {
  discordUserId: string; // Discord user ID
  guildId: string; // Discord server (guild) ID
  violations: IDiscordViolationRecord[];
  warningCount: number;
  timeoutCount: number;
  kickCount: number;
  lastTimeoutAt?: Date;
  lastTimeoutDuration?: number; // Duration in seconds
  isBanned: boolean;
  bannedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const violationRecordSchema = new Schema<IDiscordViolationRecord>({
  offendingWords: {
    type: [String],
    required: true,
    default: []
  },
  message: {
    type: String,
    required: false // Optional - may not want to store full message
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  actionTaken: {
    type: String,
    enum: ['warning', 'timeout', 'ban', 'kick'],
    required: true
  },
  duration: {
    type: Number,
    required: false // Only for timeouts
  },
  reason: {
    type: String,
    required: false
  }
}, { _id: false }); // Don't create _id for subdocuments

const discordUserViolationSchema = new Schema<IDiscordUserViolation>(
  {
    discordUserId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    guildId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    violations: {
      type: [violationRecordSchema],
      default: []
    },
    warningCount: {
      type: Number,
      default: 0
    },
    timeoutCount: {
      type: Number,
      default: 0
    },
    kickCount: {
      type: Number,
      default: 0
    },
    lastTimeoutAt: {
      type: Date,
      required: false
    },
    lastTimeoutDuration: {
      type: Number,
      required: false // Duration in seconds
    },
    isBanned: {
      type: Boolean,
      default: false,
      index: true
    },
    bannedAt: {
      type: Date,
      required: false
    }
  },
  {
    collection: 'discorduserviolations',
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Create compound unique index on discordUserId + guildId
// This ensures one violation record per user per server
discordUserViolationSchema.index({ discordUserId: 1, guildId: 1 }, { unique: true });

// Create indexes for common queries
discordUserViolationSchema.index({ guildId: 1, isBanned: 1 });
discordUserViolationSchema.index({ discordUserId: 1, isBanned: 1 });
discordUserViolationSchema.index({ guildId: 1, warningCount: 1 });
discordUserViolationSchema.index({ guildId: 1, timeoutCount: 1 });

const DiscordUserViolation =
  mongoose.models.DiscordUserViolation ||
  mongoose.model<IDiscordUserViolation>('DiscordUserViolation', discordUserViolationSchema);

export default DiscordUserViolation;

