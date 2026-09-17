require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 8000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/polar_ems?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'polar_ems_default_insecure_jwt_secret_replace_in_prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  IS_PROD: process.env.NODE_ENV === 'production',
};

// Validate that in production JWT_SECRET is explicitly configured
if (env.IS_PROD && env.JWT_SECRET === 'polar_ems_default_insecure_jwt_secret_replace_in_prod') {
  console.warn('[SECURITY WARNING] Running in production with default JWT_SECRET!');
}

module.exports = env;
