# Downtime Monitoring & Alerting System

**Epic 4 Story 2**: Automated Downtime Detection and Alerting  
**SRS Reference**: INS-NFR-04  
**Story Points**: 2 SP

## Overview

This feature implements an automated downtime monitoring system that continuously checks service health and sends alerts when downtime is detected. The system runs scheduled health checks every 10 minutes and triggers email alerts when a service is unreachable for more than 5 minutes.

## Features

- ✅ **Automated Health Checks**: Runs every 10 minutes (configurable)
- ✅ **Smart Alerting**: Sends email alerts only when downtime exceeds threshold (5 minutes default)
- ✅ **No Duplicate Alerts**: One alert per incident, with recovery notifications
- ✅ **Persistent Storage**: All incidents logged to DB and file system
- ✅ **Admin Dashboard**: View downtime history, stats, and trigger manual checks
- ✅ **Webhook Support**: Optional integration with Slack/PagerDuty
- ✅ **Comprehensive Testing**: Full test suite with unit and integration tests

## Architecture

### Components

1. **Health Service** (`services/health.service.js`)
   - Performs HTTP health checks with configurable timeout
   - Returns detailed results (status, latency, error details)

2. **Downtime Detection** (`services/downtime.service.js`)
   - Maintains state for each monitored service
   - Tracks consecutive failures and downtime duration
   - Creates/closes incidents based on threshold

3. **Alert Service** (`services/alert.service.js`)
   - Sends email alerts using configured SMTP
   - Optional webhook notifications
   - Handles both downtime and recovery alerts

4. **Scheduler** (`scheduler/downtimeMonitor.js`)
   - Uses node-cron for periodic health checks
   - Runs initial check on server startup
   - Integrates all services

5. **Data Model** (`models/downtime.model.js`)
   - Stores incident history with timestamps
   - Tracks alert status to prevent duplicates

6. **Admin Routes** (`routes/admin.routes.js`)
   - GET `/api/admin/downtimes` - View incident history
   - POST `/api/admin/downtimes/test` - Manual health check
   - GET `/api/admin/downtimes/stats` - Statistics
   - GET `/api/admin/downtimes/monitor/config` - Configuration

## Configuration

### Environment Variables (.env)

```env
# Comma-separated list of service URLs to monitor
MONITOR_SERVICES=http://localhost:5001/api/health

# How often to run health checks (in minutes)
MONITOR_INTERVAL_MINUTES=10

# How long a service must be down before alerting (in milliseconds)
DOWN_ALERT_THRESHOLD_MS=300000

# Health check request timeout (in milliseconds)
HEALTH_CHECK_TIMEOUT_MS=5000

# Comma-separated admin email addresses for alerts
ALERT_EMAILS=admin@insuremithra.com

# Optional: Webhook URL for Slack/PagerDuty integration
# ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install node-cron --save
```

### 2. Configure Environment

Update your `.env` file with the monitoring configuration above. Make sure to set:
- `ALERT_EMAILS` with actual admin email addresses
- `MONITOR_SERVICES` with services to monitor

### 3. Start Server

The monitor starts automatically when the server starts:

```bash
npm start
```

You should see:
```
✅ Connected to MongoDB successfully
✅ Downtime monitor started successfully
```

## Usage

### Automated Monitoring

The system runs automatically once started. No manual intervention needed.

### Manual Health Check

**Via API (Admin Only)**:
```bash
curl -X POST http://localhost:5001/api/admin/downtimes/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Via npm script**:
```bash
npm run monitor:test
```

### View Downtime History

**Get all incidents**:
```bash
curl http://localhost:5001/api/admin/downtimes \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Get statistics**:
```bash
curl http://localhost:5001/api/admin/downtimes/stats?days=30 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Testing

### Run All Tests

```bash
# Run downtime-specific tests with coverage
npm run test:downtime

# Run all tests
npm test
```

### Test Coverage

The test suite includes:

1. **Unit Tests**:
   - Health check service (success, failure, timeout, connection refused)
   - Downtime detection logic
   - Alert threshold detection
   - Incident lifecycle (create, update, close)

2. **Integration Tests**:
   - Full downtime-recovery cycle
   - Multiple service monitoring
   - Alert deduplication

3. **API Tests**:
   - Admin-only access control
   - Incident history pagination
   - Manual health check trigger
   - Statistics endpoints

### Test Results

Expected coverage: **>80%** for all monitoring components

## Alert Examples

### Downtime Alert Email

Subject: `🚨 Service Downtime Alert - http://localhost:5001/api/health`

Content includes:
- Service name/URL
- Downtime start time
- Duration
- Error details
- Incident ID
- Link to admin dashboard

### Recovery Email

Subject: `✅ Service Recovered - http://localhost:5001/api/health`

Content includes:
- Recovery timestamp
- Total downtime duration
- Link to incident details

## Logging

### File Logs

All incidents are logged to `logs/downtime.log` as JSON lines:

