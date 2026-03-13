'use strict';

const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Build the QwikLink business page URL.
 */
function getBusinessUrl() {
  const slug = process.env.BUSINESS_SLUG || 'your-business';
  return `https://qwiklink.in/${slug}`;
}

/**
 * Reply to a public Instagram comment.
 *
 * API: POST /{comment-id}/replies
 * Docs: https://developers.facebook.com/docs/instagram-api/reference/ig-comment/replies
 *
 * @param {string} commentId  - The IG comment ID to reply to.
 * @param {string} message    - The reply text.
 * @returns {Promise<object>} - API response data.
 */
async function replyToComment(commentId, message) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  const url = `${BASE_URL}/${commentId}/replies`;

  const response = await axios.post(
    url,
    { message },
    {
      params: { access_token: token },
      timeout: 10_000,
    }
  );

  return response.data;
}

/**
 * Send a DM (private message) to an Instagram user.
 *
 * API: POST /{ig-account-id}/messages
 * Docs: https://developers.facebook.com/docs/messenger-platform/instagram/features/send-message
 *
 * @param {string} recipientId  - The IG-scoped user ID to message.
 * @param {string} message      - The message text.
 * @returns {Promise<object>}   - API response data.
 */
async function sendDirectMessage(recipientId, message) {
  const token   = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

  const url = `${BASE_URL}/${accountId}/messages`;

  const response = await axios.post(
    url,
    {
      recipient: { id: recipientId },
      message:   { text: message },
    },
    {
      params: { access_token: token },
      timeout: 10_000,
    }
  );

  return response.data;
}

/**
 * Fetch details of a specific comment (useful for debugging / logging).
 *
 * @param {string} commentId
 * @returns {Promise<object>}
 */
async function getCommentDetails(commentId) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  const response = await axios.get(`${BASE_URL}/${commentId}`, {
    params: {
      fields:       'id,text,username,timestamp',
      access_token: token,
    },
    timeout: 10_000,
  });

  return response.data;
}

module.exports = {
  getBusinessUrl,
  replyToComment,
  sendDirectMessage,
  getCommentDetails,
};
