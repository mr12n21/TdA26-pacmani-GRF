import { Request, Response, NextFunction } from 'express';
import { GlobalRole } from '@prisma/client';

/**
 * Middleware pro kontrolu rolí.
 * 
 * - SUPER_ADMIN má přístup vždy (bypass)
 * - Kontroluje globální role (req.user.role - deprecated) i namespace role (req.namespaceMemberRole)
 * - allowedRoles může obsahovat jak globální role (ADMIN, LECTURER) tak namespace role (ORG_ADMIN, LECTURER, STUDENT)
 */
export const rolesMiddleware = (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  // SUPER_ADMIN má přístup vždy
  if (req.user.globalRole === GlobalRole.SUPER_ADMIN) {
    return next();
  }

  // Kontroluj globální roli (zpětná kompatibilita) nebo namespace roli
  const hasGlobalRole = req.user.role && allowedRoles.includes(req.user.role);
  const hasNamespaceRole = req.namespaceMemberRole && allowedRoles.includes(req.namespaceMemberRole);

  if (hasGlobalRole || hasNamespaceRole) {
    return next();
  }

  return res.status(403).json({ message: 'Insufficient permissions' });
};