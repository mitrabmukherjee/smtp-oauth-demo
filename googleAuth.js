const { google } = require('googleapis');

const GMAIL_SCOPE = 'https://mail.google.com/';

function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.BASE_URL}/auth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getAuthorizationUrl(state) {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GMAIL_SCOPE],
    state,
  });
}

/**
 * @param {string} code Authorization code from callback
 * @returns {Promise<{ tokens: import('google-auth-library').Credentials, oauth2Client: import('google-auth-library').OAuth2Client }>}
 */
async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return { tokens, oauth2Client };
}

/**
 * @param {string} refreshToken
 * @returns {Promise<string>} Access token
 */
async function getAccessTokenFromRefresh(refreshToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2Client.getAccessToken();
  if (!token) {
    throw new Error('Failed to obtain access token from refresh token');
  }
  return token;
}

module.exports = {
  GMAIL_SCOPE,
  createOAuth2Client,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getAccessTokenFromRefresh,
};
