import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

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
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ message: 'Invalid signature' });
  }

  try {
    await connectToWingmanDB();

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
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
    
    console.log(`Preventing charge for early access user: ${username}`);
    
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
    
    console.log(`Subscription ${subscription.id} canceled for early access user ${username}`);
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

  console.log(`Subscription ${subscription.id} processed for user ${username}`);
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

  console.log(`Subscription ${subscription.id} updated for user ${username}`);
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

  console.log(`Subscription ${subscription.id} deleted for user ${username}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) {
    console.error('No subscription ID in payment succeeded event');
    return;
  }

  // Find user by subscription ID
  const user = await User.findOne({
    'subscription.stripeSubscriptionId': subscriptionId
  });

  if (!user) {
    console.error('User not found for payment succeeded:', subscriptionId);
    return;
  }

  // Update payment information
  await User.findOneAndUpdate(
    { _id: user._id },
    {
      'subscription.paymentMethod': (invoice as any).payment_method as string,
      'subscription.status': 'active',
      hasProAccess: true
    }
  );

  console.log(`Payment succeeded for subscription ${subscriptionId}`);
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

  console.log(`Payment failed for subscription ${subscriptionId}`);
} 