```json
{"event":"DOWNTIME_DETECTED","service":"http://localhost:5001/api/health","startAt":"2025-11-17T13:30:00.000Z","details":"Connection refused","consecutiveFailures":3,"timeSinceSuccessMs":305000,"timestamp":"2025-11-17T13:30:05.123Z"}
```

### Database Storage

Incidents are stored in the `downtimes` collection with:
- `service`: URL of the monitored service
- `startAt`: When downtime began
- `endAt`: When service recovered (null if ongoing)
- `durationMs`: Total downtime duration
- `status`: 'down', 'ongoing', or 'recovered'
- `details`: Error message or context
- `alertSent`: Whether alert email was sent
- `recoverySent`: Whether recovery email was sent

## Monitoring Best Practices

### 1. Set Appropriate Thresholds

- **Short checks (1-2 min)**: For critical services requiring immediate response
- **Standard (5-10 min)**: Most production services
- **Long checks (15-30 min)**: Non-critical services

### 2. Multiple Services

Monitor multiple endpoints:
```env
MONITOR_SERVICES=http://api.insuremithra.com/health,http://api.insuremithra.com/db-health,http://backup-api.insuremithra.com/health
```

### 3. Alert Fatigue Prevention

- System sends ONE alert per incident
- No repeated emails for ongoing downtime
- Recovery notification confirms resolution

### 4. Integration with External Tools

Configure webhook for Slack notifications:
```env
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Troubleshooting

### Monitor Not Starting

**Check logs for errors**:
```bash
tail -f logs/combined.log
```

**Verify cron expression**:
```bash
npm run monitor:test
```

### No Alerts Received

1. **Check email configuration**:
   - Verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env`
   - Test with password reset email

2. **Check ALERT_EMAILS**:
   ```bash
   echo $ALERT_EMAILS
   ```

3. **Review downtime logs**:
   ```bash
   cat logs/downtime.log
   ```

### False Positives

If getting alerts for healthy services:

1. **Increase threshold**:
   ```env
   DOWN_ALERT_THRESHOLD_MS=600000  # 10 minutes
   ```

2. **Increase timeout**:
   ```env
   HEALTH_CHECK_TIMEOUT_MS=10000  # 10 seconds
   ```

## Performance Considerations

- Health checks run in parallel (non-blocking)
- Async alert sending doesn't block monitoring
- In-memory state is lightweight
- DB writes are batched for incidents
- File logging is append-only (fast)

## Security

- Admin-only access to downtime endpoints (role check)
- JWT authentication required
- Rate limiting on admin routes
- Sanitized error messages in alerts

## Future Enhancements

- [ ] SMS/Phone call alerts for critical services
- [ ] Customizable alert templates per service
- [ ] Escalation policies (notify manager if unresolved >1 hour)
- [ ] Dashboard widgets showing real-time status
- [ ] Historical uptime percentage calculations
- [ ] SLA tracking and reporting

## API Reference

### GET /api/admin/downtimes

Get downtime incident history.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `service` (string): Filter by service URL
- `status` (string): Filter by status (down/ongoing/recovered)

**Response**:
```json
{
  "success": true,
  "data": {
    "incidents": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 50,
      "pages": 2
    }
  }
}
```

### POST /api/admin/downtimes/test

Manually trigger a health check for all monitored services.

**Response**:
```json
{
  "success": true,
  "message": "Health check completed",
  "data": {
    "timestamp": "2025-11-17T13:30:00.000Z",
    "results": [
      {
        "serviceUrl": "http://localhost:5001/api/health",
        "success": true
      }
    ],
    "triggeredBy": "admin@insuremithra.com"
  }
}
```

### GET /api/admin/downtimes/stats

Get downtime statistics for a time period.

**Query Parameters**:
- `days` (number): Number of days to include (default: 30)

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "Last 30 days",
    "totalIncidents": 5,
    "ongoingIncidents": 0,
    "recoveredIncidents": 5,
    "avgDurationMs": 180000,
    "byService": [
      {
        "_id": "http://api.insuremithra.com/health",
        "count": 3,
        "totalDowntime": 540000
      }
    ]
  }
}
```

### GET /api/admin/downtimes/monitor/config

Get current monitor configuration and service states.

**Response**:
```json
{
  "success": true,
  "data": {
    "config": {
      "intervalMinutes": 10,
      "thresholdMs": 300000,
      "timeoutMs": 5000,
      "services": ["http://localhost:5001/api/health"],
      "alertEmails": "admin@insuremithra.com",
      "isRunning": true
    },
    "serviceStates": [
      {
        "url": "http://localhost:5001/api/health",
        "lastSuccessAt": "2025-11-17T13:30:00.000Z",
        "lastCheckAt": "2025-11-17T13:30:00.000Z",
        "consecutiveFailures": 0,
        "isDown": false,
        "currentIncident": null
      }
    ],
    "timestamp": "2025-11-17T13:30:00.000Z"
  }
}
```

## Support

For issues or questions:
- Check logs: `logs/downtime.log` and `logs/combined.log`
- Review test output: `npm run test:downtime`
- Contact: InsureMithra Development Team

---

**Implementation Date**: November 17, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete and Tested
