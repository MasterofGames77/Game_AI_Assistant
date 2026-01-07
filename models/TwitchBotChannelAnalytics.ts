import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for Twitch Bot Channel Analytics document
 * Stores daily/hourly aggregated statistics for fast queries and reporting
 * 
 * Note: When hour is null/undefined, this represents daily aggregation.
 *       When hour is 0-23, this represents hourly aggregation for that hour of the day.
 */
export interface ITwitchBotChannelAnalytics extends Document {
  channelName: string; // Channel name (lowercase, no #)
  date: Date; // Date for aggregation (stored as Date at midnight UTC for the day)
  hour?: number; // 0-23 for hourly aggregation (optional - null/undefined for daily)

  // Message Statistics
  totalMessages: number; // Total messages processed
  successfulMessages: number; // Successfully processed messages
  failedMessages: number; // Failed messages
  uniqueUsers: number; // Number of unique users who sent messages

  // Command Statistics
  helpCommandCount: number; // Number of !help commands
  commandsCommandCount: number; // Number of !commands commands
  questionCount: number; // Number of questions (non-command messages)

  // Performance Statistics
  avgProcessingTimeMs: number; // Average processing time in milliseconds
  avgResponseTimeMs: number; // Average AI response time in milliseconds
  cacheHitRate: number; // Cache hit rate (0-1, where 1 = 100%)

  // Error Statistics
  rateLimitHits: number; // Number of rate limit hits
  apiErrors: number; // Number of API errors
  moderationActions: number; // Number of moderation actions taken

  // User Engagement
  newUsers: number; // First-time users this period
  returningUsers: number; // Returning users this period

  // Engagement Events (new)
  engagementEvents: number; // Total engagement events (subs, follows, raids, etc.)
  subscriptionCount: number; // Number of subscriptions
  followCount: number; // Number of follows
  raidCount: number; // Number of raids
  hypeMoments: number; // Number of hype moments detected
  averageEngagementScore: number; // Average engagement score (0-100)

  createdAt?: Date; // Document creation timestamp
  updatedAt?: Date; // Document update timestamp
}

const twitchBotChannelAnalyticsSchema = new Schema<ITwitchBotChannelAnalytics>(
  {
    channelName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    hour: {
      type: Number,
      required: false,
      min: 0,
      max: 23,
      validate: {
        validator: function(value: number | undefined) {
          // hour must be integer if provided
          return value === undefined || (Number.isInteger(value) && value >= 0 && value <= 23);
        },
        message: 'Hour must be an integer between 0 and 23'
      }
    },
    // Message Statistics
    totalMessages: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    successfulMessages: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    failedMessages: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    uniqueUsers: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    // Command Statistics
    helpCommandCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    commandsCommandCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    questionCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    // Performance Statistics
    avgProcessingTimeMs: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    avgResponseTimeMs: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    cacheHitRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
      validate: {
        validator: function(value: number) {
          return value >= 0 && value <= 1;
        },
        message: 'Cache hit rate must be between 0 and 1'
      }
    },
    // Error Statistics
    rateLimitHits: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    apiErrors: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    moderationActions: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    // User Engagement
    newUsers: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    returningUsers: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    // Engagement Events
    engagementEvents: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    subscriptionCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    followCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    raidCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    hypeMoments: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    averageEngagementScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100
    }
  },
  {
    collection: 'twitchbotchannelanalytics',
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Create compound unique index on (channelName, date, hour) for fast lookups
// This ensures one aggregation record per channel per time period
// For daily aggregations (hour is null), we use a partial unique index
// For hourly aggregations (hour is 0-23), we use the same index
// Note: We need separate partial indexes because sparse unique indexes allow multiple nulls
twitchBotChannelAnalyticsSchema.index(
  { channelName: 1, date: 1, hour: 1 },
  { 
    unique: true,
    partialFilterExpression: { hour: { $exists: true } } // Unique constraint only when hour exists
  }
);

// Unique index for daily aggregations (hour is null/undefined)
twitchBotChannelAnalyticsSchema.index(
  { channelName: 1, date: 1 },
  { 
    unique: true,
    partialFilterExpression: { hour: { $exists: false } } // Unique constraint only when hour doesn't exist
  }
);

// Index on date for time-range queries
twitchBotChannelAnalyticsSchema.index({ date: -1 });

// Compound index for channel + date queries (common for channel-specific analytics)
twitchBotChannelAnalyticsSchema.index({ channelName: 1, date: -1 });

// Compound index for channel + date + hour queries (for hourly analytics)
twitchBotChannelAnalyticsSchema.index({ channelName: 1, date: -1, hour: 1 });

const TwitchBotChannelAnalytics =
  mongoose.models.TwitchBotChannelAnalytics ||
  mongoose.model<ITwitchBotChannelAnalytics>('TwitchBotChannelAnalytics', twitchBotChannelAnalyticsSchema);

export default TwitchBotChannelAnalytics;

