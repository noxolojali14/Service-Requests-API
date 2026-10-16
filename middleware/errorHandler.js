function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'An unexpected server error occurred.';

  if (error.type === 'entity.parse.failed') {
    message = 'Request body contains invalid JSON.';
  } else if (statusCode >= 500) {
    message = 'An unexpected server error occurred.';
  }

  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;