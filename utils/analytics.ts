/**
 * Google Analytics 4 (GA4) Tracking Utility
 * 
 * Provides comprehensive tracking for:
 * - Page views with proper page_title and page_location
 * - Custom events for key user actions
 * - Internal/developer traffic filtering
 */

// Type definitions for GA4
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * Check if GA4 is available and configured
 */
function isGA4Available(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function' &&
    !!process.env.NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID
  );
}

/**
 * Check if the current user is an internal/developer
 * This filters out your own traffic from analytics
 */
function isInternalUser(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for developer mode flag in localStorage
  const isDeveloper = localStorage.getItem('analytics_developer_mode') === 'true';
  if (isDeveloper) return true;

  // Check for internal user indicator (you can set this in your account)
  const username = localStorage.getItem('username');
  const internalUsernames: string[] = [
    // Add your username(s) here to filter your traffic
    // Example: 'your-username', 'admin', etc.
  ];
  if (username && internalUsernames.includes(username)) return true;

  // Check for IP-based filtering (if you have a way to detect your IP)
  // This would require server-side detection, but we can add a client-side flag
  const isInternalIP = localStorage.getItem('analytics_internal_ip') === 'true';
  if (isInternalIP) return true;

  return false;
}

/**
 * Get page title from the current route
 */
function getPageTitle(pathname: string): string {
  // Map routes to friendly page titles
  const routeMap: { [key: string]: string } = {
    '/': 'Assistant - Video Game Wingman',
    '/assistant': 'Assistant - Video Game Wingman',
    '/forum': 'Forums - Video Game Wingman',
    '/account': 'Account Settings - Video Game Wingman',
    '/signin': 'Sign In - Video Game Wingman',
    '/signup': 'Sign Up - Video Game Wingman',
    '/leaderboard': 'Leaderboard - Video Game Wingman',
    '/upgrade': 'Upgrade to Pro - Video Game Wingman',
    '/manage-subscription': 'Manage Subscription - Video Game Wingman',
    '/forgot-password': 'Forgot Password - Video Game Wingman',
    '/reset-password': 'Reset Password - Video Game Wingman',
    '/unlock-account': 'Unlock Account - Video Game Wingman',
    '/terms-of-service': 'Terms of Service - Video Game Wingman',
    '/privacy-policy': 'Privacy Policy - Video Game Wingman',
    '/twitch-bot': 'Twitch Bot - Video Game Wingman',
    '/twitch-landing': 'Twitch Integration - Video Game Wingman',
    '/twitch-viewer-landing': 'Twitch Viewer - Video Game Wingman',
    '/discord-landing': 'Discord Integration - Video Game Wingman',
  };

  // Check for forum pages
  if (pathname.startsWith('/forum/')) {
    const forumId = pathname.split('/')[2];
    return `Forum: ${forumId} - Video Game Wingman`;
  }

  // Check for twitch bot docs
  if (pathname.startsWith('/twitch-bot/docs')) {
    return 'Twitch Bot Documentation - Video Game Wingman';
  }

  // Return mapped title or default
  return routeMap[pathname] || `Video Game Wingman - ${pathname}`;
}

/**
 * Track a page view
 * This is called on route changes to ensure GA4 receives proper page metadata
 */
export function trackPageView(pathname: string, search?: string): void {
  if (!isGA4Available() || isInternalUser()) {
    return;
  }

  try {
    const pageLocation = `${window.location.origin}${pathname}${search || ''}`;
    const pageTitle = getPageTitle(pathname);

    // Send page_view event with proper metadata
    window.gtag('event', 'page_view', {
      page_title: pageTitle,
      page_location: pageLocation,
      page_path: pathname,
    });

    // Also update the config to ensure page_title is set
    window.gtag('config', process.env.NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID!, {
      page_title: pageTitle,
      page_location: pageLocation,
      page_path: pathname,
    });

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[GA4] Page view tracked:', { pageTitle, pageLocation, pathname });
    }
  } catch (error) {
    console.error('[GA4] Error tracking page view:', error);
  }
}

/**
 * Track a custom event
 * Use this for key user actions (conversions, engagement, etc.)
 */
export function trackEvent(
  eventName: string,
  eventParams?: {
    [key: string]: any;
  }
): void {
  if (!isGA4Available() || isInternalUser()) {
    return;
  }

  try {
    window.gtag('event', eventName, {
      ...eventParams,
      timestamp: new Date().toISOString(),
    });

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[GA4] Event tracked:', eventName, eventParams);
    }
  } catch (error) {
    console.error('[GA4] Error tracking event:', error);
  }
}

/**
 * Track when a user asks a question
 * This is a key conversion event
 */
export function trackQuestionAsked(
  question: string,
  detectedGame?: string,
  detectedGenre?: string[]
): void {
  trackEvent('question_asked', {
    question_length: question.length,
    has_game: !!detectedGame,
    detected_game: detectedGame || undefined,
    detected_genres: detectedGenre?.join(', ') || undefined,
    event_category: 'engagement',
    event_label: 'Question Asked',
  });
}

/**
 * Track when a user creates a forum post
 * This is a key conversion event
 */
