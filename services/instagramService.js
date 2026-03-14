'use strict';
const axios = require('axios');
const BASE_URL = 'https://graph.facebook.com/v21.0';

/**
 * Build the QwikLink business page URL.
 */
function getBusinessUrl() {
  const slug = process.env.BUSINESS_SLUG || 'your-business';
  return `https://qwiklink.in/${slug}`;
}

/**
 * Reply to a public Instagram comment.
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
 * Uses the new Instagram Business API.
 */
async function sendDirectMessage(recipientId, message) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const url = `${BASE_URL}/${accountId}/messages`;

  const response = await axios.post(
    url,
    {
      recipient: { id: recipientId },
      message: { text: message },
      messaging_type: 'RESPONSE',
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    }
  );
  return response.data;
}

/**
 * Fetch details of a specific comment.
 */
async function getCommentDetails(commentId) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const response = await axios.get(`${BASE_URL}/${commentId}`, {
    params: {
      fields: 'id,text,username,timestamp',
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
