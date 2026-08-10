/* eslint-env node,jest */
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  // If a MongoDB URI is provided via env (for example CI starts a Mongo service),
  // skip starting mongodb-memory-server and write the provided URI to .mongo-info.json
  // so the `jest-setup` can pick it up.
  if (process.env.MONGODB_URI) {
    const uri = process.env.MONGODB_URI;
    const pid = null;
    const info = { uri, pid };
    const outPath = path.resolve(__dirname, '..', '.mongo-info.json');
    fs.writeFileSync(outPath, JSON.stringify(info));
    console.log('globalSetup: using provided MONGODB_URI, wrote', outPath);
    return;
  }

  console.log('globalSetup: starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const pid = mongod.instanceInfo && mongod.instanceInfo.pid ? mongod.instanceInfo.pid : null;

  const info = { uri, pid };
  const outPath = path.resolve(__dirname, '..', '.mongo-info.json');
  fs.writeFileSync(outPath, JSON.stringify(info));

  // Expose the URI to test processes via environment file that setupFiles can read
  console.log('globalSetup: wrote', outPath);
};
