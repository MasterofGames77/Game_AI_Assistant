import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  question: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

export default Question;