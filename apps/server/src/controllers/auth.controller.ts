import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../server';
import { config } from '../config/index';

const accessTokenOptions: SignOptions = {
  expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
};

const refreshTokenOptions: SignOptions = {
  expiresIn: config.jwtRefreshExpiresIn as SignOptions['expiresIn'],
};

function generateTokens(userId: string, userRole: string) {
  const token = jwt.sign({ id: userId, role: userRole, type: 'access' }, config.jwtSecret, accessTokenOptions);
  const refreshToken = jwt.sign({ id: userId, role: userRole, type: 'refresh' }, config.jwtSecret, refreshTokenOptions);
  return { token, refreshToken };
}

export const login = async (req: Request, res: Response) => {
  const { email, username, identifier, password } = req.body;
  const loginIdentifier = identifier || email || username;
  if (!loginIdentifier || !password) return res.status(400).json({ message: 'Email or username and password required' });

  const user = await prisma.user.findFirst({ where: { OR: [{ email: loginIdentifier }, { name: loginIdentifier }] } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid credentials' });

  const { token, refreshToken } = generateTokens(user.id, user.role);
  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
};

export const register = async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: 'Email, name and password required' });

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { name }] } });
  if (existing) return res.status(409).json({ message: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const safeRole = role === 'LECTURER' || role === 'ADMIN' ? role : 'STUDENT';

  const user = await prisma.user.create({ data: { email, name, passwordHash, role: safeRole as any } });
  const { token, refreshToken } = generateTokens(user.id, user.role);
  res.status(201).json({ token, refreshToken });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as { id: string; role: string; type?: string };
    if (decoded.type !== 'refresh') return res.status(401).json({ message: 'Invalid token type' });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const tokens = generateTokens(user.id, user.role);
    res.json(tokens);
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const me = async (req: Request, res: Response) => {
  const userInfo = (req as any).user;
  if (!userInfo) return res.status(401).json({ message: 'Not authenticated' });
  const user = await prisma.user.findUnique({ where: { id: userInfo.id }, select: { id: true, email: true, name: true, role: true } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};