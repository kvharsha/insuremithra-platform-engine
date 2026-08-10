require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/user.model');
const { sendEmail } = require('../config/mailer');

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  const email = process.argv[2] || process.env.TEST_RESET_EMAIL || process.env.SMTP_USER;
  if (!email) {
    console.error('Please provide an email as arg or set TEST_RESET_EMAIL or SMTP_USER in .env');
    process.exit(2);
  }

  let user = await User.findOne({ email });
  if (!user) {
    console.log('Creating test user:', email);
    user = new User({ firstName: 'Test', lastName: 'User', email, password: 'Test@1234' });
    await user.save();
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

  console.log('Sending reset email to', email, 'link:', resetLink);
  const res = await sendEmail({ to: email, subject: 'Password Reset (Test)', text: `Reset: ${resetLink}`, html: `<p>Reset: <a href="${resetLink}">${resetLink}</a></p>` });
  console.log('sendEmail result:', res);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err && err.message ? err.message : err); process.exit(1); });
