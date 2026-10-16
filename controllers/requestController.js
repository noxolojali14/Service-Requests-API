const { randomUUID } = require('crypto');
const requests = require('../data/requests');

const priorities = ['Low', 'Medium', 'High'];
const statuses = ['Open', 'In Progress', 'Resolved'];
const editableFields = ['title', 'description', 'requesterName', 'priority', 'status'];
const requiredFields = ['title', 'description', 'requesterName'];

function validateFields(body, fieldsToCheck) {
  for (const field of fieldsToCheck) {
    if (!editableFields.includes(field)) {
      return `The field '${field}' cannot be changed.`;
    }

    if (['title', 'description', 'requesterName'].includes(field)) {
      if (typeof body[field] !== 'string' || body[field].trim() === '') {
        return `'${field}' must be a non-empty string.`;
      }
    }

    if (field === 'priority' && !priorities.includes(body.priority)) {
      return `'priority' must be Low, Medium, or High.`;
    }

    if (field === 'status' && !statuses.includes(body.status)) {
      return `'status' must be Open, In Progress, or Resolved.`;
    }
  }

  return null;
}

function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  const fields = Object.keys(body);
  const validationError = validateFields(body, fields);

  if (validationError) {
    return validationError;
  }

  return null;
}

function findRequestIndex(id) {
  return requests.findIndex((request) => request.id === id);
}

function getAllRequests(req, res) {
  res.json(requests);
}

function getRequestById(req, res, next) {
  const request = requests.find((item) => item.id === req.params.id);

  if (!request) {
    return next({ statusCode: 404, message: 'Service request not found.' });
  }

  return res.json(request);
}

function createRequest(req, res, next) {
  const bodyError = validateBody(req.body);
  if (bodyError) {
    return next({ statusCode: 400, message: bodyError });
  }

  const missingField = requiredFields.find((field) => !req.body[field]);
  if (missingField) {
    return next({ statusCode: 400, message: `'${missingField}' is required.` });
  }

  const request = {
    id: randomUUID(),
    title: req.body.title.trim(),
    description: req.body.description.trim(),
    requesterName: req.body.requesterName.trim(),
    priority: req.body.priority || 'Medium',
    status: req.body.status || 'Open',
    createdAt: new Date().toISOString()
  };

  requests.push(request);
  return res.status(201).json(request);
}

function replaceRequest(req, res, next) {
  const bodyError = validateBody(req.body);
  if (bodyError) {
    return next({ statusCode: 400, message: bodyError });
  }

  const missingField = requiredFields.find((field) => !req.body[field]);
  if (missingField) {
    return next({ statusCode: 400, message: `'${missingField}' is required.` });
  }

  const requestIndex = findRequestIndex(req.params.id);
  if (requestIndex === -1) {
    return next({ statusCode: 404, message: 'Service request not found.' });
  }

  const existingRequest = requests[requestIndex];
  const updatedRequest = {
    id: existingRequest.id,
    title: req.body.title.trim(),
    description: req.body.description.trim(),
    requesterName: req.body.requesterName.trim(),
    priority: req.body.priority || 'Medium',
    status: req.body.status || 'Open',
    createdAt: existingRequest.createdAt
  };

  requests[requestIndex] = updatedRequest;
  return res.json(updatedRequest);
}

function updateRequest(req, res, next) {
  const bodyError = validateBody(req.body);
  if (bodyError) {
    return next({ statusCode: 400, message: bodyError });
  }

  const fields = Object.keys(req.body);
  if (fields.length === 0) {
    return next({ statusCode: 400, message: 'Provide at least one field to update.' });
  }

  const requestIndex = findRequestIndex(req.params.id);
  if (requestIndex === -1) {
    return next({ statusCode: 404, message: 'Service request not found.' });
  }

  const validationError = validateFields(req.body, fields);
  if (validationError) {
    return next({ statusCode: 400, message: validationError });
  }

  const updatedFields = {};
  for (const field of fields) {
    updatedFields[field] = typeof req.body[field] === 'string'
      ? req.body[field].trim()
      : req.body[field];
  }

  const updatedRequest = { ...requests[requestIndex], ...updatedFields };
  requests[requestIndex] = updatedRequest;
  return res.json(updatedRequest);
}

function deleteRequest(req, res, next) {
  const requestIndex = findRequestIndex(req.params.id);
  if (requestIndex === -1) {
    return next({ statusCode: 404, message: 'Service request not found.' });
  }

  requests.splice(requestIndex, 1);
  return res.json({ message: 'Service request deleted successfully.' });
}

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  replaceRequest,
  updateRequest,
  deleteRequest
};