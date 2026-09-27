require('dotenv').config();

console.log('Available Env Keys:');
const relevantKeys = [
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'OPENAI_API_KEY',
  'EMBEDDING_PROVIDER',
  'ML_SERVICE_URL',
  'PORT',
  'NODE_ENV'
];

relevantKeys.forEach(k => {
  console.log(`${k}: ${process.env[k] ? 'EXISTS (length ' + process.env[k].length + ')' : 'NOT_SET'}`);
});
