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
    role: userRole,
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

  const memberships = await prisma.namespaceMember.findMany({
    where: {
      userId: user.id,
      status: MemberStatus.APPROVED,
    },
    include: {
      namespace: true,
    },
  });

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
      role: user.role,
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

  const user = await prisma.user.create({ 
    data: { 
      email, 
      name, 
      passwordHash, 
      role: safeRole as any,
      globalRole: GlobalRole.USER,
    } 
  });

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

    let activeNamespaceId: string | undefined;
    let namespaceMemberRole: string | undefined;

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

export const switchNamespace = async (req: Request, res: Response) => {
  const userInfo = (req as any).user;
  if (!userInfo) return res.status(401).json({ message: 'Not authenticated' });

  const { namespaceId, namespaceName } = req.body;
  if (!namespaceId && !namespaceName) {
    return res.status(400).json({ message: 'namespaceId or namespaceName is required' });
  }

  const user = await prisma.user.findUnique({ where: { id: userInfo.id } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  let resolvedNamespaceId = namespaceId;
  if (!resolvedNamespaceId && namespaceName) {
    const ns = await prisma.namespace.findFirst({
      where: {
        name: namespaceName,
        members: { some: { userId: user.id, status: MemberStatus.APPROVED } },
      },
      select: { id: true },
    });
    if (!ns) {
      return res.status(404).json({ message: 'Namespace not found or you are not a member' });
    }
    resolvedNamespaceId = ns.id;
  }

  const membership = await prisma.namespaceMember.findUnique({
    where: {
      userId_namespaceId: {
        userId: user.id,
        namespaceId: resolvedNamespaceId,
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
    resolvedNamespaceId,
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
      activeNamespaceId: resolvedNamespaceId,
      namespaceMemberRole: membership.role,
    },
  });
};