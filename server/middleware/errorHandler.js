/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle custom errors with status codes
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.availableQuantity !== undefined && { availableQuantity: err.availableQuantity }),
      ...(err.requestedQuantity !== undefined && { requestedQuantity: err.requestedQuantity })
    });
  }

  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry - resource already exists'
    });
  }

  // Handle MongoDB validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages
    });
  }

  // Handle MongoDB cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format'
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};

module.exports = errorHandler;