export function trackForumPostCreated(
  forumId: string,
  forumTitle?: string,
  gameTitle?: string,
  hasImage?: boolean
): void {
  trackEvent('forum_post_created', {
    forum_id: forumId,
    forum_title: forumTitle || undefined,
    game_title: gameTitle || undefined,
    has_image: hasImage || false,
    event_category: 'engagement',
    event_label: 'Forum Post Created',
  });
}

/**
 * Track when a user creates a forum
 */
export function trackForumCreated(
  forumId: string,
  forumTitle: string,
  gameTitle?: string,
  category?: string
): void {
  trackEvent('forum_created', {
    forum_id: forumId,
    forum_title: forumTitle,
    game_title: gameTitle || undefined,
    category: category || undefined,
    event_category: 'engagement',
    event_label: 'Forum Created',
  });
}

/**
 * Track when a user likes a forum post
 */
export function trackForumPostLiked(forumId: string, postId: string): void {
  trackEvent('forum_post_liked', {
    forum_id: forumId,
    post_id: postId,
    event_category: 'engagement',
    event_label: 'Forum Post Liked',
  });
}

/**
 * Track when a user signs up
 * This is a key conversion event
 */
export function trackSignUp(method: 'email' | 'google' | 'other' = 'email'): void {
  trackEvent('sign_up', {
    method,
    event_category: 'conversion',
    event_label: 'User Sign Up',
  });
}

/**
 * Track when a user signs in
 */
export function trackSignIn(method: 'email' | 'google' | 'other' = 'email'): void {
  trackEvent('sign_in', {
    method,
    event_category: 'engagement',
    event_label: 'User Sign In',
  });
}

/**
 * Track when a user upgrades to Pro
 * This is a key conversion event
 */
export function trackUpgradeToPro(plan?: string): void {
  trackEvent('purchase', {
    transaction_id: `pro_${Date.now()}`,
    value: 0, // Set actual value if available
    currency: 'USD',
    plan: plan || 'pro',
    event_category: 'conversion',
    event_label: 'Upgrade to Pro',
  });
}

/**
 * Track when a user uses a Pro feature
 */
export function trackProFeatureUsed(featureName: string): void {
  trackEvent('pro_feature_used', {
    feature_name: featureName,
    event_category: 'engagement',
    event_label: 'Pro Feature Used',
  });
}

/**
 * Track when a user views a forum
 */
export function trackForumView(forumId: string, forumTitle?: string, gameTitle?: string): void {
  trackEvent('forum_view', {
    forum_id: forumId,
    forum_title: forumTitle || undefined,
    game_title: gameTitle || undefined,
    event_category: 'engagement',
    event_label: 'Forum Viewed',
  });
}

/**
 * Track when a user searches (if you have search functionality)
 */
export function trackSearch(searchTerm: string, resultsCount?: number): void {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount || undefined,
    event_category: 'engagement',
    event_label: 'Search Performed',
  });
}

/**
 * Track when a user clicks on a recommendation
 */
export function trackRecommendationClick(gameTitle: string, source?: string): void {
  trackEvent('recommendation_click', {
    game_title: gameTitle,
    source: source || 'unknown',
    event_category: 'engagement',
    event_label: 'Recommendation Clicked',
  });
}

/**
 * Track when a user submits feedback
 */
export function trackFeedbackSubmitted(category: string, priority?: string): void {
  trackEvent('feedback_submitted', {
    category,
    priority: priority || undefined,
    event_category: 'engagement',
    event_label: 'Feedback Submitted',
  });
}

/**
 * Track when a user views the leaderboard
 */
export function trackLeaderboardView(): void {
  trackEvent('leaderboard_view', {
    event_category: 'engagement',
    event_label: 'Leaderboard Viewed',
  });
}

/**
 * Track when a user views their account page
 */
export function trackAccountView(): void {
  trackEvent('account_view', {
    event_category: 'engagement',
    event_label: 'Account Page Viewed',
  });
}

/**
 * Set user properties (call this after login)
 */
export function setUserProperties(username: string, userType?: 'free' | 'pro'): void {
  if (!isGA4Available() || isInternalUser()) {
    return;
  }

  try {
    window.gtag('set', 'user_properties', {
      username: username,
      user_type: userType || 'free',
    });
  } catch (error) {
    console.error('[GA4] Error setting user properties:', error);
  }
}

/**
 * Clear user properties (call this on logout)
 */
export function clearUserProperties(): void {
  if (!isGA4Available()) {
    return;
  }

  try {
    window.gtag('set', 'user_properties', {
      username: null,
      user_type: null,
    });
  } catch (error) {
    console.error('[GA4] Error clearing user properties:', error);
  }
}

/**
 * Enable developer mode (filters out your traffic)
 * Call this in your browser console: analytics.enableDeveloperMode()
 */
export function enableDeveloperMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('analytics_developer_mode', 'true');
    console.log('[GA4] Developer mode enabled - your traffic will be filtered');
  }
}

/**
 * Disable developer mode
 */
export function disableDeveloperMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('analytics_developer_mode');
    console.log('[GA4] Developer mode disabled');
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).analytics = {
    enableDeveloperMode,
    disableDeveloperMode,
    trackPageView,
    trackEvent,
  };
}

