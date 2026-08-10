# Benchmark Results

This directory stores performance benchmark results from autocannon load tests and Lighthouse audits.

## Directory Structure

```
benchmarks/
├── README.md                           # This file
├── policy-search-latest.json          # Latest policy search benchmark
├── policy-details-latest.json         # Latest policy details benchmark
├── policy-search-YYYY-MM-DDTHH-MM-SS.json  # Timestamped results
├── policy-details-YYYY-MM-DDTHH-MM-SS.json # Timestamped results
├── lighthouse-baseline.json           # Before Epic 4 Story 1
├── lighthouse-after-caching.json      # After Epic 4 Story 1
└── baseline-metrics.json              # Reference baseline metrics
```

## Running Benchmarks

### Load Testing (Autocannon)

```bash
# Policy search endpoint
npm run bench:search

# Policy details endpoint
npm run bench:details

# Custom duration and connections
BENCH_DURATION=60 BENCH_CONNECTIONS=100 npm run bench:search
```

### Lighthouse Testing

```bash
# Via Chrome DevTools
# 1. Open http://localhost:3000
# 2. Open DevTools (F12)
# 3. Go to Lighthouse tab
# 4. Generate report

# Via CLI
lighthouse http://localhost:3000 \
  --output=json \
  --output-path=./benchmarks/lighthouse-report.json
```

## Interpreting Results

### Autocannon Results

```json
{
  "timestamp": "2025-11-15T10:30:00.000Z",
  "endpoint": "/api/policies/search",
  "totalRequests": 15000,
  "requestsPerSec": 500,
  "latency": {
    "mean": 145.32,
    "p50": 120.00,
    "p95": 350.00,
    "p99": 580.00
  }
}
```

**Good Performance**:
- Mean latency < 500ms
- P95 latency < 2000ms
- Zero errors/timeouts

**Needs Improvement**:
- Mean latency > 1000ms
- P95 latency > 2000ms
- High error rate

### Lighthouse Scores

**Target Scores**:
- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 80

**Key Metrics**:
- First Contentful Paint (FCP): ≤ 1.8s
- Largest Contentful Paint (LCP): ≤ 2.5s
- Time to Interactive (TTI): ≤ 3.8s
- Total Blocking Time (TBT): ≤ 200ms
- Cumulative Layout Shift (CLS): ≤ 0.1

## Baseline Metrics

Create a baseline before implementing optimizations:

```bash
# Capture baseline
npm run bench:search > benchmarks/baseline-before.txt
lighthouse http://localhost:3000 \
  --output=json \
  --output-path=benchmarks/lighthouse-baseline.json
```

**Example Baseline (`baseline-metrics.json`)**:
```json
{
  "date": "2025-11-15",
  "version": "before-epic4-story1",
  "backend": {
    "policySearch": {
      "avgLatency": 850,
      "p95Latency": 1500,
      "requestsPerSec": 200
    },
    "policyDetails": {
      "avgLatency": 450,
      "p95Latency": 900,
      "requestsPerSec": 300
    }
  },
  "frontend": {
    "performanceScore": 75,
    "fcp": 1.2,
    "lcp": 3.5,
    "tti": 4.2
  }
}
```

## Comparing Results

### Before vs After

```bash
# Load test comparison
diff <(jq '.latency' benchmarks/policy-search-before.json) \
     <(jq '.latency' benchmarks/policy-search-latest.json)

# Lighthouse comparison (using lhci)
lhci compare \
  --baseReport=benchmarks/lighthouse-baseline.json \
  --currentReport=benchmarks/lighthouse-after-caching.json
```

## Expected Improvements

After implementing Epic 4 Story 1:

**Backend (With Caching)**:
- 40-60% reduction in average latency
- 50-70% reduction in P95 latency
- 2-3x increase in requests/sec
- Cache hit rate > 70%

**Frontend (With Code Splitting)**:
- 20-30% faster FCP
- 30-40% reduction in initial bundle size
- 10-15 point Lighthouse score increase

## Continuous Monitoring

Add to CI/CD pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run benchmarks
        run: |
          npm install
          npm start &
          sleep 10
          npm run bench:search
          npm run bench:details
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: benchmark-results
          path: benchmarks/*.json
```

## Retention Policy

- Keep latest 10 timestamped results
- Keep all baseline results
- Keep all Lighthouse results
- Archive older results monthly

## Notes

- Results vary based on hardware/network
- Run multiple times and average
- Test on production-like environment
- Compare similar conditions (same hardware, network)
- Document any changes between runs

---

For detailed performance documentation, see [PERFORMANCE.md](../PERFORMANCE.md)
