import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
  feedbackId: string;
  username: string;
  email: string;
  userType: 'free' | 'pro';
  category: 'bug_report' | 'feature_request' | 'improvement' | 'general' | 'complaint' | 'praise';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'under_review' | 'in_progress' | 'resolved' | 'closed';
  adminResponse?: string;
  adminResponseBy?: string;
  adminResponseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    isRead: boolean;
    isArchived: boolean;
    tags: string[];
    attachments: {
      type: 'image' | 'file';
      url: string;
      name: string;
    }[];
    violationResult?: any; // Store content moderation results
  };
}

const FeedbackSchema = new Schema<IFeedback>({
  feedbackId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  username: { 
    type: String, 
    required: true,
    index: true
  },
  email: { 
    type: String, 
    required: true 
  },
  userType: { 
    type: String, 
    enum: ['free', 'pro'], 
    required: true,
    index: true
  },
  category: { 
    type: String, 
    enum: ['bug_report', 'feature_request', 'improvement', 'general', 'complaint', 'praise'],
    required: true,
    index: true
  },
  title: { 
    type: String, 
    required: true, 
    maxlength: 200,
    trim: true
  },
  message: { 
    type: String, 
    required: true, 
    minlength: 10, 
    maxlength: 2000,
    trim: true
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium',
    index: true
  },
  status: { 
    type: String, 
    enum: ['new', 'under_review', 'in_progress', 'resolved', 'closed'], 
    default: 'new',
    index: true
  },
  adminResponse: { 
    type: String, 
    maxlength: 2000,
    trim: true
  },
  adminResponseBy: { 
    type: String,
    index: true
  },
  adminResponseAt: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  metadata: {
    isRead: { 
      type: Boolean, 
      default: false
    },
    isArchived: { 
      type: Boolean, 
      default: false
    },
    violationResult: Schema.Types.Mixed // Store content moderation results
  }
}, {
  timestamps: true
});

// Create compound indexes for better query performance
FeedbackSchema.index({ username: 1, createdAt: -1 });
FeedbackSchema.index({ status: 1, priority: 1 });
FeedbackSchema.index({ category: 1, createdAt: -1 });
FeedbackSchema.index({ 'metadata.isRead': 1 });
FeedbackSchema.index({ 'metadata.isArchived': 1 });

// Pre-save middleware to update updatedAt
FeedbackSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate unique feedback ID before saving
FeedbackSchema.pre('save', function(next) {
  if (!this.feedbackId) {
    this.feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Clear any existing model to avoid duplicate index warnings
if (mongoose.models.Feedback) {
  delete mongoose.models.Feedback;
}

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);
