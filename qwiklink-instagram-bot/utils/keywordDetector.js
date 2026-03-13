'use strict';

/**
 * Keywords that trigger an auto-reply with the business location link.
 * All matching is case-insensitive and checks for whole-word or substring presence.
 */
const LOCATION_KEYWORDS = [
  'location',
  'map',
  'address',
  'direction',
  'directions',
  'where',
  'where are you',
  'kahan',      // Hindi: "where"
  'jagah',      // Hindi: "place"
  'pata',       // Hindi: "address"
];

/**
 * Returns true if the given text contains any location keyword.
 * @param {string} text - The comment or DM text to check.
 * @returns {boolean}
 */
function containsLocationKeyword(text) {
  if (!text || typeof text !== 'string') return false;

  const normalised = text.toLowerCase().trim();

  return LOCATION_KEYWORDS.some((keyword) =>
    normalised.includes(keyword.toLowerCase())
  );
}

/**
 * Returns the matched keyword(s) found in the text (useful for logging).
 * @param {string} text
 * @returns {string[]}
 */
function getMatchedKeywords(text) {
  if (!text || typeof text !== 'string') return [];

  const normalised = text.toLowerCase().trim();

  return LOCATION_KEYWORDS.filter((keyword) =>
    normalised.includes(keyword.toLowerCase())
  );
}

module.exports = { containsLocationKeyword, getMatchedKeywords };
