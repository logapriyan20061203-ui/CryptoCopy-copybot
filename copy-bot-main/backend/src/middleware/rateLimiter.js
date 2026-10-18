const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const metricsService = require('../services/metricsService');

const createLimiter = ({
  windowMs,
  max,
  message,
  scope = 'ip',
  keyGenerator,
  skip,
  skipSuccessfulRequests = false
}) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    ...(skip ? { skip } : {}),
    ...(skipSuccessfulRequests ? { skipSuccessfulRequests: true } : {}),
    handler: (req, res) => {
      metricsService.increment('apiErrorsTotal');
      res.setHeader('X-RateLimit-Scope', scope);
      const resetTime = req.rateLimit?.resetTime;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((resetTime ? resetTime.getTime() - Date.now() : windowMs) / 1000)
      );
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        message: `${message} Please wait ${retryAfterSeconds} seconds before retrying.`,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          details: [{ field: 'rate_limit', message: 'Too many requests. Please slow down.' }]
        }
      });
    }
  });
};

// 1. Global API Limiter
const globalLimiter = createLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: 'Request limit reached for this IP address.',
  skip: (req) => (
    /^Bearer\s+\S+/i.test(req.headers.authorization || '')
    || /^\/api\/v1\/auth(?:\/|$)/.test(req.originalUrl)
  )
});

// Authenticated application traffic is isolated per verified account, not shared by NAT/proxy IP.
const authenticatedApiLimiter = createLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTHENTICATED_API_RATE_LIMIT_MAX,
  message: 'Authenticated API request limit reached.',
  scope: 'account',
  keyGenerator: (req) => String(req.user.id || req.user.userId)
});

// Requests with invalid/expired bearer tokens still receive an IP-based abuse limit.
const invalidBearerLimiter = createLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: 'Invalid authentication request limit reached.',
  scope: 'invalid-auth-ip'
});

// 2. Authentication failures are limited separately from successful auth/session traffic.
const authLimiter = createLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: 'Too many failed login attempts.',
  scope: 'auth-ip',
  skipSuccessfulRequests: true
});

const registrationLimiter = createLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: 'Too many registration attempts.',
  scope: 'registration-ip'
});

const refreshLimiter = createLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: 'Too many session refresh attempts.',
  scope: 'auth-refresh-ip',
  skipSuccessfulRequests: true
});

const logoutLimiter = createLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: 'Too many logout requests.',
  scope: 'auth-logout-ip'
});

// 3. Strict Execution Limiter
const executionLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 execution operations per minute
  message: 'Execution rate limit exceeded.',
  scope: 'execution-ip'
});

// 4. Dry-run safety simulation limiter
const dryRunLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Simulation rate limit reached.',
  scope: 'dry-run-ip'
});

module.exports = {
  globalLimiter,
  authenticatedApiLimiter,
  invalidBearerLimiter,
  authLimiter,
  registrationLimiter,
  refreshLimiter,
  logoutLimiter,
  executionLimiter,
  dryRunLimiter
};
