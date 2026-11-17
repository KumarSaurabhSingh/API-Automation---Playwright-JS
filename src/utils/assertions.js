const { expect } = require('@playwright/test');
const { validateSchema } = require('./schema-validator');

function truncate(value, maxLength = 800) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}... [truncated]` : text;
}

function describe(response) {
  const method = response?.request?.method || 'REQUEST';
  return `${method} ${response?.url || '<unknown url>'}`;
}

function statusMessage(response, expected) {
  return `${describe(response)} expected HTTP status ${expected} but received ${response.status}. Body: ${truncate(response.text)}`;
}

function expectStatus(response, expected) {
  const expectedList = Array.isArray(expected) ? expected : [expected];
  if (expectedList.length === 1) {
    expect(response.status, statusMessage(response, expectedList[0])).toBe(expectedList[0]);
    return;
  }
  expect(
    expectedList,
    statusMessage(response, expectedList.join(' or ')),
  ).toContain(response.status);
}

function expectSuccess(response) {
  expect(
    response.ok,
    `${describe(response)} expected a 2xx response but received ${response.status}. Body: ${truncate(response.text)}`,
  ).toBeTruthy();
}

function expectJson(response) {
  expect(
    response.isJson,
    `${describe(response)} expected a JSON body but received content-type "${response.contentType}" and body: ${truncate(response.text)}`,
  ).toBeTruthy();
  return response.data;
}

function expectSchema(data, schemaName, label = 'Response') {
  const result = validateSchema(data, schemaName);
  expect(
    result.valid,
    `${label} does not match schema "${schemaName}":\n- ${result.errors.join('\n- ')}`,
  ).toBeTruthy();
  return data;
}

function expectHeader(response, name, expected) {
  const actual = response.header(name);
  const message = `${describe(response)} expected header "${name}" but it was missing`;
  expect(actual, message).toBeDefined();

  if (expected instanceof RegExp) {
    expect(actual, `${describe(response)} header "${name}" did not match ${expected}`).toMatch(expected);
  } else if (typeof expected === 'function') {
    expect(
      expected(actual),
      `${describe(response)} header "${name}" did not satisfy the provided predicate (value: ${actual})`,
    ).toBeTruthy();
  } else if (expected !== undefined) {
    expect(actual, `${describe(response)} expected header "${name}" to equal "${expected}"`).toBe(expected);
  }

  return actual;
}

function expectErrorMessage(response, expectedPattern) {
  expectJson(response);
  const message = response.data?.message ?? response.data?.error ?? response.data?.detail;
  expect(
    typeof message === 'string',
    `${describe(response)} expected an error message property in the response body, received: ${truncate(response.data)}`,
  ).toBeTruthy();

  if (expectedPattern instanceof RegExp) {
    expect(message, `${describe(response)} error message did not match ${expectedPattern}`).toMatch(expectedPattern);
  } else {
    expect(message, `${describe(response)} error message did not contain "${expectedPattern}"`).toContain(expectedPattern);
  }

  return message;
}

function expectResponseTime(response, maxMs) {
  expect(
    response.duration,
    `${describe(response)} took ${Math.round(response.duration)}ms which exceeds the ${maxMs}ms budget`,
  ).toBeLessThanOrEqual(maxMs);
}

function expectMinLength(value, minLength, label = 'value') {
  expect(Array.isArray(value), `${label} should be an array`).toBeTruthy();
  expect(value.length, `${label} should contain at least ${minLength} item(s)`).toBeGreaterThanOrEqual(minLength);
  return value;
}

module.exports = {
  expectStatus,
  expectSuccess,
  expectJson,
  expectSchema,
  expectHeader,
  expectErrorMessage,
  expectResponseTime,
  expectMinLength,
};
