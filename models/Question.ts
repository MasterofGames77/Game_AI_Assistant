import mongoose from 'mongoose';

// Define the Question schema
const QuestionSchema = new mongoose.Schema({
  username: { type: String, required: true },
  question: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { collection: 'questions' });

QuestionSchema.index({ username: 1, timestamp: 1 });

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);