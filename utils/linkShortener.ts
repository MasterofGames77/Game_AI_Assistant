/**
 * Utility functions for shortening and formatting URLs in responses
 * Used by both the main assistant and Twitch bot
 */

/**
 * Get a friendly source name from a URL
 * @param url - The URL to extract a friendly name from
 * @returns Friendly source name (e.g., "Wikipedia", "GameSpot", etc.)
 */
export function getSourceName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, "");

    // Map common domains to friendly names
    const domainMap: { [key: string]: string } = {
      "wikipedia.org": "Wikipedia",
      "en.wikipedia.org": "Wikipedia",
      "gamesradar.com": "GamesRadar+",
      "tomsguide.com": "Tom's Guide",
      "techradar.com": "TechRadar",
      "gamespot.com": "GameSpot",
      "gameinformer.com": "Game Informer",
      "ign.com": "IGN",
      "polygon.com": "Polygon",
      "kotaku.com": "Kotaku",
      "theverge.com": "The Verge",
      "pcgamer.com": "PC Gamer",
      "engadget.com": "Engadget",
      "nintendo.com": "Nintendo",
      "playstation.com": "PlayStation",
      "xbox.com": "Xbox",
      "steamdeck.com": "Steam Deck",
      "popularmechanics.com": "Popular Mechanics",
      "nintendolife.com": "Nintendo Life",
      "nintendoeverything.com": "Nintendo Everything",
      "gamerant.com": "Gamerant",
      "videogamechronicles.com": "VGC",
      "thegamer.com": "The Gamer",
      "game8.co": "Game8",
      "eurogamer.net": "Eurogamer",
      "gamefaqs.gamespot.com": "GameFAQs",
      "youtube.com": "YouTube",
      "nintendowire.com": "Nintendo Wire",
      "store.steampowered.com": "Steam",
      "epicgames.com": "Epic Games",
      "currently.att.yahoo.com": "Yahoo",
      "progameguides.com": "Pro Game Guides",
      "pushsquare.com": "Push Square",
      "powerpyx.com": "PowerPyx",
    };

    // Check for exact match first
    if (domainMap[hostname]) {
      return domainMap[hostname];
    }

    // Check for partial matches (e.g., subdomains)
    for (const [domain, name] of Object.entries(domainMap)) {
      if (hostname.includes(domain) || domain.includes(hostname)) {
        return name;
      }
    }

    // Extract main domain name (e.g., "example.com" from "subdomain.example.com")
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const mainDomain = parts.slice(-2).join(".");
      // Capitalize first letter of each word
      return mainDomain
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(".");
    }

    return hostname;
  } catch {
    return url;
  }
}

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

