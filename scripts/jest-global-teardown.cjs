/* eslint-env node,jest */
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('globalTeardown: stopping in-memory MongoDB if possible...');
  try {
    // Close mongoose connection if present (prevents open handles)
    try {
      // require here to avoid adding mongoose to global scope if not used
      const mongoose = require('mongoose');
      if (mongoose && mongoose.connection && mongoose.connection.readyState) {
        console.log('globalTeardown: closing mongoose connection...');
        await mongoose.disconnect();
        console.log('globalTeardown: mongoose disconnected');
      }
    } catch (e) {
      // ignore if mongoose not present or already disconnected
      console.warn('globalTeardown: mongoose disconnect error (ignored):', e && e.message);
    }

    const infoPath = path.resolve(__dirname, '..', '.mongo-info.json');
    if (fs.existsSync(infoPath)) {
      const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      if (info && info.pid) {
        try {
          process.kill(info.pid);
          console.log('globalTeardown: killed pid', info.pid);
        } catch (e) {
          console.warn('globalTeardown: failed to kill pid', info.pid, e && e.message);
        }
      }
  try { fs.unlinkSync(infoPath); } catch (err) { void err; }
    }
  } catch (e) {
    console.error('globalTeardown error:', e && e.message);
  } finally {
    // Ensure the process exits so Jest does not report open handles
    try {
      console.log('globalTeardown: exiting process');
      process.exit(0);
    } catch (e) {
      // If exit fails, just return
      console.warn('globalTeardown: process.exit failed', e && e.message);
    }
  }
};
