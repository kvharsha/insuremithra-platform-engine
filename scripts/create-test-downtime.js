/**
 * Script to manually create a test downtime incident
 * This simulates a downtime without actually stopping services
 * 
 * Usage: node scripts/create-test-downtime.js [duration-in-minutes]
 * Example: node scripts/create-test-downtime.js 10
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Downtime = require('../models/downtime.model');
const { sendEmailAlert, sendRecoveryEmail } = require('../services/alert.service');
const { logger } = require('../config/logger');

async function createTestDowntime(durationMinutes = 5) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra');
    logger.info('Connected to MongoDB');

    const testServiceUrl = process.env.MONITOR_SERVICES?.split(',')[0] || 'http://localhost:5001/api/health';
    
    // Calculate times
    const now = new Date();
    const startTime = new Date(now - durationMinutes * 60 * 1000); // X minutes ago
    const durationMs = durationMinutes * 60 * 1000;

    console.log('\n=== Creating Test Downtime Incident ===');
    console.log(`Service: ${testServiceUrl}`);
    console.log(`Start Time: ${startTime.toISOString()}`);
    console.log(`Duration: ${durationMinutes} minutes`);
    console.log(`End Time: ${now.toISOString()}`);
    
    // Create a "recovered" incident (already resolved)
    const incident = await Downtime.create({
      service: testServiceUrl,
      startAt: startTime,
      endAt: now,
      durationMs: durationMs,
      status: 'recovered',
      details: `Test downtime incident (manually created for ${durationMinutes} minutes)`,
      alertSent: true,
      recoverySent: true
    });

    console.log(`\n✅ Test incident created: ${incident._id}`);
    console.log(`Status: ${incident.status}`);
    console.log(`Alert sent: ${incident.alertSent}`);
    console.log(`Recovery sent: ${incident.recoverySent}`);

    // Optionally send test emails
    const sendEmails = process.argv.includes('--send-emails');
    if (sendEmails) {
      console.log('\n📧 Sending test alert email...');
      await sendEmailAlert(testServiceUrl, incident, durationMs);
      console.log('✅ Alert email sent');

      console.log('📧 Sending test recovery email...');
      await sendRecoveryEmail(testServiceUrl, incident);
      console.log('✅ Recovery email sent');
    } else {
      console.log('\nℹ️  Add --send-emails flag to also send test emails');
    }

    console.log('\n✅ Test downtime incident created successfully!');
    console.log('You can now view it in the Admin Dashboard → Downtime Monitor tab\n');

  } catch (error) {
    console.error('❌ Error creating test downtime:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Get duration from command line args (default: 5 minutes)
const durationMinutes = parseInt(process.argv[2]) || 5;

if (durationMinutes < 1 || durationMinutes > 1440) {
  console.error('❌ Duration must be between 1 and 1440 minutes (24 hours)');
  process.exit(1);
}

createTestDowntime(durationMinutes);
