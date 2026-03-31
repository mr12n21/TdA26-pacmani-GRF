import { Request, Response, NextFunction } from 'express';
import { GlobalRole } from '@prisma/client';


export const rolesMiddleware = (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  if (req.user.globalRole === GlobalRole.SUPER_ADMIN) {
    return next();
  }

  const hasGlobalRole = req.user.role && allowedRoles.includes(req.user.role);
  const hasNamespaceRole = req.namespaceMemberRole && allowedRoles.includes(req.namespaceMemberRole);

  if (hasGlobalRole || hasNamespaceRole) {
    return next();
  }

  return res.status(403).json({ message: 'Insufficient permissions' });
};