import tmi from 'tmi.js';
import connectToMongoDB from '../mongodb';
import TwitchEngagementEvent, { ITwitchEngagementEvent } from '../../models/TwitchEngagementEvent';
import { logger } from '../logger';
import { EngagementConfig, MessageTimestamp } from '../../types';

const defaultConfig: EngagementConfig = {
  hypeMomentThreshold: 20, // 20 messages per minute = hype moment
  hypeMomentWindowMs: 60000, // 1 minute window
  hypeMomentCooldownMs: 300000, // 5 minute cooldown
  baseEngagementScore: 10,
  subscriptionMultiplier: 5,
  raidMultiplier: 4,
  followMultiplier: 1,
  hypeMomentMultiplier: 2,
  autoRespond: true,
  responseDelayMs: 2000 // 2 second delay
};

/**
 * Engagement Tracker
 * Tracks engagement spikes and triggers contextual responses
 */
export class EngagementTracker {
  private client: tmi.Client;
  private config: EngagementConfig;
  
  // Per-channel message tracking for velocity calculation
  private messageHistory: Map<string, MessageTimestamp[]> = new Map();
  
  // Per-channel last hype moment detection (for cooldown)
  private lastHypeMoment: Map<string, number> = new Map();
  
  // Per-channel engagement scores (rolling window)
  private engagementScores: Map<string, number[]> = new Map();
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(client: tmi.Client, config?: Partial<EngagementConfig>) {
    this.client = client;
    this.config = { ...defaultConfig, ...config };
    this.setupEventHandlers();
    this.startCleanupTask();
  }
  
  /**
   * Start periodic cleanup task
   */
  private startCleanupTask(): void {
    // Clean up every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 600000); // 10 minutes
  }
  
  /**
   * Stop cleanup task (call on shutdown)
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Setup event handlers for engagement tracking
   */
  private setupEventHandlers() {
    // Track all messages for velocity calculation
    this.client.on('message', (channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) => {
      if (self) return; // Ignore bot's own messages
      
      const normalizedChannel = channel.replace('#', '').toLowerCase();
      this.trackMessage(normalizedChannel, userstate.username || 'unknown');
      
      // Check for hype moment (async, don't block message processing)
      this.checkHypeMoment(normalizedChannel).catch(err => {
        logger.error('Error checking hype moment', {
          channel: normalizedChannel,
          error: err instanceof Error ? err.message : String(err)
        });
      });
    });
    
    // Note: Subscription, follow, and raid events are handled via EventSub webhooks
    // See pages/api/twitch/eventsub.ts for webhook handlers
  }
  
  /**
   * Track a message for velocity calculation
   */
  private trackMessage(channelName: string, username: string): void {
    const now = Date.now();
    const windowMs = this.config.hypeMomentWindowMs;
    
    // Get or create message history for this channel
    if (!this.messageHistory.has(channelName)) {
      this.messageHistory.set(channelName, []);
    }
    
    const history = this.messageHistory.get(channelName)!;
    
    // Add new message
    history.push({ timestamp: now, username });
    
    // Remove messages outside the window
    const cutoff = now - windowMs;
    const filtered = history.filter(msg => msg.timestamp >= cutoff);
    this.messageHistory.set(channelName, filtered);
  }
  
  /**
   * Calculate message velocity (messages per minute)
   */
  private calculateVelocity(channelName: string): number {
    const history = this.messageHistory.get(channelName) || [];
    if (history.length === 0) return 0;
    
    const now = Date.now();
    const windowMs = this.config.hypeMomentWindowMs;
    const cutoff = now - windowMs;
    
    // Count messages in the window
    const messagesInWindow = history.filter(msg => msg.timestamp >= cutoff).length;
    
    // Convert to messages per minute
    const velocity = (messagesInWindow / windowMs) * 60000;
    
    return Math.round(velocity * 100) / 100; // Round to 2 decimal places
  }
  
  /**
   * Check if we're in a hype moment (high chat velocity)
   */
  private async checkHypeMoment(channelName: string): Promise<void> {
    const velocity = this.calculateVelocity(channelName);
    
    // Check if velocity exceeds threshold
    if (velocity < this.config.hypeMomentThreshold) {
      return; // Not a hype moment
    }
    
    // Check cooldown
    const lastHype = this.lastHypeMoment.get(channelName) || 0;
    const now = Date.now();
    if (now - lastHype < this.config.hypeMomentCooldownMs) {
      return; // Still in cooldown
    }
    
    // Update last hype moment
    this.lastHypeMoment.set(channelName, now);
    
    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore('hype_moment', velocity);
    
    // Record the engagement event
    await this.recordEngagementEvent({
      channelName,
      eventType: 'hype_moment',
      eventSource: 'chat_velocity',
      messageVelocity: velocity,
      chatActivity: Math.round(velocity),
      engagementScore,
      eventTimestamp: new Date(now)
    });
    
    logger.info('Hype moment detected', {
      channel: channelName,
      velocity,
      engagementScore
    });
  }
  
