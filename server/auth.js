
// Auth middleware - simplified version
export const authMiddleware = (req, res, next) => {
  // For now, just pass through - later can add real authentication
  next();
};
