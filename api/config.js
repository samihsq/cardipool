import dotenv from 'dotenv';
import path from 'path';

const env = process.env.NODE_ENV || 'development';
const envPath = path.resolve(process.cwd(), `.env.${env}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
  // This can happen in production on Vercel where vars are set directly
  if (env === 'production') { 
    console.log('[config] .env file not found, assuming Vercel environment variables are set.');
  } else {
    console.error(`[config] Error: Could not find or load .env file at ${envPath}`);
    console.error(result.error);
    process.exit(1); // Exit if dev env file is missing
  }
} else {
  console.log(`[config] Environment variables loaded successfully from ${envPath}`);
} 