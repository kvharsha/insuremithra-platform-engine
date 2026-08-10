#!/usr/bin/env node
/**
 * Policy Search Load Test
 * Uses autocannon to benchmark GET /api/policies/search endpoint
 * 
 * Usage: node policy-search-autocannon.js
 * or: npm run bench:search
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';
const DURATION = parseInt(process.env.BENCH_DURATION) || 30; // seconds
const CONNECTIONS = parseInt(process.env.BENCH_CONNECTIONS) || 50;
const PIPELINING = parseInt(process.env.BENCH_PIPELINING) || 1;

// Autocannon configuration
const config = {
  url: BASE_URL,
  connections: CONNECTIONS,
  pipelining: PIPELINING,
  duration: DURATION,
  requests: [
    {
      method: 'GET',
      path: '/api/policies/search',
    },
    {
      method: 'GET',
      path: '/api/policies/search?type=health',
    },
    {
      method: 'GET',
      path: '/api/policies/search?provider=StarHealth',
    },
    {
      method: 'GET',
      path: '/api/policies/search?premium_max=50000',
    }
  ]
};

console.log('═══════════════════════════════════════════════════════════');
console.log('  Policy Search Load Test');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Target:       ${BASE_URL}/api/policies/search`);
console.log(`  Duration:     ${DURATION} seconds`);
console.log(`  Connections:  ${CONNECTIONS}`);
console.log(`  Pipelining:   ${PIPELINING}`);
console.log('═══════════════════════════════════════════════════════════\n');

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

  console.log('\n');

  // Save results to file
  saveResults(result);

  // Exit with appropriate code
  process.exit(avgLatency > 2000 || p95Latency > 2000 ? 1 : 0);
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
    const filename = `policy-search-${timestamp}.json`;
    const filepath = path.join(benchmarksDir, filename);

    const summary = {
      timestamp: new Date().toISOString(),
      endpoint: '/api/policies/search',
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
      fullResults: result
    };

    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
    console.log(`📊 Results saved to: ${filepath}\n`);

    // Also save as "latest" for easy reference
    const latestPath = path.join(benchmarksDir, 'policy-search-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(summary, null, 2));

  } catch (error) {
    console.error('Failed to save results:', error.message);
  }
}
