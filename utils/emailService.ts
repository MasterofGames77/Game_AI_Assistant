import { Resend } from 'resend';

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
let RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

// Normalize the FROM email (trim whitespace, remove quotes if present)
if (RESEND_FROM_EMAIL) {
  RESEND_FROM_EMAIL = RESEND_FROM_EMAIL.trim().replace(/^["']|["']$/g, '');
}

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Initialize Resend client
const getResendClient = () => {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Email functionality will be disabled.');
    return null;
  }

  if (!RESEND_FROM_EMAIL) {
    console.warn('RESEND_FROM_EMAIL not configured. Email functionality will be disabled.');
    return null;
  }

  // Validate FROM email format
  const fromEmailRegex = /^([^<]+<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(>)?$/;
  if (!fromEmailRegex.test(RESEND_FROM_EMAIL)) {
    console.error('Invalid RESEND_FROM_EMAIL format. Must be email@example.com or "Name <email@example.com>"');
    return null;
  }

  return new Resend(RESEND_API_KEY);
};

/**
 * Send password reset email
 * @param email - User's email address
 * @param resetToken - Password reset token
 * @param username - User's username
 */
export const sendPasswordResetEmail = async (
  email: string, 
  resetToken: string, 
  username: string
): Promise<boolean> => {
  const resend = getResendClient();
  if (!resend) {
    console.error('Email service not configured');
    return false;
  }

  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL!,
      to: email,
      subject: 'Password Reset - Video Game Wingman',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5;">Video Game Wingman</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p>Hello ${username},</p>
            <p>We received a request to reset your password for your Video Game Wingman account.</p>
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #4F46E5;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="font-size: 12px; color: #666; text-align: center;">
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>© 2024 Video Game Wingman. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
        Password Reset - Video Game Wingman
        
        Hello ${username},
        
        We received a request to reset your password for your Video Game Wingman account.
        
        Click this link to reset your password: ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this password reset, please ignore this email.
        
        © 2024 Video Game Wingman. All rights reserved.
      `
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }

    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

/**
 * Send welcome email to new users
 * @param email - User's email address
 * @param username - User's username
 */
export const sendWelcomeEmail = async (
  email: string, 
  username: string
): Promise<boolean> => {
  const resend = getResendClient();
  if (!resend) {
    console.error('Email service not configured');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL!,
      to: email,
      subject: 'Welcome to Video Game Wingman!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5;">Welcome to Video Game Wingman!</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${username}!</h2>
            <p>Welcome to Video Game Wingman - your AI-powered gaming companion!</p>
            
            <p>With your new account, you can:</p>
            <ul style="color: #555;">
              <li>Ask questions about any video game</li>
              <li>Get personalized game recommendations</li>
              <li>Analyze gameplay data to improve your strategies</li>
              <li>Access detailed game guides and walkthroughs</li>
              <li>Join our community forums</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Start Playing
              </a>
            </div>
          </div>
          
          <div style="font-size: 12px; color: #666; text-align: center;">
            <p>Need help? Contact us at support@videogamewingman.com</p>
            <p>© 2024 Video Game Wingman. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
        Welcome to Video Game Wingman!
        
        Hello ${username}!
        
        Welcome to Video Game Wingman - your AI-powered gaming companion!
        
        With your new account, you can:
        - Ask questions about any video game
        - Get personalized game recommendations
        - Analyze gameplay data to improve your strategies
        - Access detailed game guides and walkthroughs
        - Join our community forums
        
        Start playing: ${APP_URL}
        
        Need help? Contact us at support@videogamewingman.com
        
        © 2024 Video Game Wingman. All rights reserved.
      `
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }

    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

/**
 * Send password reset verification code
 * @param email - User's email address
 * @param verificationCode - 6-digit verification code
 * @param username - User's username
 */
export const sendPasswordResetVerificationCode = async (
  email: string, 
  verificationCode: string, 
  username: string
): Promise<boolean> => {
  const resend = getResendClient();
  if (!resend) {
    console.error('Email service not configured');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL!,
      to: email,
      subject: 'Password Reset Verification Code - Video Game Wingman',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5;">Video Game Wingman</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Verification</h2>
            <p>Hello ${username},</p>
            <p>We received a request to reset your password for your Video Game Wingman account.</p>
            <p>To proceed with the password reset, please enter the following verification code:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 4px; display: inline-block; min-width: 200px;">
                ${verificationCode}
              </div>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              This code will expire in 60 seconds for security reasons.
            </p>
          </div>
          
          <div style="font-size: 12px; color: #666; text-align: center;">
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>© 2024 Video Game Wingman. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
        Password Reset Verification - Video Game Wingman
        
        Hello ${username},
        
        We received a request to reset your password for your Video Game Wingman account.
        
        To proceed with the password reset, please enter the following verification code:
        
        ${verificationCode}
        
        This code will expire in 60 seconds for security reasons.
        
        If you didn't request this password reset, please ignore this email.
        
        © 2024 Video Game Wingman. All rights reserved.
      `
    });

    if (error) {
      console.error('Error sending password reset verification code:', error);
      return false;
    }

    console.log(`Password reset verification code sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset verification code:', error);
    return false;
  }
};

/**
 * Send password setup notification to legacy users
 * @param email - User's email address
 * @param username - User's username
 */
export const sendPasswordSetupEmail = async (
  email: string, 
  username: string
): Promise<boolean> => {
  const resend = getResendClient();
  if (!resend) {
    console.error('Email service not configured');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL!,
      to: email,
      subject: 'Secure Your Account - Video Game Wingman',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5;">Video Game Wingman</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Important: Secure Your Account</h2>
            <p>Hello ${username},</p>
            <p>We've enhanced the security of Video Game Wingman and now require all users to set up a password for their accounts.</p>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;"><strong>Action Required:</strong> Please set up a password for your account within the next 90 days to maintain access.</p>
            </div>
            
            <p>To set up your password:</p>
            <ol style="color: #555;">
              <li>Log in to your account at ${APP_URL}</li>
              <li>You'll be prompted to set up a password</li>
              <li>Choose a strong password and confirm it</li>
              <li>Your account will be secured immediately</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Set Up Password
              </a>
            </div>
          </div>
          
          <div style="font-size: 12px; color: #666; text-align: center;">
            <p>This is a one-time setup. After 90 days, password setup will be mandatory.</p>
            <p>Questions? Contact us at support@videogamewingman.com</p>
            <p>© 2024 Video Game Wingman. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
        Important: Secure Your Account - Video Game Wingman
        
        Hello ${username},
        
        We've enhanced the security of Video Game Wingman and now require all users to set up a password for their accounts.
        
        ACTION REQUIRED: Please set up a password for your account within the next 90 days to maintain access.
        
        To set up your password:
        1. Log in to your account at ${APP_URL}
        2. You'll be prompted to set up a password
        3. Choose a strong password and confirm it
        4. Your account will be secured immediately
        
        This is a one-time setup. After 90 days, password setup will be mandatory.
        
        Questions? Contact us at support@videogamewingman.com
        
        © 2024 Video Game Wingman. All rights reserved.
      `
    });

    if (error) {
      console.error('Error sending password setup email:', error);
      return false;
    }

    console.log(`Password setup email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password setup email:', error);
    return false;
  }
};
