const crypto = require('node:crypto');

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomString(length = 8, alphabet = ALPHANUMERIC) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('randomString(length) expects a positive integer');
  }
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let index = 0; index < length; index += 1) {
    result += alphabet[bytes[index] % alphabet.length];
  }
  return result;
}

function randomInt(min, max) {
  if (max < min) throw new Error('randomInt(min, max) received max < min');
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  if (max < min) throw new Error('randomFloat(min, max) received max < min');
  const value = Math.random() * (max - min) + min;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function randomEmail(prefix = 'qa') {
  return `${prefix}.${randomString(10)}@example.com`;
}

function randomUuid() {
  return crypto.randomUUID();
}

function randomItem(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('randomItem(items) expects a non-empty array');
  }
  return items[randomInt(0, items.length - 1)];
}

function randomBoolean() {
  return Math.random() < 0.5;
}

module.exports = {
  randomString,
  randomInt,
  randomFloat,
  randomEmail,
  randomUuid,
  randomItem,
  randomBoolean,
};
