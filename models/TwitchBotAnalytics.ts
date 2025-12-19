import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for Twitch Bot Analytics document
 * Stores detailed analytics data for each message event for analysis and reporting
 */
export interface ITwitchBotAnalytics extends Document {
  // Message Analytics
  messageId: string; // Unique identifier for the message event
  channelName: string; // Channel name (lowercase, no #)
  twitchUsername: string; // Twitch username (lowercase)
  displayName: string; // Display name (for reference)
  messageType: 'command' | 'question' | 'other';
  command?: string; // !help, !commands, etc.
  questionLength: number; // Length of the question/message
  responseLength: number; // Length of the AI response

  // Performance Metrics
  processingTimeMs: number; // Time to process message (excluding AI response)
  aiResponseTimeMs: number; // Time for AI to generate response
  totalTimeMs: number; // End-to-end time from receipt to response
  cacheHit: boolean; // Whether response was served from cache

  // Status
  success: boolean; // Whether message was successfully processed
  errorType?: string; // 'rate_limit', 'api_error', 'moderation', 'timeout', etc.
  errorMessage?: string; // Detailed error message if any

  // Moderation
  wasModerated: boolean; // Whether message was moderated
  moderationAction?: string; // 'warning', 'timeout', 'ban', etc.

  // Timestamps
  receivedAt: Date; // When message was received
  processedAt: Date; // When processing started
  respondedAt: Date; // When response was sent

  createdAt?: Date; // Document creation timestamp
  updatedAt?: Date; // Document update timestamp
}

const twitchBotAnalyticsSchema = new Schema<ITwitchBotAnalytics>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
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
      required: true,
      trim: true
    },
    messageType: {
      type: String,
      enum: ['command', 'question', 'other'],
      required: true,
      index: true
    },
    command: {
      type: String,
      required: false,
      trim: true
    },
    questionLength: {
      type: Number,
      required: true,
      min: 0
    },
    responseLength: {
      type: Number,
      required: true,
      min: 0
    },
    processingTimeMs: {
      type: Number,
      required: true,
      min: 0
    },
    aiResponseTimeMs: {
      type: Number,
      required: true,
      min: 0
    },
    totalTimeMs: {
      type: Number,
      required: true,
      min: 0
    },
    cacheHit: {
      type: Boolean,
      required: true,
      default: false
    },
    success: {
      type: Boolean,
      required: true,
      default: true,
      index: true
    },
    errorType: {
      type: String,
      required: false,
      trim: true
    },
    errorMessage: {
      type: String,
      required: false,
      maxlength: 1000 // Limit error message length
    },
    wasModerated: {
      type: Boolean,
      required: true,
      default: false
    },
    moderationAction: {
      type: String,
      required: false,
      trim: true
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    processedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    respondedAt: {
      type: Date,
      required: false // May not be set if message failed
    }
  },
  {
    collection: 'twitchbotanalytics',
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Create compound index on (channelName, receivedAt) for time-series queries
// This is the most important index for analytics queries
twitchBotAnalyticsSchema.index({ channelName: 1, receivedAt: -1 });

// Index on twitchUsername for user analytics
twitchBotAnalyticsSchema.index({ twitchUsername: 1, receivedAt: -1 });

// Index on messageType for command analytics
twitchBotAnalyticsSchema.index({ messageType: 1, receivedAt: -1 });

// Index on success for error rate analysis
twitchBotAnalyticsSchema.index({ success: 1, receivedAt: -1 });

// Compound index for channel + success queries (common for error analysis)
twitchBotAnalyticsSchema.index({ channelName: 1, success: 1, receivedAt: -1 });

// Compound index for channel + messageType queries (common for command analytics)
twitchBotAnalyticsSchema.index({ channelName: 1, messageType: 1, receivedAt: -1 });

// Compound index for user + channel queries (common for user analytics per channel)
twitchBotAnalyticsSchema.index({ channelName: 1, twitchUsername: 1, receivedAt: -1 });

// Index on cacheHit for cache performance analysis
twitchBotAnalyticsSchema.index({ cacheHit: 1, receivedAt: -1 });

// Index on wasModerated for moderation analytics
twitchBotAnalyticsSchema.index({ wasModerated: 1, receivedAt: -1 });

const TwitchBotAnalytics =
  mongoose.models.TwitchBotAnalytics ||
  mongoose.model<ITwitchBotAnalytics>('TwitchBotAnalytics', twitchBotAnalyticsSchema);

export default TwitchBotAnalytics;

