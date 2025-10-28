import mongoose from 'mongoose';

// Define the Question interface
export interface IQuestion {
  username: string;
  question: string;
  response: string;
  timestamp: Date;
  
  // NEW FIELDS FOR PHASE 1 - All optional
  detectedGame?: string;
  detectedGenre?: string[];
  questionCategory?: string;
  difficultyHint?: string;
  interactionType?: string;
}

// Define the Question schema
const QuestionSchema = new mongoose.Schema<IQuestion>({
  username: { type: String, required: true },
  question: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  
  // NEW FIELDS FOR PHASE 1 - All optional for backward compatibility
  detectedGame: { type: String, required: false },
  detectedGenre: [{ type: String, required: false }],
  questionCategory: { type: String, required: false },
  difficultyHint: { type: String, required: false },
  interactionType: { type: String, required: false }
}, { collection: 'questions' });

QuestionSchema.index({ username: 1, timestamp: 1 });
QuestionSchema.index({ detectedGenre: 1 }); // Index for future genre-based queries

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);