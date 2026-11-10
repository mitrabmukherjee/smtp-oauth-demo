const nodemailer = require('nodemailer');
const { decrypt } = require('./crypto');
const { getActiveAccountByUserId } = require('./db');
const { getAccessTokenFromRefresh } = require('./googleAuth');

/**
 * Send email on behalf of a connected user via Gmail SMTP + OAuth2 (XOAUTH2).
 *
 * @param {string} userId Application user id
 * @param {string} to Recipient
 * @param {string} subject
 * @param {string} text Plain-text body
 */
async function sendUserEmail(userId, to, subject, text) {
  const account = getActiveAccountByUserId(userId);
  if (!account) {
    throw new Error(`No active Gmail account for user_id=${userId}`);
  }

  const refreshToken = decrypt(account.refresh_token);
  const accessToken = await getAccessTokenFromRefresh(refreshToken);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: account.provider_email,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken,
      accessToken,
    },
  });

  const info = await transporter.sendMail({
    from: account.provider_email,
    to,
    subject,
    text,
  });

  return info;
}

module.exports = { sendUserEmail };
