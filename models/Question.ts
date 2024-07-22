// models/Question.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

interface IQuestion extends Document {
  userId: string;
  question: string;
  response: string;
  timestamp: Date;
}

const QuestionSchema: Schema = new Schema({
  userId: { type: String, required: true },
  question: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
export default Question;