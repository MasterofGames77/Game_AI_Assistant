import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { generateQuestion, generateForumPost, UserPreferences } from '../../../utils/automatedContentGenerator';
import { findGameImage, getRandomGameImage, hasGameImage, getAllGamesWithImages } from '../../../utils/automatedImageService';
import { askQuestion, createForumPost, getUserPreferences } from '../../../utils/automatedUsersService';
import { getScheduler } from '../../../utils/automatedUsersScheduler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { testType, username, gameTitle, genre, forumTopic } = req.body;

  try {
    switch (testType) {
      case 'generate-question': {
        // Test content generation - question
        if (!username || !gameTitle || !genre) {
          return res.status(400).json({ 
            error: 'Missing required fields: username, gameTitle, genre' 
          });
        }

        const preferences = await getUserPreferences(username);
        if (!preferences) {
          return res.status(400).json({ 
            error: `No preferences found for user: ${username}` 
          });
        }

        const question = await generateQuestion({
          gameTitle,
          genre,
          userPreferences: preferences
        });

        return res.status(200).json({
          success: true,
          testType: 'generate-question',
          result: {
            username,
            gameTitle,
            genre,
            question
          }
        });
      }

      case 'generate-post': {
        // Test content generation - forum post
        if (!username || !gameTitle || !genre) {
          return res.status(400).json({ 
            error: 'Missing required fields: username, gameTitle, genre' 
          });
        }

        const preferences = await getUserPreferences(username);
        if (!preferences) {
          return res.status(400).json({ 
            error: `No preferences found for user: ${username}` 
          });
        }

        const post = await generateForumPost({
          gameTitle,
          genre,
          userPreferences: preferences,
          forumTopic: forumTopic || 'General Discussion'
        });

        return res.status(200).json({
          success: true,
          testType: 'generate-post',
          result: {
            username,
            gameTitle,
            genre,
            forumTopic: forumTopic || 'General Discussion',
            post
          }
        });
      }

      case 'find-image': {
        // Test image service
        if (!gameTitle) {
          return res.status(400).json({ 
            error: 'Missing required field: gameTitle' 
          });
        }

        const image = findGameImage(gameTitle);
        const randomImage = getRandomGameImage(gameTitle);
        const hasImage = hasGameImage(gameTitle);

        return res.status(200).json({
          success: true,
          testType: 'find-image',
          result: {
            gameTitle,
            hasImage,
            imagePath: image,
            randomImagePath: randomImage,
            allGamesWithImages: getAllGamesWithImages()
          }
        });
      }

      case 'ask-question': {
        // Test full question flow
        if (!username) {
          return res.status(400).json({ 
            error: 'Missing required field: username' 
          });
        }

        const preferences = await getUserPreferences(username);
        if (!preferences) {
          return res.status(400).json({ 
            error: `No preferences found for user: ${username}` 
          });
        }

        const result = await askQuestion(username, preferences);

        return res.status(result.success ? 200 : 500).json({
          success: result.success,
          testType: 'ask-question',
          result
        });
      }

      case 'create-post': {
        // Test full forum post flow
        if (!username) {
          return res.status(400).json({ 
            error: 'Missing required field: username' 
          });
        }

        const preferences = await getUserPreferences(username);
        if (!preferences) {
          return res.status(400).json({ 
            error: `No preferences found for user: ${username}` 
          });
        }

        const result = await createForumPost(username, preferences);

        return res.status(result.success ? 200 : 500).json({
          success: result.success,
          testType: 'create-post',
          result
        });
      }

      case 'scheduler-status': {
        // Test scheduler status
        const scheduler = getScheduler();
        const status = scheduler.getStatus();

        return res.status(200).json({
          success: true,
          testType: 'scheduler-status',
          result: status
        });
      }

      case 'trigger-task': {
        // Manually trigger a scheduled task
        const { taskName } = req.body;
        if (!taskName) {
          return res.status(400).json({ 
            error: 'Missing required field: taskName' 
          });
        }

        const scheduler = getScheduler();
        await scheduler.triggerTask(taskName);

        return res.status(200).json({
          success: true,
          testType: 'trigger-task',
          result: {
            taskName,
            message: 'Task executed successfully'
          }
        });
      }

      case 'create-forum': {
        // Test forum creation
        if (!username || !gameTitle) {
          return res.status(400).json({ 
            error: 'Missing required fields: username, gameTitle' 
          });
        }

        const preferences = await getUserPreferences(username);
        if (!preferences) {
          return res.status(400).json({ 
            error: `No preferences found for user: ${username}` 
          });
        }

        // Find genre for the game
        const gameListPath = require('path').join(
          process.cwd(),
          'data',
          'automated-users',
          preferences.focus === 'single-player' ? 'single-player.json' : 'multiplayer.json'
        );
        const gameList = require('fs').readFileSync(gameListPath, 'utf-8');
        const games = JSON.parse(gameList);
        
        let genre = 'general';
        for (const [g, gameList] of Object.entries(games)) {
          if ((gameList as string[]).includes(gameTitle)) {
            genre = g;
            break;
          }
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const forumTitle = `${gameTitle} - General Discussion`;
        const category = 'gameplay'; // Default category

        const response = await axios.post(
          `${baseUrl}/api/createForum`,
          {
            title: forumTitle,
            gameTitle,
            category,
            isPrivate: false,
            username
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${username}`
            }
          }
        );

        return res.status(200).json({
          success: true,
          testType: 'create-forum',
          result: {
            forum: response.data.forum,
            gameTitle,
            genre
          }
        });
      }

      default:
        return res.status(400).json({ 
          error: 'Invalid testType. Valid types: generate-question, generate-post, find-image, ask-question, create-post, create-forum, scheduler-status, trigger-task',
          availableTests: [
            'generate-question - Test question generation (requires: username, gameTitle, genre)',
            'generate-post - Test forum post generation (requires: username, gameTitle, genre, optional: forumTopic)',
            'find-image - Test image finding (requires: gameTitle)',
            'ask-question - Test full question flow (requires: username)',
            'create-post - Test full forum post flow (requires: username)',
            'create-forum - Test forum creation (requires: username, gameTitle)',
            'scheduler-status - Get scheduler status',
            'trigger-task - Manually trigger a task (requires: taskName)'
          ]
        });
    }
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}

