// Centralized, validated access to environment variables. Import this instead
// of reading process.env directly so missing required values fail loudly at
// startup rather than at the first request.

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  mongoUri: required('MONGO_URI'),
  mongoDb: process.env.MONGO_DB || 'ideavault',

  jwtSecret: required('JWT_SECRET'),

  // Origins allowed to call the API with credentials (cookies).
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || '5000'}`,
  },
};
