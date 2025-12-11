import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read raw body from request stream
function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    return res.status(400).json({ message: 'Missing signature or webhook secret' });
  }

  let event: Stripe.Event;

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Webhook signature verification failed:', errorMessage);
    
    // Log more details in debug mode
    if (process.env.WEBHOOK_DEBUG === 'true') {
      console.error('[WEBHOOK DEBUG] Signature header:', sig);
      console.error('[WEBHOOK DEBUG] Has endpoint secret:', !!endpointSecret);
    }
    
    return res.status(400).json({ message: 'Invalid signature' });
  }

  try {
    await connectToWingmanDB();

    // Enable logging for testing - set WEBHOOK_DEBUG=true in .env to enable
    const isDebugMode = process.env.WEBHOOK_DEBUG === 'true';
    if (isDebugMode) {
      console.log(`[WEBHOOK DEBUG] Processing webhook event: ${event.type}`);
      console.log(`[WEBHOOK DEBUG] Event ID: ${event.id}`);
    }

    switch (event.type) {
      case 'customer.subscription.created':
        // console.log('Handling subscription created'); // Commented out for production
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        // console.log('Handling subscription updated'); // Commented out for production
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        // console.log('Handling subscription deleted'); // Commented out for production
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        // console.log('Handling payment succeeded'); // Commented out for production
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      
      case 'invoice.payment_failed':
        // console.log('Handling payment failed'); // Commented out for production
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        const isDebugMode = process.env.WEBHOOK_DEBUG === 'true';
        if (isDebugMode) {
          console.log(`[WEBHOOK DEBUG] Unhandled event type: ${event.type}`);
        }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Webhook processing error:', errorMessage);
    if (process.env.WEBHOOK_DEBUG === 'true' && errorStack) {
      console.error('[WEBHOOK DEBUG] Stack trace:', errorStack);
    }
    
    res.status(500).json({ message: 'Webhook processing failed' });
  }
}

// Payment Prevention for Free Period Users
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const username = subscription.metadata?.username;
  const transitionFromFree = subscription.metadata?.transitionFromFree === 'true';
  const transitionFromExpired = subscription.metadata?.transitionFromExpired === 'true';

  if (!userId || !username) {
    console.error('Missing user metadata in subscription:', subscription.id);
    return;
  }

  // Find user
  const user = await User.findOne({
    $or: [{ userId }, { username }]
  });

  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  // Check if user is in early access period and shouldn't be charged
  if (user.subscription?.earlyAccessGranted && 
      user.subscription?.earlyAccessEndDate && 
      user.subscription.earlyAccessEndDate > new Date() &&
      !transitionFromFree && 
      !transitionFromExpired) {
    
    // console.log(`Preventing charge for early access user: ${username}`); // Commented out for production
    
    // Cancel the subscription immediately
    await stripe.subscriptions.cancel(subscription.id);
    
    // Update user record to prevent future charges
    await User.findOneAndUpdate(
      { _id: user._id },
      {
        'subscription.transitionToPaid': false,
        'subscription.status': 'free_period'
      }
    );
    
    // console.log(`Subscription ${subscription.id} canceled for early access user ${username}`); // Commented out for production
    return;
  }

     // Normal subscription processing for eligible users
   await User.findOneAndUpdate(
     { _id: user._id },
     {
       'subscription.stripeSubscriptionId': subscription.id,
       'subscription.stripeCustomerId': subscription.customer as string,
       'subscription.status': subscription.status,
       'subscription.currentPeriodStart': new Date((subscription as any).current_period_start * 1000),
       'subscription.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000),
       'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
       'subscription.amount': subscription.items.data[0]?.price.unit_amount || 99,
       'subscription.currency': subscription.currency,
       'subscription.billingCycle': 'monthly',
       hasProAccess: true
     }
   );

  // console.log(`Subscription ${subscription.id} processed for user ${username}`); // Commented out for production
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const username = subscription.metadata?.username;

  if (!userId || !username) {
    console.error('Missing user metadata in subscription update:', subscription.id);
    return;
  }

  // Find user
  const user = await User.findOne({
    $or: [{ userId }, { username }]
  });

  if (!user) {
    console.error('User not found for subscription update:', subscription.id);
    return;
  }

     // Update subscription data
   await User.findOneAndUpdate(
     { _id: user._id },
     {
       'subscription.status': subscription.status,
       'subscription.currentPeriodStart': new Date((subscription as any).current_period_start * 1000),
       'subscription.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000),
       'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
       hasProAccess: subscription.status === 'active' || 
                    (subscription.status === 'canceled' && subscription.cancel_at_period_end)
     }
   );

  // console.log(`Subscription ${subscription.id} updated for user ${username}`); // Commented out for production
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const username = subscription.metadata?.username;

  if (!userId || !username) {
    console.error('Missing user metadata in subscription deletion:', subscription.id);
    return;
  }

  // Find user
  const user = await User.findOne({
    $or: [{ userId }, { username }]
  });

  if (!user) {
    console.error('User not found for subscription deletion:', subscription.id);
    return;
  }

  // Update user subscription status
  await User.findOneAndUpdate(
    { _id: user._id },
    {
      'subscription.status': 'canceled',
      'subscription.canceledAt': new Date(),
      hasProAccess: false
    }
  );

  // console.log(`Subscription ${subscription.id} deleted for user ${username}`); // Commented out for production
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  const customerId = (invoice as any).customer as string;
  
  if (!subscriptionId) {
    console.error('No subscription ID in payment succeeded event');
    return;
  }

  // Find user by subscription ID first, then by customer ID
  let user = await User.findOne({
    'subscription.stripeSubscriptionId': subscriptionId
  });

  if (!user && customerId) {
    user = await User.findOne({
      'subscription.stripeCustomerId': customerId
    });
  }

  if (!user) {
    console.error('User not found for payment succeeded:', { subscriptionId, customerId });
    return;
  }

  // Update payment information
  await User.findOneAndUpdate(
    { _id: user._id },
    {
      'subscription.stripeSubscriptionId': subscriptionId,
      'subscription.stripeCustomerId': customerId,
      'subscription.paymentMethod': (invoice as any).payment_method as string,
      'subscription.status': 'active',
      'subscription.currentPeriodStart': new Date((invoice as any).period_start * 1000),
      'subscription.currentPeriodEnd': new Date((invoice as any).period_end * 1000),
      'subscription.amount': (invoice as any).amount_paid || 99,
      'subscription.currency': (invoice as any).currency || 'usd',
      'subscription.billingCycle': 'monthly',
      hasProAccess: true
    }
  );

  // console.log(`Payment succeeded for subscription ${subscriptionId}, user ${user.username}`); // Commented out for production
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) {
    console.error('No subscription ID in payment failed event');
    return;
  }

  // Find user by subscription ID
  const user = await User.findOne({
    'subscription.stripeSubscriptionId': subscriptionId
  });

  if (!user) {
    console.error('User not found for payment failed:', subscriptionId);
    return;
  }

  // Update payment status
  await User.findOneAndUpdate(
    { _id: user._id },
    {
      'subscription.status': 'past_due',
      hasProAccess: false
    }
  );

  // console.log(`Payment failed for subscription ${subscriptionId}`); // Commented out for production
} 