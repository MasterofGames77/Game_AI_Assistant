import mongoose, { Document, Schema } from 'mongoose';

/**
 * Session Model
 * 
 * Tracks active user sessions across devices and browsers.
 * Each session is linked to a refresh token hash for identification.
 * 
 * This enables:
 * - Users to see all active sessions
 * - Users to revoke suspicious sessions
 * - Security monitoring and anomaly detection
 */
export interface ISession extends Document {
  sessionId: string; // Unique session identifier (refresh token hash)
  userId: string; // User ID (indexed)
  username: string; // Username (for easier queries)
  refreshTokenHash: string; // SHA-256 hash of refresh token (unique, indexed)
  deviceInfo: {
    userAgent: string; // Full user agent string
    browser?: string; // Parsed browser name (Chrome, Firefox, etc.)
    browserVersion?: string; // Browser version
    os?: string; // Operating system (Windows, macOS, Linux, etc.)
    device?: string; // Device type (Desktop, Mobile, Tablet)
    platform?: string; // Platform details
  };
  ipAddress: string; // IP address of the session
  location?: {
    country?: string; // Country code (if available from IP geolocation)
    city?: string; // City name (if available)
    region?: string; // Region/state (if available)
  };
  lastActivity: Date; // Last time this session was active
  createdAt: Date; // When session was created
  isActive: boolean; // Whether session is currently active
  isCurrentSession?: boolean; // Whether this is the current session (computed)
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true, // Fast lookup by session ID
    },
    userId: {
      type: String,
      required: true,
      index: true, // Fast queries for user's sessions
    },
    username: {
      type: String,
      required: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true, // Fast lookup by refresh token hash
    },
    deviceInfo: {
      userAgent: {
        type: String,
        required: true,
      },
      browser: {
        type: String,
        required: false,
      },
      browserVersion: {
        type: String,
        required: false,
      },
      os: {
        type: String,
        required: false,
      },
      device: {
        type: String,
        required: false,
      },
      platform: {
        type: String,
        required: false,
      },
    },
    ipAddress: {
      type: String,
      required: true,
      index: true, // For security monitoring
    },
    location: {
      country: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      region: {
        type: String,
        required: false,
      },
    },
    lastActivity: {
      type: Date,
      required: true,
      default: Date.now,
      // Index is created below as TTL index
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true, // For filtering active sessions
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Compound index for efficient user session queries
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ userId: 1, lastActivity: -1 }); // For sorting by recent activity

// TTL index to automatically remove old inactive sessions (30 days)
SessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Delete model from cache if it exists (handles hot-reload in Next.js)
if (mongoose.models.Session) {
  delete mongoose.models.Session;
}

// Create the model
const Session = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;

