import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
let RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

// Normalize the FROM email (trim whitespace, remove quotes if present)
if (RESEND_FROM_EMAIL) {
  RESEND_FROM_EMAIL = RESEND_FROM_EMAIL.trim().replace(/^["']|["']$/g, '');
}

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Function to load logo as base64 (for local development when APP_URL is localhost)
function getLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'assets', 'video-game-wingman-logo.png');
    if (fs.existsSync(logoPath)) {
      const imageBuffer = fs.readFileSync(logoPath);
      const base64 = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    }
  } catch (error) {
    console.error('[Email] Could not load logo as base64:', error);
  }
  return null;
}


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

/**
 * Send weekly digest email
 * @param email - User's email address
 * @param username - User's username
 * @param achievements - Array of achievements to display
 * @param forumActivity - Array of forum activities
 * @param gameRecommendations - Array of game recommendations
 * @param isFirstEmail - Whether this is the first weekly digest email
 */
export const sendWeeklyDigestEmail = async (
  email: string,
  username: string,
  achievements: Array<{ name: string; dateEarned: Date }>,
  forumActivity: Array<{
    forumTitle: string;
    gameTitle: string;
    message: string;
    timestamp: Date;
    likes: number;
  }>,
  gameRecommendations: string[],
  isFirstEmail: boolean
): Promise<boolean> => {
  const resend = getResendClient();
  if (!resend) {
    console.error('Email service not configured');
    return false;
  }

  // Format achievements section (limit to prevent email clipping)
  // Gmail clips emails over ~102KB, so we limit content
  const MAX_ACHIEVEMENTS_DISPLAY = 15;
  const achievementsToShow = achievements.slice(0, MAX_ACHIEVEMENTS_DISPLAY);
  const remainingAchievements = achievements.length - MAX_ACHIEVEMENTS_DISPLAY;
  
  let achievementsHtml = '';
  if (achievements.length > 0) {
    if (isFirstEmail) {
      achievementsHtml = `
        <h3 style="color: #4F46E5; margin-top: 0;">Your Achievements</h3>
        <p>Here are your achievements${achievements.length > MAX_ACHIEVEMENTS_DISPLAY ? ` (showing ${MAX_ACHIEVEMENTS_DISPLAY} of ${achievements.length})` : ''}:</p>
        <ul style="color: #555; padding-left: 20px;">
          ${achievementsToShow.map(ach => `<li><strong>${ach.name}</strong></li>`).join('')}
        </ul>
        ${remainingAchievements > 0 ? `<p style="color: #666; font-size: 14px;">...and ${remainingAchievements} more! <a href="${APP_URL}" style="color: #4F46E5;">View all on Video Game Wingman</a></p>` : ''}
      `;
    } else {
      achievementsHtml = `
        <h3 style="color: #4F46E5; margin-top: 0;">New Achievements This Week</h3>
        <p>Congratulations! You earned ${achievements.length} new achievement${achievements.length > 1 ? 's' : ''} this week:</p>
        <ul style="color: #555; padding-left: 20px;">
          ${achievementsToShow.map(ach => `<li><strong>${ach.name}</strong> - ${new Date(ach.dateEarned).toLocaleDateString()}</li>`).join('')}
        </ul>
        ${remainingAchievements > 0 ? `<p style="color: #666; font-size: 14px;">...and ${remainingAchievements} more! <a href="${APP_URL}" style="color: #4F46E5;">View all on Video Game Wingman</a></p>` : ''}
      `;
    }
  } else {
    if (isFirstEmail) {
      achievementsHtml = `
        <h3 style="color: #4F46E5; margin-top: 0;">Your Achievements</h3>
        <p>You haven't earned any achievements yet. Start asking questions to unlock achievements!</p>
      `;
    } else {
      achievementsHtml = `
        <h3 style="color: #4F46E5; margin-top: 0;">New Achievements This Week</h3>
        <p>No new achievements this week, but keep exploring to unlock more!</p>
      `;
    }
  }

  // Format forum activity section (already limited to 5, but ensure message truncation)
  const MAX_FORUM_POSTS = 5;
  const MAX_MESSAGE_LENGTH = 120; // Reduced from 150 to keep HTML smaller
  const forumPostsToShow = forumActivity.slice(0, MAX_FORUM_POSTS);
  const remainingPosts = forumActivity.length - MAX_FORUM_POSTS;
  
  let forumActivityHtml = '';
  if (forumActivity.length > 0) {
    forumActivityHtml = `
      <h3 style="color: #4F46E5; margin-top: 0;">Your Forum Activity</h3>
      <p>You were active in ${forumActivity.length} forum${forumActivity.length > 1 ? 's' : ''} this week:</p>
      <div style="margin-top: 15px;">
        ${forumPostsToShow.map(activity => {
          const truncatedMessage = activity.message.length > MAX_MESSAGE_LENGTH 
            ? activity.message.substring(0, MAX_MESSAGE_LENGTH) + '...' 
            : activity.message;
          return `
          <div style="background-color: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
            <p style="margin: 0; font-weight: bold; color: #333;">${activity.forumTitle}</p>
            <p style="margin: 5px 0; color: #666; font-size: 14px;">${activity.gameTitle}</p>
            <p style="margin: 5px 0; color: #555;">${truncatedMessage}</p>
            ${activity.likes > 0 ? `<p style="margin: 5px 0; color: #4F46E5; font-size: 12px;">👍 ${activity.likes} like${activity.likes > 1 ? 's' : ''}</p>` : ''}
          </div>
        `;
        }).join('')}
      </div>
      ${remainingPosts > 0 ? `<p style="color: #666; font-size: 14px; margin-top: 10px;">...and ${remainingPosts} more post${remainingPosts > 1 ? 's' : ''}! <a href="${APP_URL}" style="color: #4F46E5;">View all on Video Game Wingman</a></p>` : ''}
    `;
  } else {
    forumActivityHtml = `
      <h3 style="color: #4F46E5; margin-top: 0;">Your Forum Activity</h3>
      <p>You haven't posted in the forums this week. Join the conversation and share your gaming experiences!</p>
    `;
  }

  // Format game recommendations section (limit to prevent email clipping)
  const MAX_RECOMMENDATIONS_DISPLAY = 8;
  const recommendationsToShow = gameRecommendations.slice(0, MAX_RECOMMENDATIONS_DISPLAY);
  const remainingRecommendations = gameRecommendations.length - MAX_RECOMMENDATIONS_DISPLAY;
  
  let recommendationsHtml = '';
  if (gameRecommendations.length > 0) {
    recommendationsHtml = `
      <h3 style="color: #4F46E5; margin-top: 0;">Game Recommendations</h3>
      <p>Based on your gaming preferences, here are some games you might enjoy:</p>
      <ul style="color: #555; padding-left: 20px;">
        ${recommendationsToShow.map(game => `<li><strong>${game}</strong></li>`).join('')}
      </ul>
      ${remainingRecommendations > 0 ? `<p style="color: #666; font-size: 14px;">...and ${remainingRecommendations} more! <a href="${APP_URL}" style="color: #4F46E5;">View all recommendations</a></p>` : ''}
    `;
  } else {
    recommendationsHtml = `
      <h3 style="color: #4F46E5; margin-top: 0;">Game Recommendations</h3>
      <p>Check out our forums to discover new games and get recommendations from the community!</p>
    `;
  }

  // Determine logo source: use base64 for localhost, public URL for production
  // Email clients cannot access localhost URLs, so we embed as base64 in development
  let logoSrc: string;
  const isLocalhost = APP_URL.includes('localhost') || APP_URL.includes('127.0.0.1');
  
  if (isLocalhost) {
    // Local development: embed logo as base64 so email clients can display it
    const logoBase64 = getLogoBase64();
    if (logoBase64) {
      logoSrc = logoBase64;
      console.log('[Email] Using base64-embedded logo for localhost');
    } else {
      // Fallback: use text header if logo file not found
      logoSrc = '';
      console.warn('[Email] Logo file not found, using text header');
    }
  } else {
    // Production: use public URL (email clients can access public URLs)
    logoSrc = `${APP_URL}/assets/video-game-wingman-logo.png`;
    console.log(`[Email] Using public URL for logo: ${logoSrc}`);
  }

  try {
    // Build HTML with proper line breaks to prevent Gmail clipping
    // Gmail clips emails over ~102KB or with very long lines (>998 chars)
    const logoHtml = logoSrc 
      ? `<img src="${logoSrc}" alt="Video Game Wingman" style="max-width: 180px; height: auto; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;" width="180" height="auto" />`
      : `<h1 style="color: #4F46E5; font-size: 28px; margin-bottom: 15px;">Video Game Wingman</h1>`;
    
    const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<div style="text-align: center; margin-bottom: 30px;">
${logoHtml}
<h2 style="color: #333; font-size: 24px; margin-top: 10px;">Your Weekly Gaming Summary</h2>
</div>
<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
<p style="color: #333; font-size: 16px;">Hello ${username},</p>
<p style="color: #555;">Here's your weekly summary of activity on Video Game Wingman:</p>
<div style="margin-top: 25px;">
${achievementsHtml}
</div>
<div style="margin-top: 25px;">
${forumActivityHtml}
</div>
<div style="margin-top: 25px;">
${recommendationsHtml}
</div>
<div style="text-align: center; margin: 30px 0;">
<a href="${APP_URL}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Continue Your Gaming Journey</a>
</div>
</div>
<div style="font-size: 12px; color: #666; text-align: center;">
<p>This is your weekly summary email. You can manage your email preferences in your account settings.</p>
<p>© 2024 Video Game Wingman. All rights reserved.</p>
</div>
</div>`;

    const emailPayload: any = {
      from: RESEND_FROM_EMAIL!,
      to: email,
      subject: `Your Weekly Gaming Summary - Video Game Wingman`,
      html: htmlContent,
      text: `
        Video Game Wingman - Your Weekly Gaming Summary
        
        Hello ${username},
        
        Here's your weekly summary of activity on Video Game Wingman:
        
        ${isFirstEmail ? 'Your Achievements:' : 'New Achievements This Week:'}
        ${achievements.length > 0 
          ? achievements.map(ach => `- ${ach.name}${!isFirstEmail ? ` (${new Date(ach.dateEarned).toLocaleDateString()})` : ''}`).join('\n')
          : isFirstEmail ? 'No achievements yet. Start asking questions to unlock achievements!' : 'No new achievements this week, but keep exploring!'
        }
        
        Your Forum Activity:
        ${forumActivity.length > 0
          ? forumActivity.slice(0, 5).map(activity => `- ${activity.forumTitle} (${activity.gameTitle}): ${activity.message.substring(0, 100)}${activity.message.length > 100 ? '...' : ''}${activity.likes > 0 ? ` [${activity.likes} likes]` : ''}`).join('\n')
          : 'You haven\'t posted in the forums this week. Join the conversation!'
        }
        
        Game Recommendations:
        ${gameRecommendations.length > 0
          ? gameRecommendations.map(game => `- ${game}`).join('\n')
          : 'Check out our forums to discover new games!'
        }
        
        Continue your gaming journey: ${APP_URL}
        
        This is your weekly summary email. You can manage your email preferences in your account settings.
        
        © 2024 Video Game Wingman. All rights reserved.
      `
    };

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('Error sending weekly digest email:', error);
      return false;
    }

    console.log(`Weekly digest email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending weekly digest email:', error);
    return false;
  }
};
