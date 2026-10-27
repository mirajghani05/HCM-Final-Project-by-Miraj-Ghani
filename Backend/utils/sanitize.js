const mongoose = require('mongoose');

const isBlank = (value) => (
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '')
);

const isObjectIdString = (value) => (
  typeof value === 'string' &&
  /^[a-fA-F0-9]{24}$/.test(value) &&
  mongoose.isValidObjectId(value)
);

/**
 * Normalize a request body before it reaches Mongoose.
 *
 * Empty strings for optional fields are removed so Mongoose does not try to cast
 * them (for example `department: ''` becoming an ObjectId cast error). Optional
 * ObjectId fields are validated up front and reference checks return a 400 with
 * a readable message instead of a raw Mongoose error.
 */
const sanitizePayload = async (body, options = {}) => {
  const {
    objectIds = [],
    strings = [],
    dates = [],
    enums = [],
    required = [],
    protectedFields = []
  } = options;

  const data = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (!protectedFields.includes(key)) data[key] = value;
  }

  for (const { key, label, model } of objectIds) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    if (isBlank(data[key])) {
      delete data[key];
      continue;
    }
    if (!isObjectIdString(data[key])) {
      return { error: `${label} id is invalid` };
    }
    if (model) {
      const exists = await model.exists({ _id: data[key] });
      if (!exists) return { error: `${label} not found` };
    }
  }

  for (const { key } of strings) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    if (isBlank(data[key])) {
      delete data[key];
      continue;
    }
    data[key] = String(data[key]).trim();
  }

  for (const { key, label } of dates) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    if (isBlank(data[key])) {
      delete data[key];
      continue;
    }
    const date = new Date(data[key]);
    if (Number.isNaN(date.getTime())) {
      return { error: `${label} must be a valid date` };
    }
    data[key] = date;
  }

  for (const { key, label, values } of enums) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    if (isBlank(data[key])) {
      delete data[key];
      continue;
    }
    if (!values.includes(data[key])) {
      return { error: `${label} must be one of: ${values.join(', ')}` };
    }
  }

  for (const { key, label } of required) {
    if (isBlank(data[key])) return { error: `${label} is required` };
  }

  return { data };
};

module.exports = { sanitizePayload, isBlank, isObjectIdString };
