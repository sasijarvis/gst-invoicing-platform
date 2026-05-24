/**
 * Async error handler wrapper
 * This replaces express-async-errors for better compatibility
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;