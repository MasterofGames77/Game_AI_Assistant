import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

/**
 * Callback route for bot token generation
 * This exchanges the OAuth code for an access token and refresh token
 * Displays the tokens so you can copy them to your .env file
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, error_description } = req.query;

  // Log what we received for debugging
  console.log('Twitch Bot Token Callback received:', {
    hasCode: !!code,
    hasError: !!error,
    error: error,
    errorDescription: error_description,
    queryParams: Object.keys(req.query),
    fullUrl: req.url
  });

  // Handle OAuth errors
  if (error) {
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>OAuth Error - Bot Token Generation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #0e0e10; color: #efeff1; }
        .error-box { background: #d32f2f; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-box { background: #1f1f23; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #9147ff; }
        code { background: #0e0e10; padding: 2px 6px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>❌ Twitch Authorization Failed</h1>
    <div class="error-box">
        <strong>Error:</strong> ${error}<br>
        ${error_description ? `<strong>Description:</strong> ${error_description}` : ''}
    </div>
    <div class="info-box">
        <h3>Common Issues:</h3>
        <ul>
            <li><strong>redirect_mismatch:</strong> The redirect URI in your Twitch Developer Console doesn't match exactly. 
                Make sure it's exactly: <code>http://localhost:3000/api/twitchBotTokenCallback</code> (no trailing slash)</li>
            <li><strong>access_denied:</strong> You didn't authorize all permissions. Try again and make sure to check all boxes.</li>
            <li><strong>Other errors:</strong> Check the error description above for details.</li>
        </ul>
    </div>
    <div class="info-box">
        <h3>Next Steps:</h3>
        <ol>
            <li>Check your Twitch Developer Console redirect URIs</li>
            <li>Make sure you're logged in as the bot account (HeroGameWingman)</li>
            <li>Try the authorization again: <a href="/api/twitchBotTokenLogin" style="color: #9147ff;">Generate Bot Token</a></li>
        </ol>
    </div>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(errorHtml);
  }

  // Validate authorization code
  if (!code || Array.isArray(code)) {
    const debugHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>No Authorization Code - Debug Info</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #0e0e10; color: #efeff1; }
        .warning-box { background: #b8860b; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-box { background: #1f1f23; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #9147ff; }
        code { background: #0e0e10; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        pre { background: #0e0e10; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>⚠️ No Authorization Code Received</h1>
    <div class="warning-box">
        <strong>Issue:</strong> The callback was hit but no authorization code was provided by Twitch.
    </div>
    <div class="info-box">
        <h3>Debug Information:</h3>
        <p><strong>Query Parameters Received:</strong></p>
        <pre>${JSON.stringify(req.query, null, 2)}</pre>
        <p><strong>Full URL:</strong></p>
        <code>${req.url}</code>
    </div>
    <div class="info-box">
        <h3>Possible Causes:</h3>
        <ul>
            <li><strong>Redirect URI Mismatch:</strong> The redirect URI registered in Twitch Developer Console doesn't match exactly.
                <br>Required: <code>http://localhost:3000/api/twitchBotTokenCallback</code> (no trailing slash, exact match)</li>
            <li><strong>Authorization Not Completed:</strong> You may have closed the window or cancelled the authorization</li>
            <li><strong>Wrong Account:</strong> Make sure you're logged in as the bot account (HeroGameWingman)</li>
        </ul>
    </div>
    <div class="info-box">
        <h3>How to Fix:</h3>
        <ol>
            <li>Go to <a href="https://dev.twitch.tv/console/apps" target="_blank" style="color: #9147ff;">Twitch Developer Console</a></li>
            <li>Click on your application</li>
            <li>In "OAuth Redirect URLs", make sure you have exactly: <code>http://localhost:3000/api/twitchBotTokenCallback</code></li>
            <li>Save changes</li>
            <li>Try again: <a href="/api/twitchBotTokenLogin" style="color: #9147ff;">Generate Bot Token</a></li>
        </ol>
    </div>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(debugHtml);
  }

  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const domain = process.env.NODE_ENV === 'production'
    ? 'https://assistant.videogamewingman.com'
    : 'http://localhost:3000';
  let redirectUri = `${domain}/api/twitchBotTokenCallback`;
  // Ensure no trailing slash and no double slashes in the URI (except after "https://")
  redirectUri = redirectUri.replace(/\/$/, '').replace(/([^:]\/)\/+/g, "$1");
  const tokenUrl = process.env.TWITCH_TOKEN_URL || 'https://id.twitch.tv/oauth2/token';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ 
      error: 'Missing environment variables',
      message: 'NEXT_PUBLIC_TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in .env'
    });
  }

  try {
    // Exchange authorization code for access token
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: redirectUri,
    });

    console.log('Exchanging authorization code for token...');
    const tokenResponse = await axios.post(tokenUrl, params);

    const { access_token, refresh_token, expires_in, scope: rawScope } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ 
        error: 'Failed to obtain access token',
        message: 'Twitch did not return an access token.'
      });
    }

    // Ensure scope is a string (handle array or undefined cases)
    const scope = Array.isArray(rawScope) ? rawScope.join(' ') : (rawScope || '');

    // Fetch bot user data to verify token works
    let botUserData = null;
    try {
      const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Client-Id': clientId,
        },
      });
      botUserData = userResponse.data.data?.[0];
    } catch (userError) {
      console.warn('Could not fetch bot user data:', userError);
    }

    // Display tokens in a user-friendly format
    const htmlResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot Token Generated - Hero Game Wingman</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #0e0e10;
            color: #efeff1;
        }
        .container {
            background: #18181b;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #3a3a3d;
        }
        h1 {
            color: #9147ff;
            margin-top: 0;
        }
        .success {
            background: #1f7a1f;
            color: #fff;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .warning {
            background: #b8860b;
            color: #fff;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .token-box {
            background: #0e0e10;
            border: 1px solid #3a3a3d;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            position: relative;
        }
        .copy-btn {
            background: #9147ff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
            font-size: 14px;
        }
        .copy-btn:hover {
            background: #772ce8;
        }
        .info-box {
            background: #1f1f23;
            border-left: 4px solid #9147ff;
            padding: 15px;
            margin: 15px 0;
        }
        code {
            background: #0e0e10;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .step {
            margin: 20px 0;
            padding: 15px;
            background: #1f1f23;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ Bot Token Generated Successfully!</h1>
        
        <div class="success">
            <strong>Success!</strong> Your bot's OAuth token has been generated. Copy the values below to your <code>.env</code> file.
        </div>

        ${botUserData ? `
        <div class="info-box">
            <strong>Bot Account Verified:</strong><br>
            Username: <code>${botUserData.login}</code><br>
            Display Name: <code>${botUserData.display_name}</code><br>
            User ID: <code>${botUserData.id}</code>
        </div>
        ` : ''}

        <div class="warning">
            <strong>⚠️ Important:</strong> Copy these values now! This page will not be accessible again. Store them securely in your <code>.env</code> file.
        </div>

        <div class="step">
            <h3>1. Access Token</h3>
            <div class="token-box" id="accessToken">${access_token}</div>
            <button class="copy-btn" onclick="copyToClipboard('accessToken')">Copy Access Token</button>
        </div>

        <div class="step">
            <h3>2. Refresh Token</h3>
            <div class="token-box" id="refreshToken">${refresh_token || 'No refresh token provided'}</div>
            ${refresh_token ? `<button class="copy-btn" onclick="copyToClipboard('refreshToken')">Copy Refresh Token</button>` : ''}
        </div>

        <div class="step">
            <h3>3. Token Expires In</h3>
            <div class="info-box">
                ${expires_in ? `${Math.floor(expires_in / 86400)} days (${expires_in} seconds)` : 'Unknown'}
            </div>
        </div>

        <div class="step">
            <h3>4. Scopes Granted</h3>
            <div class="info-box">
                ${scope ? scope.split(' ').map((s: string) => `<code>${s}</code>`).join(', ') : 'No scopes listed'}
            </div>
        </div>

        <div class="step">
            <h3>5. Add to .env File</h3>
            <div class="info-box">
                <p>Add these lines to your <code>.env</code> file:</p>
                <div class="token-box">
TWITCH_BOT_USERNAME=${botUserData?.login || 'HeroGameWingman'}<br>
TWITCH_BOT_OAUTH_TOKEN=${access_token}<br>
${refresh_token ? `TWITCH_BOT_REFRESH_TOKEN=${refresh_token}` : ''}
                </div>
                <button class="copy-btn" onclick="copyEnvBlock()">Copy All .env Values</button>
            </div>
        </div>

        <div class="info-box">
            <strong>Next Steps:</strong>
            <ol>
                <li>Copy the access token above</li>
                <li>Add it to your <code>.env</code> file as <code>TWITCH_BOT_OAUTH_TOKEN</code></li>
                <li>If you received a refresh token, save it as <code>TWITCH_BOT_REFRESH_TOKEN</code></li>
                <li>Restart your development server</li>
                <li>You can now close this page</li>
            </ol>
        </div>
    </div>

    <script>
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent.trim();
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('Copied to clipboard!');
            });
        }

        function copyEnvBlock() {
            const accessToken = document.getElementById('accessToken').textContent.trim();
            const refreshToken = document.getElementById('refreshToken').textContent.trim();
            const username = '${botUserData?.login || 'HeroGameWingman'}';
            
            let envBlock = \`TWITCH_BOT_USERNAME=\${username}\\nTWITCH_BOT_OAUTH_TOKEN=\${accessToken}\`;
            if (refreshToken && refreshToken !== 'No refresh token provided') {
                envBlock += \`\\nTWITCH_BOT_REFRESH_TOKEN=\${refreshToken}\`;
            }
            
            navigator.clipboard.writeText(envBlock).then(() => {
                alert('Copied .env values to clipboard!');
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Please copy manually');
            });
        }
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlResponse);

  } catch (error: any) {
    console.error('Error generating bot token:', error.response?.data || error.message);
    
    return res.status(500).json({ 
      error: 'Failed to generate bot token',
      details: error.response?.data || error.message,
      message: 'Please check your Client ID, Client Secret, and redirect URI configuration.'
    });
  }
}

