import dotenv from 'dotenv';

dotenv.config();

if (!process.env.PORT) {
  throw new Error('PORT is not defined in environment variables');
}
if (!process.env.MONGO_URL) {
  throw new Error('MONGO_URL is not defined in environment variables');
}
if (!process.env.NODE_ENV) {
  throw new Error('NODE_ENV is not defined in environment variables');
}
if (!process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN is not defined in environment variables');
}
if (!process.env.SMTP_HOST) {
  throw new Error('SMTP_HOST is not defined in environment variables');
}
if (!process.env.SMTP_USER) {
  throw new Error('SMTP_USER is not defined in environment variables');
}
if (!process.env.SMTP_PASS) {
  throw new Error('SMTP_PASS is not defined in environment variables');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}
if (!process.env.JWT_EXPIRY) {
  throw new Error('JWT_EXPIRY is not defined in environment variables');
}
if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL is not defined in environment variables');
}

// Accept a comma-separated list of allowed origins. In development we also
// allow the usual local Vite ports so the dev server can talk to the API.
const parseOrigins = (raw) => {
  const list = String(raw || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    for (const dev of [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5180',
    ]) {
      if (!list.includes(dev)) list.push(dev);
    }
  }
  return list;
};

export const config = {
  // Single source of truth for the auth cookie name — REST middleware and the
  // Socket.IO handshake must read the exact same cookie.
  AUTH_COOKIE: 'uptimeaitoken',
  PORT: process.env.PORT || 3000,
  MONGO_URL: process.env.MONGO_URL,
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  CORS_ORIGINS: parseOrigins(process.env.CORS_ORIGIN),
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY,
  FRONTEND_URL: process.env.FRONTEND_URL,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
};
