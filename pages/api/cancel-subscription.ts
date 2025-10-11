import { NextApiRequest, NextApiResponse } from 'next';
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

  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    await connectToWingmanDB();

    // Find the user
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.hasProAccess) {
      return res.status(400).json({ message: 'User does not have an active subscription' });
    }

    // Check if user has a Stripe subscription
    if (user.subscription?.stripeSubscriptionId) {
      try {
        // First, try to retrieve the subscription to verify it exists
        let subscription: Stripe.Subscription;
        try {
          subscription = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId) as Stripe.Subscription;
        } catch (retrieveError) {
          console.log(`Stripe subscription ${user.subscription.stripeSubscriptionId} not found, treating as legacy subscription`);
          // If subscription doesn't exist in Stripe, treat as legacy and update database only
          await User.findOneAndUpdate(
            { _id: user._id },
            {
              'subscription.status': 'canceled',
              'subscription.cancelAtPeriodEnd': true,
              'subscription.canceledAt': new Date(),
              // Keep hasProAccess true until manually revoked for legacy users
              hasProAccess: true
            }
          );

          return res.status(200).json({ 
            message: 'Legacy subscription canceled successfully. You will retain access until manually revoked.',
            subscriptionStatus: 'canceled',
            accessUntil: user.subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
        }

        // If subscription exists, cancel it at the end of the current period
        subscription = await stripe.subscriptions.update(
          user.subscription.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          }
        ) as Stripe.Subscription;

        console.log(`Stripe subscription ${user.subscription.stripeSubscriptionId} set to cancel at period end`);

        // Update our database to reflect the cancellation
        await User.findOneAndUpdate(
          { _id: user._id },
          {
            'subscription.status': 'active', // Keep as active until period ends
            'subscription.cancelAtPeriodEnd': true,
            'subscription.canceledAt': new Date(),
            'subscription.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000),
            // Keep hasProAccess true until the period ends
            hasProAccess: true
          }
        );

        return res.status(200).json({ 
          message: 'Subscription canceled successfully. You will retain access until the end of your current billing period.',
          subscriptionStatus: 'canceled_at_period_end',
          accessUntil: new Date((subscription as any).current_period_end * 1000)
        });

      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError);
        return res.status(500).json({ 
          message: 'Failed to cancel subscription with Stripe. Please contact support.',
          error: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
        });
      }
    } else {
      // For users without Stripe subscriptions (legacy Pro users), just update the database
      await User.findOneAndUpdate(
        { _id: user._id },
        {
          'subscription.status': 'canceled',
          'subscription.cancelAtPeriodEnd': true,
          'subscription.canceledAt': new Date(),
          // Keep hasProAccess true until manually revoked
          hasProAccess: true
        }
      );

      console.log(`Legacy subscription canceled for user: ${username}`);

      return res.status(200).json({ 
        message: 'Subscription canceled successfully',
        subscriptionStatus: 'canceled',
        accessUntil: user.subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

  } catch (error) {
    console.error('Error canceling subscription:', error);
    return res.status(500).json({ 
      message: 'Failed to cancel subscription',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