  /**
   * Calculate engagement score for an event
   */
  private calculateEngagementScore(
    eventType: ITwitchEngagementEvent['eventType'],
    baseValue: number = 1
  ): number {
    let multiplier = 1;
    
    switch (eventType) {
      case 'subscription':
      case 'gift_subscription':
        multiplier = this.config.subscriptionMultiplier;
        break;
      case 'raid':
        multiplier = this.config.raidMultiplier;
        break;
      case 'follow':
        multiplier = this.config.followMultiplier;
        break;
      case 'hype_moment':
        multiplier = this.config.hypeMomentMultiplier;
        break;
      case 'cheer':
        multiplier = 1.5; // Bits are valuable but less than subs
        break;
    }
    
    return Math.min(100, this.config.baseEngagementScore * multiplier * baseValue);
  }
  
  /**
   * Record an engagement event
   */
  async recordEngagementEvent(eventData: {
    channelName: string;
    eventType: ITwitchEngagementEvent['eventType'];
    eventSource: ITwitchEngagementEvent['eventSource'];
    username?: string;
    displayName?: string;
    months?: number;
    tier?: string;
    giftCount?: number;
    raidViewers?: number;
    messageVelocity?: number;
    bits?: number;
    activeViewers?: number;
    chatActivity: number;
    engagementScore: number;
    eventTimestamp: Date;
  }): Promise<void> {
    try {
      await connectToMongoDB();
      
      const engagementEvent = await TwitchEngagementEvent.create({
        ...eventData,
        detectedAt: new Date(),
        botResponded: false
      });
      
      logger.info('Engagement event recorded', {
        channel: eventData.channelName,
        eventType: eventData.eventType,
        engagementScore: eventData.engagementScore,
        eventId: engagementEvent._id
      });
      
      // Trigger contextual response if enabled
      if (this.config.autoRespond) {
        // Delay response to avoid spam
        setTimeout(() => {
          this.triggerContextualResponse(engagementEvent._id.toString(), eventData).catch(err => {
            logger.error('Error triggering contextual response', {
              eventId: engagementEvent._id,
              error: err instanceof Error ? err.message : String(err)
            });
          });
        }, this.config.responseDelayMs);
      }
    } catch (error) {
      logger.error('Error recording engagement event', {
        channel: eventData.channelName,
        eventType: eventData.eventType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Trigger a contextual response to an engagement event
   */
  private async triggerContextualResponse(
    eventId: string,
    eventData: {
      channelName: string;
      eventType: ITwitchEngagementEvent['eventType'];
      username?: string;
      displayName?: string;
      months?: number;
      tier?: string;
      giftCount?: number;
      raidViewers?: number;
      messageVelocity?: number;
      bits?: number;
    }
  ): Promise<void> {
    try {
      const responseMessage = this.generateContextualPrompt(eventData);
      
      if (!responseMessage) {
        return; // No response needed for this event type
      }
      
      // Send message to channel
      const channel = `#${eventData.channelName}`;
      await this.client.say(channel, responseMessage);
      
      // Update engagement event with response
      await connectToMongoDB();
      const event = await TwitchEngagementEvent.findById(eventId);
      if (event) {
        const responseDelay = Date.now() - event.detectedAt.getTime();
        event.botResponded = true;
        event.responseMessage = responseMessage;
        event.responseDelayMs = responseDelay;
        event.respondedAt = new Date();
        await event.save();
      }
      
      logger.info('Contextual response sent', {
        channel: eventData.channelName,
        eventType: eventData.eventType,
        responseMessage: responseMessage.substring(0, 100)
      });
    } catch (error) {
      logger.error('Error triggering contextual response', {
        eventId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Generate contextual prompt based on engagement event
   */
  private generateContextualPrompt(eventData: {
    eventType: ITwitchEngagementEvent['eventType'];
    username?: string;
    displayName?: string;
    months?: number;
    tier?: string;
    giftCount?: number;
    raidViewers?: number;
    messageVelocity?: number;
    bits?: number;
  }): string | null {
    const name = eventData.displayName || eventData.username || 'someone';
    
    switch (eventData.eventType) {
      case 'subscription':
        if (eventData.months && eventData.months > 1) {
          return `🎉 Thank you ${name} for ${eventData.months} months of support! Your loyalty means everything! 🎮✨`;
        } else {
          return `🎉 Welcome to the squad, ${name}! Thanks for subscribing! Let's game! 🎮✨`;
        }
        
      case 'gift_subscription':
        if (eventData.giftCount && eventData.giftCount > 1) {
          return `🎁 ${name} just gifted ${eventData.giftCount} subs! The community is growing! 🎮🔥`;
        } else {
          return `🎁 ${name} just gifted a sub! Spread the love! 🎮✨`;
        }
        
      case 'raid':
        if (eventData.raidViewers && eventData.raidViewers > 10) {
          return `⚔️ RAID INCOMING! ${eventData.raidViewers} raiders from ${name}! Let's show them some love! 🎮🔥`;
        } else {
          return `⚔️ ${name} is raiding with ${eventData.raidViewers || 'some'} viewers! Welcome, raiders! 🎮✨`;
        }
        
      case 'follow':
        return `👋 Welcome to the stream, ${name}! Thanks for the follow! 🎮✨`;
        
      case 'hype_moment':
        if (eventData.messageVelocity && eventData.messageVelocity > 30) {
          return `🔥 CHAT IS ON FIRE! ${Math.round(eventData.messageVelocity)} messages/min! Keep the energy going! 🎮💥`;
        } else {
          return `🔥 Chat is popping off! Love the energy! 🎮✨`;
        }
        
      case 'cheer':
        if (eventData.bits && eventData.bits >= 1000) {
          return `💎 ${name} just cheered ${eventData.bits} bits! Absolutely legendary! 🎮💎`;
        } else if (eventData.bits && eventData.bits >= 100) {
          return `💎 ${name} just cheered ${eventData.bits} bits! Thank you! 🎮✨`;
        } else {
          return `💎 ${name} just cheered ${eventData.bits} bits! 🎮✨`;
        }
        
      default:
        return null;
    }
  }
  
  /**
   * Get recent engagement events for a channel
   */
  async getRecentEngagementEvents(
    channelName: string,
    limit: number = 10
  ): Promise<ITwitchEngagementEvent[]> {
    try {
      await connectToMongoDB();
      
      const events = await TwitchEngagementEvent.find({
        channelName: channelName.toLowerCase()
      })
        .sort({ eventTimestamp: -1 })
        .limit(limit)
        .lean();
      
      return events as unknown as ITwitchEngagementEvent[];
    } catch (error) {
      logger.error('Error fetching engagement events', {
        channel: channelName,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
  
  /**
   * Get engagement statistics for a channel
   */
  async getEngagementStats(
    channelName: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number;
    byType: Record<string, number>;
    averageScore: number;
    peakEngagement: number;
    responseRate: number;
  }> {
    try {
      await connectToMongoDB();
      
      const events = await TwitchEngagementEvent.find({
        channelName: channelName.toLowerCase(),
        eventTimestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      const totalEvents = events.length;
      const byType: Record<string, number> = {};
      let totalScore = 0;
      let peakEngagement = 0;
      let respondedCount = 0;
      
      for (const event of events) {
        // Count by type
        byType[event.eventType] = (byType[event.eventType] || 0) + 1;
        
        // Track scores
        totalScore += event.engagementScore;
        if (event.engagementScore > peakEngagement) {
          peakEngagement = event.engagementScore;
        }
        
        // Track responses
        if (event.botResponded) {
          respondedCount++;
        }
      }
      
      return {
        totalEvents,
        byType,
        averageScore: totalEvents > 0 ? totalScore / totalEvents : 0,
        peakEngagement,
        responseRate: totalEvents > 0 ? respondedCount / totalEvents : 0
      };
    } catch (error) {
      logger.error('Error fetching engagement stats', {
        channel: channelName,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        totalEvents: 0,
        byType: {},
        averageScore: 0,
        peakEngagement: 0,
        responseRate: 0
      };
    }
  }
  
  /**
   * Clean up old message history (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = this.config.hypeMomentWindowMs * 2; // Keep 2x window for safety
    
    const channels = Array.from(this.messageHistory.keys());
    for (const channel of channels) {
      const history = this.messageHistory.get(channel);
      if (!history) continue;
      
      const cutoff = now - maxAge;
      const filtered = history.filter((msg: MessageTimestamp) => msg.timestamp >= cutoff);
      
      if (filtered.length === 0) {
        this.messageHistory.delete(channel);
      } else {
        this.messageHistory.set(channel, filtered);
      }
    }
  }
}

export type { EngagementConfig };

