#!/usr/bin/env node
/**
 * Policy Details Load Test
 * Uses autocannon to benchmark GET /api/policies/:id endpoint
 * 
 * Usage: node policy-details-autocannon.js
 * or: npm run bench:details
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';
const DURATION = parseInt(process.env.BENCH_DURATION) || 30; // seconds
const CONNECTIONS = parseInt(process.env.BENCH_CONNECTIONS) || 50;
const PIPELINING = parseInt(process.env.BENCH_PIPELINING) || 1;

// Sample policy IDs to test (you should replace these with actual IDs from your DB)
// These are placeholder IDs - the script will still run but may get 404s if IDs don't exist
const SAMPLE_POLICY_IDS = process.env.POLICY_IDS 
  ? process.env.POLICY_IDS.split(',')
  : [
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013',
      '507f1f77bcf86cd799439014',
      '507f1f77bcf86cd799439015'
    ];

// Generate requests for multiple policy IDs
const requests = SAMPLE_POLICY_IDS.map(id => ({
  method: 'GET',
  path: `/api/policies/${id}`
}));

// Autocannon configuration
const config = {
  url: BASE_URL,
  connections: CONNECTIONS,
  pipelining: PIPELINING,
  duration: DURATION,
  requests: requests
};

console.log('═══════════════════════════════════════════════════════════');
console.log('  Policy Details Load Test');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Target:       ${BASE_URL}/api/policies/:id`);
console.log(`  Policy IDs:   ${SAMPLE_POLICY_IDS.length} different IDs`);
console.log(`  Duration:     ${DURATION} seconds`);
console.log(`  Connections:  ${CONNECTIONS}`);
console.log(`  Pipelining:   ${PIPELINING}`);
console.log('═══════════════════════════════════════════════════════════');
console.log('\nNote: If policy IDs don\'t exist in DB, you may see 404 errors.');
console.log('Set POLICY_IDS env var with comma-separated valid IDs.\n');

// Run the benchmark
const instance = autocannon(config, (err, result) => {
  if (err) {
    console.error('❌ Benchmark failed:', err);
    process.exit(1);
  }

  // Display results
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Results Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total Requests:    ${result.requests.total}`);
  console.log(`  Requests/sec:      ${result.requests.average}`);
  console.log(`  Throughput:        ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`  Latency (avg):     ${result.latency.mean.toFixed(2)} ms`);
  console.log(`  Latency (p50):     ${result.latency.p50.toFixed(2)} ms`);
  console.log(`  Latency (p97.5):   ${result.latency.p97_5.toFixed(2)} ms`);
  console.log(`  Latency (p99):     ${result.latency.p99.toFixed(2)} ms`);
  console.log(`  Latency (max):     ${result.latency.max.toFixed(2)} ms`);
  console.log(`  Errors:            ${result.errors}`);
  console.log(`  Timeouts:          ${result.timeouts}`);
  console.log(`  Non-2xx responses: ${result.non2xx}`);
  
  // Status code breakdown
  if (result['2xx']) console.log(`  2xx responses:     ${result['2xx']}`);
  if (result['4xx']) console.log(`  4xx responses:     ${result['4xx']}`);
  if (result['5xx']) console.log(`  5xx responses:     ${result['5xx']}`);
  
  console.log('═══════════════════════════════════════════════════════════\n');

  // Performance assessment
  const avgLatency = result.latency.mean;
  const p95Latency = result.latency.p97_5;
  
  console.log('Performance Assessment:');
  if (avgLatency <= 100) {
    console.log('  ✅ Average latency: EXCELLENT (<100ms)');
  } else if (avgLatency <= 500) {
    console.log('  ✅ Average latency: GOOD (100-500ms)');
  } else if (avgLatency <= 2000) {
    console.log('  ⚠️  Average latency: ACCEPTABLE (500-2000ms)');
  } else {
    console.log('  ❌ Average latency: POOR (>2000ms) - Needs optimization!');
  }

  if (p95Latency <= 2000) {
    console.log('  ✅ P95 latency: MEETS TARGET (≤2000ms)');
  } else {
    console.log('  ❌ P95 latency: EXCEEDS TARGET (>2000ms) - Needs optimization!');
  }

  if (result.errors === 0 && result.timeouts === 0) {
    console.log('  ✅ No errors or timeouts');
  } else {
    console.log(`  ⚠️  Errors: ${result.errors}, Timeouts: ${result.timeouts}`);
  }

  // Note about 404s
  if (result.non2xx > 0) {
    console.log(`  ℹ️  ${result.non2xx} non-2xx responses (likely 404s if policy IDs don't exist)`);
  }

  console.log('\n');

  // Save results to file
  saveResults(result);

  // Exit with appropriate code (ignore 404s for exit code)
  const hasPerformanceIssues = avgLatency > 2000 || p95Latency > 2000;
  const hasErrors = result.errors > 0 || result.timeouts > 0;
  process.exit(hasPerformanceIssues || hasErrors ? 1 : 0);
});

// Track progress
autocannon.track(instance, { renderProgressBar: true });

/**
 * Save benchmark results to JSON file
 */
function saveResults(result) {
  try {
    const benchmarksDir = path.join(__dirname, '..', '..', 'benchmarks');
    if (!fs.existsSync(benchmarksDir)) {
      fs.mkdirSync(benchmarksDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `policy-details-${timestamp}.json`;
    const filepath = path.join(benchmarksDir, filename);

    const summary = {
      timestamp: new Date().toISOString(),
      endpoint: '/api/policies/:id',
      policyIds: SAMPLE_POLICY_IDS,
      duration: DURATION,
      connections: CONNECTIONS,
      totalRequests: result.requests.total,
      requestsPerSec: result.requests.average,
      throughputMBps: (result.throughput.average / 1024 / 1024).toFixed(2),
      latency: {
        mean: result.latency.mean,
        p50: result.latency.p50,
        p75: result.latency.p75,
        p90: result.latency.p90,
        p95: result.latency.p95,
        p99: result.latency.p99,
        max: result.latency.max
      },
      errors: result.errors,
      timeouts: result.timeouts,
      non2xx: result.non2xx,
      statusCodes: {
        '2xx': result['2xx'] || 0,
        '4xx': result['4xx'] || 0,
        '5xx': result['5xx'] || 0
      },
      fullResults: result
    };

    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
    console.log(`📊 Results saved to: ${filepath}\n`);

    // Also save as "latest" for easy reference
    const latestPath = path.join(benchmarksDir, 'policy-details-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(summary, null, 2));

  } catch (error) {
    console.error('Failed to save results:', error.message);
  }
}
