const assert = require('assert');
const express = require('express');
const http = require('http');
const {
  authLimiter,
  registrationLimiter,
  refreshLimiter
} = require('../src/middleware/rateLimiter');

const makeRequest = (server, path, statusCode = 401) => new Promise((resolve, reject) => {
  const request = http.request({
    host: '127.0.0.1',
    port: server.address().port,
    path,
    method: 'POST',
    headers: {
      Connection: 'close',
      'X-Forwarded-For': '203.0.113.10',
      'X-Test-Status': String(statusCode)
    },
    agent: false
  }, (response) => {
    response.resume();
    response.on('end', () => resolve(response));
  });
  request.on('error', reject);
  request.end();
});

const runAuthRateLimitTests = async () => {
  const testApp = express();
  testApp.set('trust proxy', 1);
  testApp.post('/auth/login', authLimiter, (req, res) => {
    res.sendStatus(Number(req.get('X-Test-Status')));
  });
  testApp.post('/auth/register', registrationLimiter, (req, res) => {
    res.sendStatus(Number(req.get('X-Test-Status')));
  });
  testApp.post('/auth/refresh', refreshLimiter, (req, res) => {
    res.sendStatus(Number(req.get('X-Test-Status')));
  });

  const server = http.createServer(testApp);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    for (let attempt = 0; attempt < 15; attempt++) {
      const response = await makeRequest(server, '/auth/register', 201);
      assert.strictEqual(response.statusCode, 201);
    }

    const blockedRegistration = await makeRequest(server, '/auth/register', 201);
    assert.strictEqual(blockedRegistration.statusCode, 429);
    assert.strictEqual(blockedRegistration.headers['x-ratelimit-scope'], 'registration-ip');

    for (let attempt = 0; attempt < 15; attempt++) {
      const response = await makeRequest(server, '/auth/refresh');
      assert.strictEqual(response.statusCode, 401);
    }

    const blockedRefresh = await makeRequest(server, '/auth/refresh');
    assert.strictEqual(blockedRefresh.statusCode, 429);
    assert.strictEqual(blockedRefresh.headers['x-ratelimit-scope'], 'auth-refresh-ip');

    const failedLogin = await makeRequest(server, '/auth/login');
    assert.strictEqual(failedLogin.statusCode, 401, 'Refresh failures must not block login');

    const successfulLogin = await makeRequest(server, '/auth/login', 200);
    assert.strictEqual(successfulLogin.statusCode, 200);

    for (let attempt = 0; attempt < 14; attempt++) {
      const response = await makeRequest(server, '/auth/login');
      assert.strictEqual(response.statusCode, 401);
    }

    const blockedLogin = await makeRequest(server, '/auth/login');
    assert.strictEqual(blockedLogin.statusCode, 429);
    assert.strictEqual(blockedLogin.headers['x-ratelimit-scope'], 'auth-ip');
    assert(Number(blockedLogin.headers['retry-after']) <= 60);
  } finally {
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

module.exports = runAuthRateLimitTests;
