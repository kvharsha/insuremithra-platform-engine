// Development configuration
// Copy this to .env and modify as needed

module.exports = {
  // Database Configuration
  MONGODB_URI: 'mongodb://localhost:27017/insuremithra',
  DB_NAME: 'insuremithra',

  // JWT Configuration
  JWT_SECRET: 'insuremithra_super_secret_jwt_key_2024_development_only',
  JWT_EXPIRE: '7d',

  // Server Configuration
  PORT: 5000,
  NODE_ENV: 'development',

  // Email Configuration (for password reset)
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: 587,
  EMAIL_USER: 'your_email@gmail.com',
  EMAIL_PASS: 'your_app_password',
  EMAIL_FROM: 'noreply@insuremithra.com',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX_ATTEMPTS: 5,

  // Security
  BCRYPT_ROUNDS: 12
};
