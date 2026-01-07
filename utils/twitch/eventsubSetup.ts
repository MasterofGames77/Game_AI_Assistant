import axios from 'axios';
import { logger } from '../logger';

/**
 * Twitch EventSub Subscription Setup
 * 
 * This utility helps set up EventSub webhooks for engagement tracking.
 * 
 * To use:
 * 1. Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in environment variables
 * 2. Set TWITCH_EVENTSUB_SECRET (generate a random secret for webhook verification)
 * 3. Set your webhook callback URL (e.g., https://yourdomain.com/api/twitch/eventsub)
 * 4. Call setupEventSubSubscriptions() with the broadcaster user IDs you want to track
 */

const TWITCH_API_BASE = 'https://api.twitch.tv/helix';
const CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const WEBHOOK_SECRET = process.env.TWITCH_EVENTSUB_SECRET;
const WEBHOOK_CALLBACK_URL = process.env.TWITCH_EVENTSUB_CALLBACK_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://assistant.videogamewingman.com/api/twitch/eventsub'
    : 'http://localhost:3000/api/twitch/eventsub');

/**
 * Get app access token (client credentials flow)
 */
async function getAppAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set');
  }
  
  const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials'
    }
  });
  
  return response.data.access_token;
}

/**
 * Create an EventSub subscription
 */
