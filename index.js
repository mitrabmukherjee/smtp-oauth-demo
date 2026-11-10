require('dotenv').config();

const express = require('express');
const { google } = require('googleapis');
const { encrypt } = require('./crypto');
const { upsertConnectedAccount, listAccountsByUserId } = require('./db');
const { getAuthorizationUrl, exchangeCodeForTokens } = require('./googleAuth');
const { sendUserEmail } = require('./email');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>mail-demo</title></head>
<body>
  <h1>mail-demo</h1>
  <p>Server is running. There is no UI on <code>/</code>; use these endpoints:</p>
  <ul>
    <li><a href="/auth/google?user_id=user-1">Connect Gmail</a> (<code>/auth/google?user_id=...</code>)</li>
    <li><code>GET /auth/callback</code> — OAuth redirect (Google calls this)</li>
    <li><code>GET /accounts/:userId</code> — list connected accounts</li>
    <li><code>POST /send</code> — JSON body: <code>user_id</code>, <code>to</code>, <code>subject</code>, <code>text</code></li>
    <li><a href="/health">/health</a></li>
  </ul>
</body></html>`);
});

/**
 * Start Google OAuth. Pass ?user_id=... to associate tokens with your app user.
 */
app.get('/auth/google', (req, res) => {
  const userId = req.query.user_id;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      error: 'Missing query parameter user_id',
    });
  }

  const state = Buffer.from(JSON.stringify({ userId }), 'utf8').toString(
    'base64url',
  );
  const url = getAuthorizationUrl(state);
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).json({ error: String(error) });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }
  if (!state || typeof state !== 'string') {
    return res.status(400).json({ error: 'Missing state' });
  }

  let userId;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    userId = parsed.userId;
  } catch {
    return res.status(400).json({ error: 'Invalid state' });
  }

  try {
    const { tokens, oauth2Client } = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return res.status(400).json({
        error:
          'No refresh_token returned. Revoke app access in Google Account settings and reconnect with prompt=consent.',
      });
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const { data: profile } = await gmail.users.getProfile({ userId: 'me' });
    const providerEmail = profile.emailAddress;
    if (!providerEmail) {
      return res.status(500).json({ error: 'Could not resolve Google account email' });
    }

    const encryptedRefresh = encrypt(tokens.refresh_token);
    const row = upsertConnectedAccount({
      user_id: userId,
      provider_email: providerEmail,
      refresh_token: encryptedRefresh,
      status: 'active',
    });

    res.json({
      message: 'Gmail connected',
      account: {
        id: row.id,
        user_id: row.user_id,
        provider_email: row.provider_email,
        status: row.status,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || 'OAuth callback failed',
    });
  }
});

app.get('/accounts/:userId', (req, res) => {
  const accounts = listAccountsByUserId(req.params.userId).map((a) => ({
    id: a.id,
    user_id: a.user_id,
    provider_email: a.provider_email,
    status: a.status,
  }));
  res.json({ accounts });
});

app.post('/send', async (req, res) => {
  const { user_id, to, subject, text } = req.body || {};
  if (!user_id || !to || !subject || !text) {
    return res.status(400).json({
      error: 'Body must include user_id, to, subject, text',
    });
  }

  try {
    const info = await sendUserEmail(user_id, to, subject, text);
    res.json({
      message: 'Email sent',
      messageId: info.messageId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Send failed' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
