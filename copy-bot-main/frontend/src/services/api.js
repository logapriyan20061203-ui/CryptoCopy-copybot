import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let accessToken = null;
const rateLimitCooldowns = new Map();

const getRequestPath = (config) => {
  const baseUrl = (config.baseURL || '').replace(/\/$/, '');
  const requestUrl = (config.url || '').replace(/^\//, '');
  try {
    return new URL(`${baseUrl}/${requestUrl}`, window.location.origin).pathname;
  } catch {
    return `/${requestUrl.split('?')[0]}`;
  }
};

const getRateLimitScopes = (config, response) => {
  const scope = response?.headers?.['x-ratelimit-scope'];
  if (scope) return [scope];

  const path = getRequestPath(config);
  const method = (config.method || 'get').toLowerCase();
  const hasBearer = Boolean(config.headers?.Authorization || config.headers?.authorization);
  const scopes = [path];

  if (path === '/api/v1/health' || path.startsWith('/api/v1/health/')) return scopes;

  if (path.startsWith('/api/v1/auth/')) scopes.push('auth-ip');
  if (path === '/api/v1/execution/config' && method === 'patch') scopes.push('execution-ip');
  if (path === '/api/v1/execution/dry-run') scopes.push('dry-run-ip');

  if (hasBearer) {
    scopes.push('account', 'invalid-auth-ip', 'auth-refresh');
  } else {
    scopes.push('ip');
  }

  return scopes;
};

const getRetryAfterMs = (headers) => {
  const retryAfter = headers?.['retry-after'];
  if (retryAfter !== undefined) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now());
  }

  const reset = Number(headers?.['ratelimit-reset']);
  if (Number.isFinite(reset) && reset > 0) {
    const secondsRemaining = reset > Date.now() / 1000 ? reset - Date.now() / 1000 : reset;
    return Math.max(0, secondsRemaining * 1000);
  }

  return 0;
};

const createCooldownError = (config, cooldown, scope) => {
  const remainingSeconds = Math.max(1, Math.ceil((cooldown.until - Date.now()) / 1000));
  const error = new Error(`Request limit reached. Please wait ${remainingSeconds} seconds before retrying.`);
  error.config = config;
  error.isRateLimitCooldown = true;
  error.retryAfterSeconds = remainingSeconds;
  error.rateLimitScope = scope;
  return error;
};

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Request Interceptor: Attach Bearer token
api.interceptors.request.use(
  (config) => {
    const scopes = getRateLimitScopes(config);
    const cooldownEntry = scopes
      .map((scope) => [scope, rateLimitCooldowns.get(scope)])
      .find(([, cooldown]) => cooldown);
    const [scope, cooldown] = cooldownEntry || [];
    if (cooldown) {
      if (cooldown.until > Date.now()) {
        return Promise.reject(createCooldownError(config, cooldown, scope));
      }
      rateLimitCooldowns.delete(scope);
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Auto Refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 429 && originalRequest) {
      const delayMs = getRetryAfterMs(error.response.headers);
      if (delayMs > 0) {
        const [scope] = getRateLimitScopes(originalRequest, error.response);
        const cooldown = { until: Date.now() + delayMs };
        rateLimitCooldowns.set(scope, cooldown);
        const cooldownError = createCooldownError(originalRequest, cooldown, scope);
        const message = error.response.data?.message || cooldownError.message;
        cooldownError.message = message;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('api:rate-limited', { detail: { message, scope } }));
        }
        return Promise.reject(cooldownError);
      }
    }

    // Do not attempt refresh on auth endpoints (login, register, refresh itself)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh', {}, { withCredentials: true });

        const newAccessToken = data.data.accessToken;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        const refreshWasRateLimited = refreshErr.response?.status === 429 || refreshErr.isRateLimitCooldown;
        if (refreshWasRateLimited && refreshErr.rateLimitScope === 'auth-ip' && refreshErr.retryAfterSeconds) {
          rateLimitCooldowns.set('auth-refresh', {
            until: Date.now() + refreshErr.retryAfterSeconds * 1000
          });
        }
        if (!refreshWasRateLimited) {
          setAccessToken(null);
        }
        if (!refreshWasRateLimited && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
