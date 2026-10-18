const express = require('express');
const authController = require('../../controllers/authController');
const { registerValidator, loginValidator } = require('../../validators/authValidators');
const validateRequest = require('../../middleware/validateRequest');
const authenticate = require('../../middleware/authMiddleware');
const {
  authLimiter,
  registrationLimiter,
  refreshLimiter,
  logoutLimiter
} = require('../../middleware/rateLimiter');

const router = express.Router();

// Public Auth Endpoints
router.post('/register', registrationLimiter, registerValidator, validateRequest, authController.register);
router.post('/login', authLimiter, loginValidator, validateRequest, authController.login);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', logoutLimiter, authController.logout);

// Protected Auth Verification Endpoint
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
