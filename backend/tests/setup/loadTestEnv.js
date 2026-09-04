// tests/setup/loadTestEnv.js
//
// Jest's `setupFiles` runs this BEFORE any test file or module under test is
// loaded, so DATABASE_URL/REDIS_URL etc. are already correct (pointing at the
// test database, not the dev database) by the time src/config/env.js
// validates them.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });
