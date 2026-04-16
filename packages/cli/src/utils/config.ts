import dotenv from 'dotenv';
import fs from 'fs';
import { getEnvPath } from './paths';

/**
 * Carga la configuración desde .env del proyecto OpenFactu.
 */
export function loadConfig() {
  const envPath = getEnvPath();
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  return {
    databaseUrl: process.env.DATABASE_URL || 'postgresql://openfactu:openfactu_pass@localhost:5432/openfactudb',
    jwtSecret: process.env.JWT_SECRET || 'super-secret-key',
    serverPort: process.env.SERVER_PORT || '3000',
  };
}
