import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../server';
import { config } from '../config/index';
import { GlobalRole, MemberStatus } from '@prisma/client';

const accessTokenOptions: SignOptions = {
  expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
};

const refreshTokenOptions: SignOptions = {
  expiresIn: config.jwtRefreshExpiresIn as SignOptions['expiresIn'],
};

function generateTokens(
  userId: string, 
  userRole: string, 
  globalRole: string,
  activeNamespaceId?: string,
  namespaceMemberRole?: string
) {
  const payload = { 
    id: userId, 
    role: userRole,  // deprecated
    globalRole,
    activeNamespaceId,
    namespaceMemberRole,
    type: 'access',
  };

  const token = jwt.sign(payload, config.jwtSecret, accessTokenOptions);
  const refreshToken = jwt.sign(
    { id: userId, role: userRole, globalRole, type: 'refresh' }, 
    config.jwtSecret, 
    refreshTokenOptions
  );
  return { token, refreshToken };
}

export const login = async (req: Request, res: Response) => {
  const { email, username, identifier, password } = req.body;
  const loginIdentifier = identifier || email || username;
  if (!loginIdentifier || !password) return res.status(400).json({ message: 'Email or username and password required' });

  const user = await prisma.user.findFirst({ where: { OR: [{ email: loginIdentifier }, { name: loginIdentifier }] } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid credentials' });

  // Načti namespace memberships
  const memberships = await prisma.namespaceMember.findMany({
    where: {
      userId: user.id,
      status: MemberStatus.APPROVED,
    },
    include: {
      namespace: true,
    },
  });

  // Pokud má právě jeden namespace, nastav ho jako aktivní
  let activeNamespaceId: string | undefined;
  let namespaceMemberRole: string | undefined;
  
  if (memberships.length === 1) {
    activeNamespaceId = memberships[0].namespaceId;
    namespaceMemberRole = memberships[0].role;
  }

  const { token, refreshToken } = generateTokens(
    user.id, 
    user.role, 
    user.globalRole,
    activeNamespaceId,
    namespaceMemberRole
  );

  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role, // deprecated
      globalRole: user.globalRole,
      activeNamespaceId,
      namespaceMemberRole,
    },
    namespaces: memberships.map(m => ({
      id: m.namespace.id,
      name: m.namespace.name,
      slug: m.namespace.slug,
      role: m.role,
    })),
  });
};

export const register = async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: 'Email, name and password required' });

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { name }] } });
  if (existing) return res.status(409).json({ message: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const safeRole = role === 'LECTURER' || role === 'ADMIN' ? role : 'STUDENT';

  // Uživatelé se registrují s globalRole USER (ne SUPER_ADMIN)
  const user = await prisma.user.create({ 
    data: { 
      email, 
      name, 
      passwordHash, 
      role: safeRole as any,  // deprecated
      globalRole: GlobalRole.USER,
    } 
  });

  // Po registraci nemá uživatel žádný aktivní namespace - musí požádat o připojení
  const { token, refreshToken } = generateTokens(user.id, user.role, user.globalRole);
  
  res.status(201).json({ 
    token, 
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      globalRole: user.globalRole,
    },
    message: 'User registered successfully. Request membership to a namespace to start.',
  });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as { id: string; role: string; globalRole: string; type?: string };
    if (decoded.type !== 'refresh') return res.status(401).json({ message: 'Invalid token type' });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ message: 'User not found' });

    // Try to preserve active namespace from the expired access token
    let activeNamespaceId: string | undefined;
    let namespaceMemberRole: string | undefined;

    // Check if client sent the old access token in Authorization header
    const oldToken = req.headers.authorization?.split(' ')[1];
    if (oldToken) {
      try {
        const oldPayload = jwt.decode(oldToken) as any;
        if (oldPayload?.activeNamespaceId) {
          activeNamespaceId = oldPayload.activeNamespaceId;
          namespaceMemberRole = oldPayload.namespaceMemberRole;
        }
      } catch { /* ignore decode errors */ }
    }

    // If no active namespace from old token, find latest approved membership
    if (!activeNamespaceId) {
      const memberships = await prisma.namespaceMember.findMany({
        where: { userId: user.id, status: MemberStatus.APPROVED },
        orderBy: { joinedAt: 'desc' },
      });
      if (memberships.length === 1) {
        activeNamespaceId = memberships[0].namespaceId;
        namespaceMemberRole = memberships[0].role;
      }
    }

    // Verify the active namespace membership is still valid
    if (activeNamespaceId) {
      const membership = await prisma.namespaceMember.findUnique({
        where: { userId_namespaceId: { userId: user.id, namespaceId: activeNamespaceId } },
      });
      if (!membership || membership.status !== MemberStatus.APPROVED) {
        activeNamespaceId = undefined;
        namespaceMemberRole = undefined;
      } else {
        namespaceMemberRole = membership.role;
      }
    }

    const tokens = generateTokens(
      user.id,
      user.role,
      user.globalRole,
      activeNamespaceId,
      namespaceMemberRole
    );
    res.json(tokens);
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const me = async (req: Request, res: Response) => {
  const userInfo = (req as any).user;
  if (!userInfo) return res.status(401).json({ message: 'Not authenticated' });
  
  const user = await prisma.user.findUnique({ 
    where: { id: userInfo.id }, 
    select: { 
      id: true, 
      email: true, 
      name: true, 
      role: true, 
      globalRole: true,
    } 
  });
  
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Přidej informace o namespace memberships
  const memberships = await prisma.namespaceMember.findMany({
    where: {
      userId: user.id,
      status: MemberStatus.APPROVED,
    },
    include: {
      namespace: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
  });

  // Najdi aktuální namespace roli pokud má aktivní namespace
  const activeNsRole = userInfo.activeNamespaceId
    ? memberships.find(m => m.namespaceId === userInfo.activeNamespaceId)?.role
    : userInfo.namespaceMemberRole;

  res.json({
    ...user,
    activeNamespaceId: userInfo.activeNamespaceId,
    namespaceRole: activeNsRole || userInfo.namespaceMemberRole,
    namespaces: memberships.map(m => ({
      namespace: {
        id: m.namespace.id,
        name: m.namespace.name,
        slug: m.namespace.slug,
        status: m.namespace.status,
      },
      role: m.role,
    })),
  });
};

/**
 * Přepnutí aktivního namespace - vygeneruje nový JWT s jiným activeNamespaceId
 */
export const switchNamespace = async (req: Request, res: Response) => {
  const userInfo = (req as any).user;
  if (!userInfo) return res.status(401).json({ message: 'Not authenticated' });

  const { namespaceId } = req.body;
  if (!namespaceId) return res.status(400).json({ message: 'namespaceId is required' });

  const user = await prisma.user.findUnique({ where: { id: userInfo.id } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Ověř, že uživatel je členem namespace
  const membership = await prisma.namespaceMember.findUnique({
    where: {
      userId_namespaceId: {
        userId: user.id,
        namespaceId,
      },
    },
  });

  if (!membership) {
    return res.status(403).json({ message: 'You are not a member of this namespace' });
  }

  if (membership.status !== MemberStatus.APPROVED) {
    return res.status(403).json({ message: 'Your membership is not approved yet' });
  }

  const { token, refreshToken } = generateTokens(
    user.id,
    user.role,
    user.globalRole,
    namespaceId,
    membership.role
  );

  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      globalRole: user.globalRole,
      activeNamespaceId: namespaceId,
      namespaceMemberRole: membership.role,
    },
  });
};