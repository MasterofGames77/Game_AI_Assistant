/**
 * Utility function to re-process older questions and update their metadata
 * This is useful when metadata extraction logic has been improved
 */

import connectToMongoDB from './mongodb';
import { extractQuestionMetadata, updateQuestionMetadata } from './aiHelper';
import { checkQuestionType } from '../pages/api/assistant';

/**
 * Re-process questions for a specific user or all users
 * @param username - Optional username to process only that user's questions. If not provided, processes all questions.
 * @param options - Processing options
 * @returns Processing results
 */
export const reprocessQuestions = async (
  username?: string,
  options: {
    limit?: number;
    skip?: number;
    onlyMissingMetadata?: boolean;
    onlyIncorrectGameTitles?: boolean;
  } = {}
) => {
  try {
    await connectToMongoDB();
    const Question = (await import('../models/Question')).default;

    // Build query
    const query: any = {};
    if (username) {
      query.username = username;
    }

    // If only processing questions with incorrect game titles, add filter
    if (options.onlyIncorrectGameTitles) {
      query.detectedGame = { $exists: true, $ne: null };
    } else if (options.onlyMissingMetadata) {
      // Process questions missing any metadata
      query.$or = [
        { detectedGame: { $exists: false } },
        { detectedGame: null },
        { questionCategory: { $exists: false } },
        { questionCategory: null },
        { difficultyHint: { $exists: false } },
        { difficultyHint: null },
      ];
    }

    // Fetch questions
    let queryBuilder = Question.find(query).sort({ timestamp: -1 });
    
    if (options.skip) {
      queryBuilder = queryBuilder.skip(options.skip);
    }
    
    if (options.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    const questions = await queryBuilder.select('_id question username detectedGame').lean();

    if (questions.length === 0) {
      return {
        success: true,
        message: 'No questions found to process',
        processed: 0,
        updated: 0,
        errors: 0,
      };
    }

    let processed = 0;
    let updated = 0;
    let errors = 0;
    const updates: Array<{ id: string; oldGame?: string; newGame?: string }> = [];

    // Process each question
    for (const questionDoc of questions) {
      try {
        processed++;
        const questionId = (questionDoc as any)._id.toString();
        const questionText = (questionDoc as any).question;
        const oldGame = (questionDoc as any).detectedGame;

        // Re-extract metadata
        const metadata = await extractQuestionMetadata(questionText, checkQuestionType);

        // Check if game title changed (for incorrect game title detection)
        if (options.onlyIncorrectGameTitles) {
          const newGame = metadata.detectedGame;
          // Only update if the game title actually changed
          if (newGame && newGame !== oldGame) {
            await updateQuestionMetadata(questionId, metadata);
            updated++;
            updates.push({ id: questionId, oldGame, newGame });
          }
        } else {
          // Update with all metadata
          await updateQuestionMetadata(questionId, metadata);
          updated++;
          if (metadata.detectedGame && metadata.detectedGame !== oldGame) {
            updates.push({ id: questionId, oldGame, newGame: metadata.detectedGame });
          }
        }

        // Add a small delay to avoid overwhelming APIs
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        errors++;
        console.error(`[Reprocess] Error processing question ${(questionDoc as any)._id}:`, error);
      }
    }

    return {
      success: true,
      message: `Processed ${processed} questions`,
      processed,
      updated,
      errors,
      sampleUpdates: updates.slice(0, 10), // Show first 10 updates as examples
    };
  } catch (error) {
    console.error('[Reprocess] Error in reprocessQuestions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
      updated: 0,
      errors: 0,
    };
  }
};

