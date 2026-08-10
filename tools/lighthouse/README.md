# Lighthouse Performance Testing Guide

This guide explains how to use Google Lighthouse to measure and verify the frontend performance of InsureMithra.

## Overview

Lighthouse is an automated tool for improving the quality of web pages. It audits performance, accessibility, progressive web apps, SEO, and more.

## Installation

### Chrome DevTools (Built-in)
Lighthouse is built into Chrome DevTools (Chrome 60+). No installation needed.

### CLI Installation
```bash
npm install -g lighthouse
# or
yarn global add lighthouse
```

### CI/CD Integration
```bash
npm install --save-dev lighthouse
```

## Running Lighthouse

### Method 1: Chrome DevTools (Recommended for Development)

1. Open Chrome and navigate to your application: `http://localhost:3000`
2. Open Chrome DevTools (F12 or Cmd+Option+I on Mac)
3. Click on the **Lighthouse** tab
4. Select categories to audit (Performance, Accessibility, Best Practices, SEO)
5. Select device: **Desktop** or **Mobile**
6. Click **Generate report**

### Method 2: Command Line

#### Test Production Build
```bash
# First, build the frontend
cd frontend
npm run build

# Serve the build (if not already served)
# Use a static server like serve
npx serve -s build -p 3000

# Run Lighthouse (in another terminal)
lighthouse http://localhost:3000 \
  --output=json \
  --output=html \
  --output-path=../benchmarks/lighthouse-report \
  --chrome-flags="--headless"
```

#### Test Specific Pages
```bash
# Test policy search page
lighthouse http://localhost:3000/policies \
  --output=html \
  --output-path=../benchmarks/lighthouse-policies.html

# Test policy purchase flow
lighthouse http://localhost:3000/policy/purchase \
  --output=html \
  --output-path=../benchmarks/lighthouse-purchase.html
```

### Method 3: Programmatic (CI/CD)

Create a test script `tools/lighthouse/run-lighthouse.js`:

```javascript
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port
  };
  
  const runnerResult = await lighthouse(url, options);
  
  // Save results
  const reportJson = runnerResult.report;
  fs.writeFileSync('benchmarks/lighthouse-ci.json', reportJson);
  
  await chrome.kill();
  
  // Extract scores
  const results = JSON.parse(reportJson);
  return results.categories.performance.score * 100;
}

runLighthouse('http://localhost:3000').then(score => {
  console.log(`Performance score: ${score}`);
  process.exit(score < 90 ? 1 : 0); // Fail if score < 90
});
```

## Performance Targets

### Target Scores (Production Build)

| Category | Target Score | Description |
|----------|--------------|-------------|
| **Performance** | ≥ 90 | Overall performance score |
| **Accessibility** | ≥ 90 | Accessibility compliance |
| **Best Practices** | ≥ 90 | Modern web standards |
| **SEO** | ≥ 80 | Search engine optimization |

### Key Metrics Targets

Based on Epic 4 Story 1 requirements (≤ 2 seconds for main flows):

| Metric | Target (Mobile) | Target (Desktop) | Description |
|--------|----------------|------------------|-------------|
| **First Contentful Paint (FCP)** | ≤ 1.8s | ≤ 0.9s | Time to first content render |
| **Largest Contentful Paint (LCP)** | ≤ 2.5s | ≤ 2.0s | Time to largest content render |
| **Time to Interactive (TTI)** | ≤ 3.8s | ≤ 2.5s | Time until page is fully interactive |
| **Speed Index** | ≤ 3.4s | ≤ 2.0s | How quickly content is visually displayed |
| **Total Blocking Time (TBT)** | ≤ 200ms | ≤ 150ms | Total time page is blocked from user input |
| **Cumulative Layout Shift (CLS)** | ≤ 0.1 | ≤ 0.1 | Visual stability score |

## Key Areas to Optimize

### 1. JavaScript Bundle Size
- Code-splitting with React.lazy()
- Tree-shaking unused code
- Minimize third-party dependencies

### 2. Image Optimization
- Use modern formats (WebP, AVIF)
- Proper sizing with `srcset`
- Lazy loading with `loading="lazy"`

### 3. Caching Strategy
- Long cache for static assets (1 year)
- Service worker for offline capability
- Proper Cache-Control headers

### 4. Critical Rendering Path
- Inline critical CSS
- Defer non-critical JavaScript
- Minimize render-blocking resources

### 5. Network Performance
- Enable gzip/brotli compression
- Use CDN for static assets
- Minimize HTTP requests

## Interpreting Results

### Score Ranges
- **90-100**: Good - meets targets
- **50-89**: Needs improvement
- **0-49**: Poor - requires immediate attention

### Common Issues & Fixes

#### Low FCP/LCP
```
Issue: Large JavaScript bundles blocking render
Fix: Implement code-splitting, defer non-critical JS
```

#### High TBT
```
Issue: Long JavaScript execution on main thread
Fix: Break up long tasks, use web workers
```

#### High CLS
```
Issue: Images without dimensions, dynamic content
Fix: Set width/height on images, reserve space for dynamic content
```

## Baseline Reports

Before implementing caching and performance improvements (Epic 4 Story 1), capture baseline metrics:

```bash
# Capture baseline before changes
lighthouse http://localhost:3000 \
  --output=json \
  --output-path=benchmarks/lighthouse-baseline.json

# After implementing improvements
lighthouse http://localhost:3000 \
  --output=json \
  --output-path=benchmarks/lighthouse-after-caching.json
```

### Example Baseline Structure

Store in `benchmarks/baseline-metrics.json`:
```json
{
  "date": "2025-11-15",
  "version": "before-epic4-story1",
  "url": "http://localhost:3000",
  "device": "desktop",
  "scores": {
    "performance": 75,
    "accessibility": 92,
    "bestPractices": 88,
    "seo": 85
  },
  "metrics": {
    "fcp": 1.2,
    "lcp": 3.5,
    "tti": 4.2,
    "speedIndex": 2.8,
    "tbt": 250,
    "cls": 0.15
  }
}
```

## Continuous Integration

Add to your CI pipeline (`.github/workflows/lighthouse-ci.yml`):

```yaml
name: Lighthouse CI
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Build frontend
        run: cd frontend && npm run build
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
```

## Budget Configuration

Create `lighthouserc.json` to enforce performance budgets:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["error", {"maxNumericValue": 3000}],
        "speed-index": ["error", {"maxNumericValue": 3400}]
      }
    }
  }
}
```

## Comparison Tools

Compare before/after reports:

```bash
# Install lighthouse-ci CLI
npm install -g @lhci/cli

# Compare two reports
lhci compare \
  --baseReport=benchmarks/lighthouse-baseline.json \
  --currentReport=benchmarks/lighthouse-after-caching.json
```

## Resources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Performance Budgets](https://web.dev/performance-budgets-101/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

## Troubleshooting

### Chrome Not Found
```bash
# macOS
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Linux
export CHROME_PATH="/usr/bin/google-chrome"
```

### Port Already in Use
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Inconsistent Scores
- Run multiple times and average (Lighthouse has ±5 point variance)
- Ensure no other processes are consuming CPU
- Use headless mode for consistency
- Test on similar hardware/network conditions

---

**Next Steps**: After implementing Epic 4 Story 1 caching improvements, re-run Lighthouse and document the performance gains in the PR.