async function createEventSubSubscription(
  accessToken: string,
  subscriptionType: string,
  broadcasterUserId: string,
  condition: Record<string, string> = {}
): Promise<{ id: string; status: string }> {
  if (!WEBHOOK_SECRET) {
    throw new Error('TWITCH_EVENTSUB_SECRET must be set');
  }
  
  // Build condition based on subscription type
  let subscriptionCondition: Record<string, string> = {};
  
  // Special handling for channel.raid - needs to_broadcaster_user_id
  if (subscriptionType === 'channel.raid') {
    subscriptionCondition = {
      to_broadcaster_user_id: broadcasterUserId,
      ...condition
    };
  } else {
    // Most subscriptions use broadcaster_user_id
    subscriptionCondition = {
      broadcaster_user_id: broadcasterUserId,
      ...condition
    };
  }
  
  const response = await axios.post(
    `${TWITCH_API_BASE}/eventsub/subscriptions`,
    {
      type: subscriptionType,
      version: '1',
      condition: subscriptionCondition,
      transport: {
        method: 'webhook',
        callback: WEBHOOK_CALLBACK_URL,
        secret: WEBHOOK_SECRET
      }
    },
    {
      headers: {
        'Client-Id': CLIENT_ID!,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    id: response.data.data[0].id,
    status: response.data.data[0].status
  };
}

/**
 * Get existing EventSub subscriptions
 */
async function getEventSubSubscriptions(
  accessToken: string,
  subscriptionType?: string
): Promise<any[]> {
  const params: any = {};
  if (subscriptionType) {
    params.type = subscriptionType;
  }
  
  const response = await axios.get(
    `${TWITCH_API_BASE}/eventsub/subscriptions`,
    {
      headers: {
        'Client-Id': CLIENT_ID!,
        'Authorization': `Bearer ${accessToken}`
      },
      params
    }
  );
  
  return response.data.data || [];
}

/**
 * Delete an EventSub subscription
 */
async function deleteEventSubSubscription(
  accessToken: string,
  subscriptionId: string
): Promise<void> {
  await axios.delete(
    `${TWITCH_API_BASE}/eventsub/subscriptions`,
    {
      headers: {
        'Client-Id': CLIENT_ID!,
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        id: subscriptionId
      }
    }
  );
}

/**
 * Set up EventSub subscriptions for a broadcaster
 * 
 * @param broadcasterUserId - Twitch user ID of the broadcaster
 * @param subscriptionTypes - Types of events to subscribe to (default: all engagement events)
 * @param userAccessToken - Optional (deprecated - not used, all subscriptions use app token)
 */
export async function setupEventSubSubscriptions(
  broadcasterUserId: string,
  subscriptionTypes: string[] = [
    'channel.subscribe',
    'channel.subscription.gift',
    'channel.raid',
    'channel.cheer'
  ],
  userAccessToken?: string // Deprecated - kept for backward compatibility but not used
): Promise<{ created: number; existing: number; errors: number }> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set');
  }
  
  if (!WEBHOOK_SECRET) {
    throw new Error('TWITCH_EVENTSUB_SECRET must be set');
  }
  
  try {
    // Get app access token for listing subscriptions
    const appAccessToken = await getAppAccessToken();
    
    // Get existing subscriptions
    const existing = await getEventSubSubscriptions(appAccessToken);
    const existingForBroadcaster = existing.filter(
      (sub: any) => 
        sub.condition?.broadcaster_user_id === broadcasterUserId ||
        sub.condition?.to_broadcaster_user_id === broadcasterUserId
    );
    
    let created = 0;
    let existingCount = 0;
    let errors = 0;
    
    // Set up each subscription type
    for (const subscriptionType of subscriptionTypes) {
      // Skip deprecated subscription types
      if (subscriptionType === 'channel.follow') {
        logger.warn('Skipping deprecated subscription type', {
          broadcasterUserId,
          subscriptionType,
          reason: 'channel.follow was deprecated by Twitch'
        });
        continue;
      }
      
      // Check if subscription already exists
      const alreadyExists = existingForBroadcaster.some(
        (sub: any) => sub.type === subscriptionType && sub.status === 'enabled'
      );
      
      if (alreadyExists) {
        existingCount++;
        logger.info('EventSub subscription already exists', {
          broadcasterUserId,
          subscriptionType
        });
        continue;
      }
      
      // All EventSub subscriptions must use app access token
      // The error "auth must use app access token to create webhook subscription" 
      // indicates that Twitch requires app tokens for creating webhook subscriptions
      // User tokens are only needed for certain API operations, not subscription creation
      const accessToken = appAccessToken;
      
      try {
        const result = await createEventSubSubscription(
          accessToken,
          subscriptionType,
          broadcasterUserId
        );
        
        created++;
        logger.info('EventSub subscription created', {
          broadcasterUserId,
          subscriptionType,
          subscriptionId: result.id,
          status: result.status
        });
      } catch (error: any) {
        errors++;
        logger.error('Error creating EventSub subscription', {
          broadcasterUserId,
          subscriptionType,
          error: error.response?.data || error.message,
          status: error.response?.status
        });
      }
    }
    
    return { created, existing: existingCount, errors };
  } catch (error) {
    logger.error('Error setting up EventSub subscriptions', {
      broadcasterUserId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Remove all EventSub subscriptions for a broadcaster
 */
export async function removeEventSubSubscriptions(
  broadcasterUserId: string
): Promise<{ removed: number; errors: number }> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set');
  }
  
  try {
    const accessToken = await getAppAccessToken();
    const existing = await getEventSubSubscriptions(accessToken);
    const subscriptionsToRemove = existing.filter(
      (sub: any) => sub.condition?.broadcaster_user_id === broadcasterUserId
    );
    
    let removed = 0;
    let errors = 0;
    
    for (const subscription of subscriptionsToRemove) {
      try {
        await deleteEventSubSubscription(accessToken, subscription.id);
        removed++;
        logger.info('EventSub subscription removed', {
          broadcasterUserId,
          subscriptionId: subscription.id,
          subscriptionType: subscription.type
        });
      } catch (error: any) {
        errors++;
        logger.error('Error removing EventSub subscription', {
          broadcasterUserId,
          subscriptionId: subscription.id,
          error: error.response?.data || error.message
        });
      }
    }
    
    return { removed, errors };
  } catch (error) {
    logger.error('Error removing EventSub subscriptions', {
      broadcasterUserId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * List all EventSub subscriptions
 */
export async function listEventSubSubscriptions(): Promise<any[]> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set');
  }
  
  try {
    const accessToken = await getAppAccessToken();
    return await getEventSubSubscriptions(accessToken);
  } catch (error) {
    logger.error('Error listing EventSub subscriptions', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

