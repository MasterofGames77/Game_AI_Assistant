import mongoose, { Document, Schema } from 'mongoose';
import { TwitchModerationConfig } from '../config/twitchModerationConfig';

export interface ITwitchBotChannel extends Document {
  channelName: string; // Twitch channel name (lowercase, no #)
  streamerTwitchId: string; // Streamer's Twitch user ID
  streamerUsername: string; // Streamer's Video Game Wingman username
  isActive: boolean; // Whether bot is enabled in this channel
  addedAt: Date;
  accessToken?: string; // Streamer's OAuth token (for channel-specific permissions)
  refreshToken?: string; // Streamer's refresh token
  lastJoinedAt?: Date; // Last time bot successfully joined the channel
  lastLeftAt?: Date; // Last time bot left the channel
  messageCount?: number; // Total messages processed in this channel
  moderationConfig?: TwitchModerationConfig; // Per-channel moderation settings
  createdAt?: Date;
  updatedAt?: Date;
}

const TwitchBotChannelSchema = new Schema<ITwitchBotChannel>(
  {
    channelName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true, // Each channel can only be registered once (creates index automatically)
    },
    streamerTwitchId: {
      type: String,
      required: true,
      index: true,
    },
    streamerUsername: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    accessToken: {
      type: String,
      required: false, // Optional - bot can use its own token for basic operations
    },
    refreshToken: {
      type: String,
      required: false,
    },
    lastJoinedAt: {
      type: Date,
      required: false,
    },
    lastLeftAt: {
      type: Date,
      required: false,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    moderationConfig: {
      type: {
        enabled: { type: Boolean, default: true },
        strictMode: { type: Boolean, default: false },
        timeoutDurations: {
          first: { type: Number, default: 0 },
          second: { type: Number, default: 300 },
          third: { type: Number, default: 1800 },
          fourth: { type: Number, default: 3600 },
        },
        maxViolationsBeforeBan: { type: Number, default: 5 },
        checkAIResponses: { type: Boolean, default: true },
        logAllActions: { type: Boolean, default: true },
      },
      required: false,
    },
  },
  {
    collection: 'twitchbotchannels',
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Create indexes for common queries
TwitchBotChannelSchema.index({ isActive: 1, channelName: 1 });
TwitchBotChannelSchema.index({ streamerUsername: 1, isActive: 1 });
// Note: channelName index is automatically created by unique: true in schema

const TwitchBotChannel =
  mongoose.models.TwitchBotChannel ||
  mongoose.model<ITwitchBotChannel>('TwitchBotChannel', TwitchBotChannelSchema);

export default TwitchBotChannel;

