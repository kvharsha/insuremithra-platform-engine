// Load .env when running locally so the script can validate values
require('dotenv').config();

const required = [
  { key: 'MONGO_URI', alt: 'MONGODB_URI' },
  { key: 'JWT_SECRET' },
  { key: 'SMTP_HOST', alt: 'EMAIL_HOST' },
  { key: 'SMTP_PORT', alt: 'EMAIL_PORT' },
  { key: 'SMTP_USER', alt: 'EMAIL_USER' },
  { key: 'SMTP_PASS', alt: 'EMAIL_PASS' },
  { key: 'FROM_EMAIL', alt: 'EMAIL_FROM' }
];

const missing = [];
required.forEach(item => {
  const has = process.env[item.key] || (item.alt && process.env[item.alt]);
  if (!has) missing.push(item);
});

if (missing.length) {
  console.error('\nEnvironment check failed. Missing variables:');
  missing.forEach(m => {
    console.error(` - ${m.key}${m.alt ? ` (or ${m.alt})` : ''}`);
  });
  console.error('\nSet the variables in your shell or create a .env file. See .env.example for guidance.');
  process.exit(2);
}

console.log('All required environment variables are present.');
process.exit(0);
