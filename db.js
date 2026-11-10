/**
 * In-memory mock of `connected_accounts` (see schema.sql).
 * Replace with SQLite/Postgres in production.
 */

/** @type {Array<{ id: number, user_id: string, provider_email: string, refresh_token: string, status: string }>} */
const connectedAccounts = [];
let nextId = 1;

/**
 * @param {object} row
 * @param {string} row.user_id
 * @param {string} row.provider_email
 * @param {string} row.refresh_token Encrypted refresh token
 * @param {string} [row.status]
 */
function upsertConnectedAccount({
  user_id,
  provider_email,
  refresh_token,
  status = 'active',
}) {
  const existing = connectedAccounts.find(
    (a) => a.user_id === user_id && a.provider_email === provider_email,
  );

  if (existing) {
    existing.refresh_token = refresh_token;
    existing.status = status;
    return { ...existing };
  }

  const row = {
    id: nextId++,
    user_id,
    provider_email,
    refresh_token,
    status,
  };
  connectedAccounts.push(row);
  return { ...row };
}

/**
 * @param {string} userId
 * @returns {object | undefined} First active account for user
 */
function getActiveAccountByUserId(userId) {
  return connectedAccounts.find(
    (a) => a.user_id === userId && a.status === 'active',
  );
}

/**
 * @param {string} userId
 * @returns {object[]}
 */
function listAccountsByUserId(userId) {
  return connectedAccounts
    .filter((a) => a.user_id === userId)
    .map((a) => ({ ...a }));
}

module.exports = {
  connectedAccounts,
  upsertConnectedAccount,
  getActiveAccountByUserId,
  listAccountsByUserId,
};
