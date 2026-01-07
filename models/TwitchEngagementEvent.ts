import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for Twitch Engagement Events
 * Tracks engagement spikes (subs, follows, raids, hype moments) for contextual bot responses
 */
export interface ITwitchEngagementEvent extends Document {
  channelName: string; // Channel name (lowercase, no #)
  eventType: 'subscription' | 'follow' | 'raid' | 'hype_moment' | 'gift_subscription' | 'cheer';
  eventSource: 'eventsub' | 'chat_velocity' | 'api'; // How the event was detected
  
  // Event details
  username?: string; // User who triggered the event (for subs, follows, raids)
  displayName?: string; // Display name
  months?: number; // Subscription months (for resubs)
  tier?: string; // Subscription tier (1000, 2000, 3000)
  giftCount?: number; // Number of gift subs
  raidViewers?: number; // Number of raiders
  messageVelocity?: number; // Messages per minute during hype moment
  bits?: number; // Bits cheered
  
  // Engagement metrics at time of event
  activeViewers?: number; // Estimated active viewers
  chatActivity: number; // Messages in last minute
  engagementScore: number; // Calculated engagement score (0-100)
  
  // Response tracking
  botResponded: boolean; // Whether bot responded to this event
  responseMessage?: string; // The contextual prompt sent
  responseDelayMs?: number; // Time between event and response
  
  // Timestamps
  eventTimestamp: Date; // When the event occurred
  detectedAt: Date; // When we detected the event
  respondedAt?: Date; // When bot responded
  
  createdAt?: Date;
  updatedAt?: Date;
}

const twitchEngagementEventSchema = new Schema<ITwitchEngagementEvent>(
  {
    channelName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      enum: ['subscription', 'follow', 'raid', 'hype_moment', 'gift_subscription', 'cheer'],
      index: true
    },
    eventSource: {
      type: String,
      required: true,
      enum: ['eventsub', 'chat_velocity', 'api'],
      index: true
    },
    username: {
      type: String,
      required: false,
      lowercase: true
    },
    displayName: {
      type: String,
      required: false
    },
    months: {
      type: Number,
      required: false,
      min: 1
    },
    tier: {
      type: String,
      required: false,
      enum: ['1000', '2000', '3000', 'Prime']
    },
    giftCount: {
      type: Number,
      required: false,
      min: 1
    },
    raidViewers: {
      type: Number,
      required: false,
      min: 1
    },
    messageVelocity: {
      type: Number,
      required: false,
      min: 0
    },
    bits: {
      type: Number,
      required: false,
      min: 1
    },
    activeViewers: {
      type: Number,
      required: false,
      min: 0
    },
    chatActivity: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    engagementScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100
    },
    botResponded: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    responseMessage: {
      type: String,
      required: false
    },
    responseDelayMs: {
      type: Number,
      required: false,
      min: 0
    },
    eventTimestamp: {
      type: Date,
      required: true,
      index: true
    },
    detectedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    respondedAt: {
      type: Date,
      required: false
    }
  },
  {
    collection: 'twitchengagementevents',
    timestamps: true
  }
);

// Compound indexes for common queries
twitchEngagementEventSchema.index({ channelName: 1, eventTimestamp: -1 });
twitchEngagementEventSchema.index({ channelName: 1, eventType: 1, eventTimestamp: -1 });
twitchEngagementEventSchema.index({ channelName: 1, botResponded: 1, eventTimestamp: -1 });
twitchEngagementEventSchema.index({ eventTimestamp: -1 }); // For time-range queries

const TwitchEngagementEvent =
  mongoose.models.TwitchEngagementEvent ||
  mongoose.model<ITwitchEngagementEvent>('TwitchEngagementEvent', twitchEngagementEventSchema);

export default TwitchEngagementEvent;

