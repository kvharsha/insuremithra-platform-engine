#!/usr/bin/env node
// Cross-platform helper to run ESLint and write both JSON and stylish summary outputs
// Usage: node scripts/save-eslint-report.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const reportsDir = path.join(repoRoot, 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

try {
  console.log('Running ESLint (json) -> reports/eslint.json');
  // Include .js and .cjs files so the flat config applies to both module and CommonJS script files
  // Allow a high warning threshold for the report generation step so we only
  // fail CI if there are actual errors (we still record warnings in the report).
  execSync(`npx eslint . --ext .js,.cjs --max-warnings=9999 -f json -o "${path.join(reportsDir, 'eslint.json')}"`, { stdio: 'inherit', shell: true });
} catch (err) {
  console.error('ESLint (json) failed with code', err.status || err.message);
  // continue to produce stylish output
}

try {
  console.log('Running ESLint (stylish) -> reports/eslint-summary.txt');
  const stylishOut = execSync(`npx eslint . --ext .js,.cjs --max-warnings=9999 -f stylish`, { encoding: 'utf8', shell: true });
  fs.writeFileSync(path.join(reportsDir, 'eslint-summary.txt'), stylishOut);
  // If we reach here and there was non-empty output, we should use exit code 0
  console.log('ESLint reports written to reports/');
  process.exit(0);
} catch (err) {
  // write whatever stderr/stdout we have
  const out = (err.stdout || '') + (err.stderr || err.message || '');
  fs.writeFileSync(path.join(reportsDir, 'eslint-summary.txt'), out);
  console.error('ESLint (stylish) failed with code', err.status || err.message);
  process.exit(err.status || 1);
}
