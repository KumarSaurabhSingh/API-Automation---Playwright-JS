const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const env = require('../config/env');

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
  validateFormats: true,
});

addFormats(ajv);

let initialized = false;
let schemaNames = [];

function formatErrors(errors = []) {
  return errors.map((error) => {
    const location = error.instancePath || '/';
    const params = error.params ? ` ${JSON.stringify(error.params)}` : '';
    return `${location} ${error.message}${params}`;
  });
}

function initialize() {
  if (initialized) return;

  if (!fs.existsSync(env.paths.schemas)) {
    throw new Error(`Schema directory does not exist: ${env.paths.schemas}`);
  }

  const files = fs
    .readdirSync(env.paths.schemas)
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const file of files) {
    const fullPath = path.join(env.paths.schemas, file);
    const schema = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    ajv.addSchema(schema, file);
    schemaNames.push(file);
  }

  initialized = true;
}

function getValidator(schemaName) {
  initialize();
  const validate = ajv.getSchema(schemaName);
  if (!validate) {
    throw new Error(
      `Unknown schema "${schemaName}". Available schemas: ${schemaNames.join(', ')}`,
    );
  }
  return validate;
}

function validateSchema(data, schemaName) {
  const validate = getValidator(schemaName);
  const valid = Boolean(validate(data));
  return {
    valid,
    errors: valid ? [] : formatErrors(validate.errors),
  };
}

function assertSchema(data, schemaName) {
  const result = validateSchema(data, schemaName);
  if (!result.valid) {
    throw new Error(
      `Schema validation failed for "${schemaName}":\n- ${result.errors.join('\n- ')}`,
    );
  }
  return result;
}

function listSchemas() {
  initialize();
  return [...schemaNames];
}

module.exports = { validateSchema, assertSchema, listSchemas, formatErrors };
