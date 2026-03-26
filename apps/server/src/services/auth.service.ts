import { prisma } from '../server';
import bcrypt from 'bcryptjs';

export const validateCredentials = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && await bcrypt.compare(password, user.passwordHash)) return user;
  return null;
};