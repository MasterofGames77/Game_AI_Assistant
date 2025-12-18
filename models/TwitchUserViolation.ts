import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for a single violation record
 */
export interface IViolationRecord {
  offendingWords: string[];
  message: string;
  timestamp: Date;
  actionTaken: 'warning' | 'timeout' | 'ban';
  duration?: number; // Duration in seconds (for timeouts)
  reason?: string;
}

/**
 * Interface for Twitch User Violation document
 * Tracks violations per Twitch user per channel
 */
export interface ITwitchUserViolation extends Document {
  twitchUsername: string; // Twitch username (lowercase)
  channelName: string; // Channel name (lowercase, no #)
  violations: IViolationRecord[];
  warningCount: number;
  timeoutCount: number;
  lastTimeoutAt?: Date;
  lastTimeoutDuration?: number; // Duration in seconds
  isBanned: boolean;
  bannedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const violationRecordSchema = new Schema<IViolationRecord>({
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
    enum: ['warning', 'timeout', 'ban'],
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

const twitchUserViolationSchema = new Schema<ITwitchUserViolation>(
  {
    twitchUsername: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    channelName: {
      type: String,
      required: true,
      lowercase: true,
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
    collection: 'twitchuserviolations',
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Create compound unique index on twitchUsername + channelName
// This ensures one violation record per user per channel
twitchUserViolationSchema.index({ twitchUsername: 1, channelName: 1 }, { unique: true });

// Create indexes for common queries
twitchUserViolationSchema.index({ channelName: 1, isBanned: 1 });
twitchUserViolationSchema.index({ twitchUsername: 1, isBanned: 1 });
twitchUserViolationSchema.index({ channelName: 1, warningCount: 1 });
twitchUserViolationSchema.index({ channelName: 1, timeoutCount: 1 });

const TwitchUserViolation =
  mongoose.models.TwitchUserViolation ||
  mongoose.model<ITwitchUserViolation>('TwitchUserViolation', twitchUserViolationSchema);

export default TwitchUserViolation;

