import dotenv from 'dotenv';

dotenv.config();

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  jwtSecret: process.env.JWT_SECRET || 'secretkey',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '365d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
  bcryptRounds: parsePositiveInt(process.env.BCRYPT_ROUNDS, 10),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  port: process.env.PORT || 3000,
};