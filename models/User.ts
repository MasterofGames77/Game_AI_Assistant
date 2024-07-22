// models/User.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

interface IUser extends Document {
  userId: string;
  conversations: Array<{
    question: string;
    response: string;
    timestamp: Date;
  }>;
}

const UserSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  conversations: [
    {
      question: { type: String, required: true },
      response: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

const User: Model<IUser> = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;