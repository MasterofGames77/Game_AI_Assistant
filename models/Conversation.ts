// import mongoose, { Schema, Model } from 'mongoose';
// import { Conversation, Interaction as InteractionInterface } from '../types';

// // Define the Interaction schema
// const InteractionSchema = new Schema<InteractionInterface>({
//   question: { type: String, required: true },
//   response: { type: String, required: true },
//   timestamp: { type: Date, default: Date.now },
// });

// // Define the Conversation schema
// const ConversationSchema = new Schema<Conversation>({
//   userId: { type: String, required: true },
//   interactions: { type: [InteractionSchema], default: [] },
//   timestamp: { type: Date, default: Date.now },
// }, { collection: 'conversations' });  // Explicitly specify the collection name

// // Export the Interaction interface and Conversation model
// export type { InteractionInterface as Interaction };  // export Interaction interface
// const ConversationModel: Model<Conversation> = mongoose.models.Conversation || mongoose.model<Conversation>('Conversation', ConversationSchema);
// export default ConversationModel;