/* eslint-env node,jest */
const fs = require('fs');
const path = require('path');

// Read the URI written by globalSetup and set process.env.MONGODB_URI synchronously
const infoPath = path.resolve(__dirname, '..', '.mongo-info.json');
if (fs.existsSync(infoPath)) {
  try {
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    if (info && info.uri) {
      process.env.MONGODB_URI = info.uri;
      // Also set a secondary env used elsewhere
      process.env.MONGO_URL = info.uri;
      // log for visibility in tests
      // console.log('jest-setup: set MONGODB_URI to', info.uri);
    }
  } catch {
    // ignore; tests will fallback to localhost
  }
}
