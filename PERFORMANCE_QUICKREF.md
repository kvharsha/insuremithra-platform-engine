# Performance & Caching Quick Reference

## 🚀 Quick Commands

```bash
# Install dependencies
npm install

# Start with Redis (recommended)
brew install redis && brew services start redis
npm start

# Start without Redis (uses LRU cache)
npm start

# Run performance tests
npm test tests/perf.cache.test.js
npm test tests/perf.latency.test.js

# Run benchmarks
npm run bench:search
npm run bench:details

# Check performance metrics
curl http://localhost:5001/api/health/perf

# View logs
tail -f logs/perf.log
```

## 📊 Cached Endpoints

| Endpoint | TTL | Cache Key Pattern |
|----------|-----|------------------|
| `GET /api/policies/search` | 60s | `policies:search:<query>` |
| `GET /api/policies/:id` | 300s | `policy:detail:<id>` |
| `GET /api/purchases/my` | 30s | `user:purchases:<userId>` |
| `GET /api/claims` | 30s | `user:claims:<userId>` |

## 🔧 Environment Variables

```bash
# Required
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/insuremithra

# Optional (fallback to LRU if not set)
REDIS_URL=redis://localhost:6379

# Cache TTLs (seconds)
CACHE_DEFAULT_TTL=300
CACHE_POLICY_SEARCH_TTL=60
CACHE_POLICY_DETAIL_TTL=300
CACHE_USER_PURCHASES_TTL=30

# Performance
ENABLE_COMPRESSION=true
```

## 📈 Response Headers

Check these headers in browser DevTools Network tab:

- **X-Cache**: `HIT` or `MISS` - Indicates cache status
- **X-Cache-Key**: Cache key used
- **X-Response-Time**: Response duration in ms
- **Cache-Control**: Static asset caching
- **Vary**: `Accept-Encoding` for compression

## 🎯 Performance Targets

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Response Time | ≤ 2000ms | `npm run bench:search` |
| Cache Hit Rate | > 70% | Check `/api/health/perf` |
| Lighthouse Score | ≥ 90 | Run Lighthouse in Chrome |
| FCP | ≤ 1.8s | Lighthouse metrics |
| LCP | ≤ 2.5s | Lighthouse metrics |

## 🔍 Debugging

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Check cache stats
curl http://localhost:5001/api/health/perf | jq '.cache'

# View slow requests (>2s)
cat logs/perf.log | jq 'select(.responseTime > 2000)'

# Calculate average response time
cat logs/perf.log | jq -s 'map(.responseTime) | add/length'

# Monitor in real-time
tail -f logs/perf.log | jq -c '{url:.url, time:.responseTime}'
```

## 💡 Quick Tests

**Test cache is working:**
```bash
# First request (MISS)
curl -i http://localhost:5001/api/policies/search
# Look for: X-Cache: MISS

# Second request (HIT)
curl -i http://localhost:5001/api/policies/search
# Look for: X-Cache: HIT
```

**Test compression:**
```bash
curl -H "Accept-Encoding: gzip" -i http://localhost:5001/api/policies/search
# Look for: Vary: Accept-Encoding
```

**Test performance metrics:**
```bash
curl http://localhost:5001/api/health/perf | jq '.performance'
```

## 🛠️ Common Issues

| Issue | Solution |
|-------|----------|
| Always seeing `X-Cache: MISS` | Check Redis connection, verify GET requests |
| Redis connection error | Install/start Redis or remove REDIS_URL to use LRU |
| Slow responses | Check DB connection, run benchmarks, review logs |
| High memory usage | Reduce cache TTLs or switch to Redis |
| Stale data | Reduce TTL or manually clear cache |

## 📚 Documentation

- **[PERFORMANCE.md](PERFORMANCE.md)** - Complete guide
- **[tools/lighthouse/README.md](tools/lighthouse/README.md)** - Lighthouse testing
- **[EPIC4_STORY1_IMPLEMENTATION.md](EPIC4_STORY1_IMPLEMENTATION.md)** - Implementation details

## 🧪 Testing Checklist

- [ ] Run cache tests: `npm test tests/perf.cache.test.js`
- [ ] Run latency tests: `npm test tests/perf.latency.test.js`
- [ ] Benchmark search: `npm run bench:search` (avg < 2s)
- [ ] Benchmark details: `npm run bench:details` (avg < 2s)
- [ ] Check metrics endpoint works
- [ ] Verify cache headers in browser
- [ ] Test cache invalidation after updates
- [ ] Run Lighthouse (score ≥ 90)

## 🎨 Frontend Optimization

```typescript
// Use lazy loading
import { LazyImage } from './utils/imageHelper';

<LazyImage 
  src="/images/banner.jpg" 
  alt="Banner"
  placeholder="/images/placeholder.jpg"
/>

// Use responsive images
import { ResponsiveImage } from './utils/imageHelper';

<ResponsiveImage
  src="/images/hero.jpg"
  alt="Hero"
  widths={[320, 640, 1024, 1920]}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## 🔐 Cache Invalidation

```javascript
// Invalidate user cache after write operation
const { invalidateUserCache } = require('../middleware/cache.middleware');

await invalidateUserCache(userId);
// Clears: user:purchases:<userId>:*
//         user:claims:<userId>:*

// Invalidate policy cache
const { invalidatePolicyCache } = require('../middleware/cache.middleware');

await invalidatePolicyCache(policyId);
// Clears: policy:detail:*<policyId>*
//         policies:search:*
```

## 📞 Quick Help

```bash
# View all npm scripts
npm run

# Check versions
node --version
npm --version
redis-server --version

# Reset everything
rm -rf node_modules package-lock.json
npm install

# View real-time performance
watch -n 5 'curl -s http://localhost:5001/api/health/perf | jq'
```

---

**Last Updated**: November 15, 2025  
**Version**: 1.0.0 (Epic 4 Story 1)
