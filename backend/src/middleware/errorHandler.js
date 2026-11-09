function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  let statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(item => item.message).join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID.';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = `A record with this ${Object.keys(err.keyValue || {})[0] || 'value'} already exists.`;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
  });
}

module.exports = { notFound, errorHandler };
