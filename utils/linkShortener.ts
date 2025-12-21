/**
 * Utility functions for shortening and formatting URLs in responses
 */

/**
 * Shorten URL for inline display (e.g., "youtube.com/watch?v=abc123...")
 * @param url - The full URL to shorten
 * @param maxLength - Maximum length of the shortened URL (default: 40)
 * @returns Shortened URL string
 */
export function shortenUrl(url: string, maxLength: number = 40): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, "");
    const pathname = urlObj.pathname;
    const search = urlObj.search;

    // Combine hostname + pathname + search params
    let fullPath = hostname + pathname + search;

    // If it's too long, truncate and add ellipsis
    if (fullPath.length > maxLength) {
      return fullPath.substring(0, maxLength - 3) + "...";
    }

    return fullPath;
  } catch {
    // If URL parsing fails, just truncate the original URL
    return url.length > maxLength
      ? url.substring(0, maxLength - 3) + "..."
      : url;
  }
}

/**
 * Process markdown links in text and replace them with shortened URLs
 * Converts [text](url) to (shortened-url) format
 * @param text - Text containing markdown links
 * @returns Text with markdown links replaced by shortened URLs in parentheses
 */
export function shortenMarkdownLinks(text: string): string {
  // Match markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  let formattedText = text;
  let match;
  const matches: Array<{ fullMatch: string; url: string }> = [];
  
  // First pass: find all markdown links
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    const [fullMatch, linkText, url] = match;
    matches.push({ fullMatch, url });
  }
  
  // Second pass: replace all markdown links with shortened URL (inline format)
  matches.forEach(({ fullMatch, url }) => {
    const shortened = shortenUrl(url);
    
    // Create a placeholder with just the shortened URL in parentheses
    // Format: (shortened-url) - matches the screenshot style
    const placeholder = `(${shortened})`;
    
    // Escape special regex characters in the full match
    const escapedMatch = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    formattedText = formattedText.replace(
      new RegExp(escapedMatch, "g"),
      placeholder
    );
  });
  
  return formattedText;
}

