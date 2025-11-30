// import mongoose, { Document, Schema } from 'mongoose';

// export interface INintendoData extends Document {
//   source: 'nintendoStoreUS' | 'nintendoNewsUS';
//   data: any[]; // Store the raw data array from Bright Data
//   lastUpdated: Date;
//   collectionParams?: {
//     // Store the input parameters used for this collection
//     url?: string;
//     category?: string;
//     limit?: number;
//     selectors?: string;
//     maxResults?: number;
//     includeDetails?: boolean;
//   };
//   metadata?: {
//     recordCount: number;
//     collectionId?: string; // Bright Data collection ID for reference
//     collectionTime?: number; // Time taken to collect (in ms)
//   };
//   createdAt?: Date;
//   updatedAt?: Date;
// }

// const NintendoDataSchema = new Schema<INintendoData>(
//   {
//     source: {
//       type: String,
//       required: true,
//       enum: ['nintendoStoreUS', 'nintendoNewsUS'],
//       index: true, // Index for faster queries
//     },
//     data: {
//       type: Schema.Types.Mixed,
//       required: true,
//     },
//     lastUpdated: {
//       type: Date,
//       required: true,
//       default: Date.now,
//       index: true, // Index to find most recent data
//     },
//     collectionParams: {
//       type: Schema.Types.Mixed,
//       default: {},
//     },
//     metadata: {
//       type: Schema.Types.Mixed,
//       default: {},
//     },
//   },
//   {
//     timestamps: true, // Automatically adds createdAt and updatedAt
//     collection: 'nintendo_data', // Explicit collection name
//   }
// );

// // Compound index for efficient queries: source + most recent data
// NintendoDataSchema.index({ source: 1, lastUpdated: -1 });

// export default mongoose.models.NintendoData ||
//   mongoose.model<INintendoData>('NintendoData', NintendoDataSchema);

