import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, userId } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    await connectToWingmanDB();

    // Find the user
    const user = await User.findOne({ 
      $or: [
        { username },
        { userId }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is in early access period - prevent charges during free period
    if (user.subscription?.earlyAccessGranted && 
        user.subscription?.earlyAccessEndDate && 
        user.subscription.earlyAccessEndDate > new Date()) {
      return res.status(400).json({ 
        message: 'You are currently in your free early access period. You can upgrade when your free period expires.',
        freePeriodEnd: user.subscription.earlyAccessEndDate
      });
    }

    // Create or retrieve Stripe customer
    let customerId = user.subscription?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          username: user.username,
          userId: user.userId || user._id.toString()
        }
      });
      customerId = customer.id;

      // Save customer ID to user record
      await User.updateOne(
        { _id: user._id },
        { $set: { 'subscription.stripeCustomerId': customerId } }
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Video Game Wingman Pro',
              description: 'Monthly subscription to Video Game Wingman Pro features',
            },
            unit_amount: 199, // $1.99 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/upgrade?canceled=true`,
      metadata: {
        username: user.username,
        userId: user.userId || user._id.toString()
      }
    });

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      message: 'Error creating checkout session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
