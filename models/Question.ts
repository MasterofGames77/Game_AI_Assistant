import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  question: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  questionType: { type: String, default: null },
  category: { type: String, default: null }
}, { collection: 'questions' });

QuestionSchema.index({ userId: 1, timestamp: 1 });

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);