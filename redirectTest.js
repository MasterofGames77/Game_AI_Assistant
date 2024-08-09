const redirectUri = "https://game-ai-assistant.vercel.app/api/twitchCallback";
const encodedRedirectUri = encodeURIComponent(redirectUri);

console.log(encodedRedirectUri);