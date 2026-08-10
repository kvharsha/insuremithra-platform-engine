# Performance Improvement & Caching Guide

**Epic 4 Story 1**: IN41 - Performance Improvements & Caching

This document explains the performance optimizations implemented in InsureMithra to ensure main user flows respond within ≤ 2 seconds.

## Table of Contents

- [Overview](#overview)
- [Server-Side Caching](#server-side-caching)
- [Frontend Optimizations](#frontend-optimizations)
- [Performance Testing](#performance-testing)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

### Performance Targets

| Flow | Target Response Time | Status |
|------|---------------------|--------|
| Policy Search → Details | ≤ 2 seconds | ✅ Implemented |
| Policy Details → Purchase UI | ≤ 2 seconds | ✅ Implemented |
| User Purchases List | ≤ 2 seconds | ✅ Implemented |
| Static Assets | Long-term cached | ✅ Implemented |

### Key Improvements

1. **Server-side caching** with Redis (fallback to LRU cache)
2. **Gzip compression** for all responses
3. **Cache-Control headers** for static assets
4. **Frontend code-splitting** with React.lazy
5. **Image lazy loading** utilities
6. **Response time profiling** and metrics

## Server-Side Caching

### Architecture

```
Request → Cache Middleware → Check Cache → [HIT] → Return Cached Response
                                          ↓ [MISS]
                                    Execute Controller
                                          ↓
                                    Cache Response → Return Response
```

### Cache Service

The cache service (`services/cache.service.js`) provides:

- **Redis connection** with automatic fallback to in-memory LRU cache
- **TTL-based expiration** for all cached entries
- **Wildcard deletion** for cache invalidation
- **Wrap function** for easy caching of expensive operations

#### Basic Usage

```javascript
const cache = require('./services/cache.service');

// Set a value
await cache.set('key', { data: 'value' }, 300); // 300 seconds TTL

// Get a value
const value = await cache.get('key');

// Delete a value
await cache.del('key');

// Delete with pattern
await cache.del('user:*');

// Wrap expensive function
const result = await cache.wrap('expensive-key', 60, async () => {
  return await expensiveOperation();
});
```

### Cached Endpoints

| Endpoint | Cache Key Pattern | TTL | Invalidation Trigger |
|----------|------------------|-----|---------------------|
| `GET /api/policies/search` | `policies:search:<query>` | 60s | Policy update |
| `GET /api/policies/:id` | `policy:detail:<id>` | 300s | Policy update |
| `GET /api/purchases/my` | `user:purchases:<userId>` | 30s | Purchase completion |
| `GET /api/claims` | `user:claims:<userId>` | 30s | Claim submission/update |

### Cache Headers

All cached responses include:

- `X-Cache: HIT|MISS` - Indicates if response was served from cache
- `X-Cache-Key: <key>` - Shows the cache key used
- `X-Response-Time: <ms>ms` - Response time in milliseconds

### Cache Invalidation

Cache is automatically invalidated on write operations:

**Purchase Completion**:
```javascript
await invalidateUserCache(userId);
// Clears: user:purchases:<userId>:*
//         user:claims:<userId>:*
```

**Claim Submission**:
```javascript
await invalidateUserCache(userId);
```

**Policy Update** (if implemented):
```javascript
await invalidatePolicyCache(policyId);
// Clears: policy:detail:*<policyId>*
//         policies:search:*
```

## Frontend Optimizations

### Code Splitting

Heavy pages are lazy-loaded using `React.lazy()`:

```typescript
const Policies = lazy(() => import('./pages/Policies'));
const PolicyPurchase = lazy(() => import('./pages/PolicyPurchase'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Wrapped in Suspense
<Suspense fallback={<LoadingFallback />}>
  <Routes>
    <Route path="/policies" element={<Policies />} />
  </Routes>
</Suspense>
```

**Benefits**:
- Reduced initial bundle size
- Faster First Contentful Paint (FCP)
- On-demand loading of admin features

### Image Optimization

Use the `LazyImage` component for automatic lazy loading:

```typescript
import { LazyImage } from './utils/imageHelper';

<LazyImage
  src="/images/policy-banner.jpg"
  alt="Policy Banner"
  placeholder="/images/placeholder.jpg"
/>
```

**Features**:
- IntersectionObserver-based loading
- Automatic fallback for unsupported browsers
- Fade-in transition on load
- Native `loading="lazy"` attribute

### Responsive Images

```typescript
import { ResponsiveImage } from './utils/imageHelper';

<ResponsiveImage
  src="/images/hero.jpg"
  alt="Hero"
  widths={[320, 640, 1024, 1920]}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## Performance Testing

### Automated Tests

Run performance tests:

```bash
# Cache functionality tests
npm test tests/perf.cache.test.js

# Response time tests
npm test tests/perf.latency.test.js

# All tests
npm test
```

### Load Testing

#### Policy Search Benchmark

```bash
npm run bench:search

# Custom configuration
BENCH_DURATION=60 BENCH_CONNECTIONS=100 npm run bench:search
```

**Output**:
- Requests/second
- Average latency
- P50, P95, P99 latencies
- Error rate
- Pass/fail based on ≤2000ms target

#### Policy Details Benchmark

```bash
npm run bench:details

# With specific policy IDs
POLICY_IDS=abc123,def456 npm run bench:details
```

### Lighthouse Testing

See [`tools/lighthouse/README.md`](tools/lighthouse/README.md) for detailed Lighthouse testing instructions.

```bash
# Quick test
lighthouse http://localhost:3000 --view

# Save report
lighthouse http://localhost:3000 \
  --output=html \
  --output-path=./benchmarks/lighthouse-report.html
```

**Target Scores**:
- Performance: ≥ 90
- FCP: ≤ 1.8s (mobile), ≤ 0.9s (desktop)
- LCP: ≤ 2.5s (mobile), ≤ 2.0s (desktop)

## Configuration

### Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

**Cache Configuration**:

```bash
# Redis (optional - will use LRU cache if not provided)
REDIS_URL=redis://localhost:6379

# TTL values (seconds)
CACHE_DEFAULT_TTL=300
CACHE_POLICY_SEARCH_TTL=60
CACHE_POLICY_DETAIL_TTL=300
CACHE_USER_PURCHASES_TTL=30

# Compression
ENABLE_COMPRESSION=true
```

### Redis Setup

#### Local Redis (macOS)

```bash
# Install via Homebrew
brew install redis

# Start Redis
brew services start redis

# Verify
redis-cli ping
# Should return: PONG
```

#### Docker Redis

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

#### Redis Cloud (Production)

1. Sign up at [Redis Cloud](https://redis.com/try-free/)
2. Create a database
3. Copy connection string
4. Set `REDIS_URL` in `.env`

### Without Redis

If Redis is not available, the system automatically falls back to an in-memory LRU cache:

- Max 500 items
- Max 50MB memory
- Default 5-minute TTL
- No persistence (clears on restart)

## Monitoring

### Performance Metrics Endpoint

```bash
curl http://localhost:5001/api/health/perf
```

**Response**:
```json
{
  "success": true,
  "performance": {
    "timeWindow": "5 minutes",
    "totalRequests": 1250,
    "avgResponseTime": "145.32",
    "p50": "120.00",
    "p95": "350.00",
    "p99": "580.00",
    "slowRequests": 3,
    "requestsByMethod": { "GET": 1100, "POST": 150 },
    "requestsByStatus": { "2xx": 1200, "4xx": 30, "5xx": 20 }
  },
  "slowRequests": [
    {
      "timestamp": "2025-11-15T10:30:00.000Z",
      "method": "GET",
      "url": "/api/policies/search?type=health",
      "responseTime": 2150,
      "status": 200
    }
  ],
  "cache": {
    "type": "redis",
    "connected": true,
    "status": "ready"
  }
}
```

### Performance Logs

View performance logs:

```bash
# Tail performance log
tail -f logs/perf.log

# Analyze slow requests
cat logs/perf.log | jq 'select(.responseTime > 2000)'

# Average response time
cat logs/perf.log | jq -s 'map(.responseTime) | add/length'
```

### Cache Statistics

Check cache stats in code:

```javascript
const cache = require('./services/cache.service');

const stats = cache.getStats();
console.log(stats);
// { type: 'redis', connected: true, status: 'ready' }
// or
// { type: 'lru', size: 150, maxSize: 500, calculatedSize: 1024000 }
```

## Troubleshooting

### Cache Not Working

**Symptom**: Always seeing `X-Cache: MISS`

**Solutions**:
1. Check Redis connection:
   ```bash
   redis-cli ping
   ```
2. Verify environment variables are set
3. Check logs for cache errors:
   ```bash
   tail -f logs/combined.log | grep cache
   ```
4. Ensure you're making GET requests (POST/PUT/DELETE are not cached)

### Slow Response Times

**Symptom**: Latency > 2000ms

**Solutions**:
1. Check performance metrics endpoint
2. Review slow requests log
3. Verify database indexes exist
4. Check network latency to MongoDB/Redis
5. Run benchmarks to identify bottlenecks

### Redis Connection Issues

**Symptom**: `Redis connection error` in logs

**Solutions**:
1. Verify Redis is running:
   ```bash
   redis-cli ping
   ```
2. Check `REDIS_URL` format:
   ```
   redis://localhost:6379          # Local
   redis://:password@host:port     # With auth
   ```
3. Allow fallback to LRU by removing `REDIS_URL` temporarily

### Memory Issues

**Symptom**: High memory usage

**Solutions**:
1. Check LRU cache size:
   ```javascript
   cache.getStats();
   ```
2. Reduce TTL values to expire cache sooner
3. Reduce max cache size in `cache.service.js`
4. Switch to Redis for better memory management

### Stale Cache Data

**Symptom**: Seeing outdated information

**Solutions**:
1. Verify cache invalidation is working:
   ```javascript
   await invalidateUserCache(userId);
   ```
2. Reduce TTL for frequently changing data
3. Manually clear cache:
   ```javascript
   await cache.clear();
   ```

## Best Practices

### When to Cache

✅ **DO cache**:
- Public data (policy listings, details)
- User-specific lists with short TTL
- Expensive calculations
- External API responses

❌ **DON'T cache**:
- Sensitive user data without user-specific keys
- Real-time data (live prices, availability)
- Data that changes frequently (< 30 seconds)
- POST/PUT/DELETE responses

### Cache Key Design

**Good**:
```javascript
user:purchases:${userId}:query:${queryHash}
policy:detail:${policyId}
policies:search:${queryString}
```

**Bad**:
```javascript
purchases                  // Not user-specific
policy                     // Not specific enough
data:${timestamp}          // Time-based keys don't benefit from caching
```

### TTL Selection

| Data Type | Recommended TTL | Reason |
|-----------|----------------|--------|
| Static content | 1 year | Immutable after deploy |
| Policy listings | 60 seconds | Balance freshness & perf |
| Policy details | 5 minutes | Rarely changes |
| User purchases | 30 seconds | May change on payment |
| Search results | 60 seconds | Tolerate slight staleness |

## Performance Checklist

Before deploying to production:

- [ ] Redis configured and connected
- [ ] Environment variables set correctly
- [ ] Cache invalidation tested
- [ ] Load tests pass (avg latency < 2s)
- [ ] Lighthouse score ≥ 90
- [ ] Compression enabled
- [ ] Static assets have Cache-Control headers
- [ ] Frontend code-split
- [ ] Images lazy-loaded
- [ ] Performance logs monitored

## Further Optimizations

Future improvements to consider:

1. **Database Indexing**: Add indexes on frequently queried fields
2. **CDN**: Use CDN for static assets
3. **Service Workers**: Add offline capability
4. **HTTP/2**: Enable HTTP/2 on production server
5. **Database Connection Pooling**: Optimize MongoDB connections
6. **API Rate Limiting per User**: Prevent abuse while allowing bursts
7. **GraphQL**: Consider for complex data requirements
8. **WebSockets**: For real-time features (claim status updates)

## References

- [Epic 4 Story 1 Requirements](EPIC4_STORY1_REQUIREMENTS.md)
- [Lighthouse Testing Guide](tools/lighthouse/README.md)
- [Redis Documentation](https://redis.io/docs/)
- [Web Performance Best Practices](https://web.dev/fast/)

---

**Last Updated**: 2025-11-15  
**Version**: 1.0.0 (Epic 4 Story 1)
