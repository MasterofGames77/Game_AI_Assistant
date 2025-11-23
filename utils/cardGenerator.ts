/**
 * Utility for generating shareable card images from React components
 */

import { toPng, toBlob } from 'html-to-image';
import ShareableCard from '../components/ShareableCard';
import React from 'react';

/**
 * Card data structure for generation
 */
export interface CardData {
  gameTitle: string;
  question: string;
  answerSnippet: string;
  imageUrl?: string;
}

/**
 * Generates a PNG image blob from card data
 * @param cardData - Data for the card
 * @returns Promise resolving to Blob
 */
export async function generateCardImage(cardData: CardData): Promise<Blob> {
  // Create a temporary container element
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1200px';
  container.style.height = '800px';
  document.body.appendChild(container);

  try {
    // Create React element
    const cardElement = React.createElement(ShareableCard, {
      gameTitle: cardData.gameTitle,
      question: cardData.question,
      answerSnippet: cardData.answerSnippet,
      imageUrl: cardData.imageUrl,
    });

    // Render to container using ReactDOM
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(container);
    root.render(cardElement);

    // Wait for React to render and apply styles
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Wait for images to load if present
    if (cardData.imageUrl) {
      await new Promise<void>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Continue even if image fails
        img.src = cardData.imageUrl!;
      });
      // Wait a bit more after image loads
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Final wait to ensure everything is rendered
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Generate image
    const blob = await toBlob(container, {
      width: 1200,
      height: 800,
      quality: 1.0,
      pixelRatio: 2, // Higher quality
      backgroundColor: '#1a1b2e',
      cacheBust: true,
    });

    if (!blob) {
      throw new Error('Failed to generate card image');
    }

    return blob;
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

/**
 * Generates a data URL for the card image (for preview)
 * @param cardData - Data for the card
 * @returns Promise resolving to data URL string
 */
export async function generateCardDataUrl(cardData: CardData): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1200px';
  container.style.height = '800px';
  document.body.appendChild(container);

  try {
    const cardElement = React.createElement(ShareableCard, {
      gameTitle: cardData.gameTitle,
      question: cardData.question,
      answerSnippet: cardData.answerSnippet,
      imageUrl: cardData.imageUrl,
    });

    const { createRoot } = await import('react-dom/client');
    const root = createRoot(container);
    root.render(cardElement);

    // Wait for React to render and apply styles
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Wait for images to load if present
    if (cardData.imageUrl) {
      await new Promise<void>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = cardData.imageUrl!;
      });
      // Wait a bit more after image loads
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Final wait to ensure everything is rendered
    await new Promise((resolve) => setTimeout(resolve, 300));

    const dataUrl = await toPng(container, {
      width: 1200,
      height: 800,
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#1a1b2e',
      cacheBust: true,
    });

    return dataUrl;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Downloads the card image
 * @param blob - Image blob
 * @param filename - Filename for download
 */
export function downloadCardImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

