/**
 * Script to manually create an ONGOING downtime incident
 * This simulates a service that is currently down
 * 
 * Usage: node scripts/create-ongoing-downtime.js [minutes-since-start]
 * Example: node scripts/create-ongoing-downtime.js 10
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Downtime = require('../models/downtime.model');
const { sendEmailAlert } = require('../services/alert.service');
const { logger } = require('../config/logger');

async function createOngoingDowntime(minutesSinceStart = 10) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra');
    logger.info('Connected to MongoDB');

    const testServiceUrl = process.env.MONITOR_SERVICES?.split(',')[0] || 'http://localhost:5001/api/health';
    
    // Calculate start time (X minutes ago)
    const now = new Date();
    const startTime = new Date(now - minutesSinceStart * 60 * 1000);

    console.log('\n=== Creating ONGOING Downtime Incident ===');
    console.log(`Service: ${testServiceUrl}`);
    console.log(`Start Time: ${startTime.toISOString()}`);
    console.log(`Time Down: ${minutesSinceStart} minutes`);
    console.log(`Status: ONGOING (service still down)`);
    
    // Create an ongoing incident (no endAt)
    const incident = await Downtime.create({
      service: testServiceUrl,
      startAt: startTime,
      endAt: null, // Still ongoing
      durationMs: null, // Not calculated yet
      status: 'down',
      details: `Test ongoing downtime (manually created - service down for ${minutesSinceStart} minutes)`,
      alertSent: false,
      recoverySent: false
    });

    console.log(`\n✅ Ongoing incident created: ${incident._id}`);
    console.log(`Status: ${incident.status}`);
    console.log(`Alert sent: ${incident.alertSent}`);

    // Optionally send test alert email
    const sendEmails = process.argv.includes('--send-emails');
    if (sendEmails) {
      console.log('\n📧 Sending downtime alert email...');
      const durationMs = minutesSinceStart * 60 * 1000;
      await sendEmailAlert(testServiceUrl, incident, durationMs);
      
      // Update incident to mark alert as sent
      incident.alertSent = true;
      await incident.save();
      
      console.log('✅ Alert email sent and incident updated');
    } else {
      console.log('\nℹ️  Add --send-emails flag to also send test alert email');
    }

    console.log('\n✅ Ongoing downtime incident created successfully!');
    console.log('You can now view it in the Admin Dashboard → Downtime Monitor tab');
    console.log('The incident will show as "down" with no end time\n');
    console.log('💡 Tip: Run the monitor manually to recover it:');
    console.log('   npm run monitor:test\n');

  } catch (error) {
    console.error('❌ Error creating ongoing downtime:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Get duration from command line args (default: 10 minutes)
const minutesSinceStart = parseInt(process.argv[2]) || 10;

if (minutesSinceStart < 1 || minutesSinceStart > 1440) {
  console.error('❌ Duration must be between 1 and 1440 minutes (24 hours)');
  process.exit(1);
}

createOngoingDowntime(minutesSinceStart);
