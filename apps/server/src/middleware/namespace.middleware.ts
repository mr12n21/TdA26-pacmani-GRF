import { Request, Response, NextFunction } from 'express';
import { PrismaClient, MemberStatus, GlobalRole } from '@prisma/client';

const prisma = new PrismaClient();

// Rozšíření Express Request pro namespace kontext
declare global {
  namespace Express {
    interface Request {
      namespace?: {
        id: string;
        name: string;
        slug: string;
        status: string;
      };
      namespaceMemberRole?: string;
    }
  }
}

/**
 * Middleware pro extrakci a validaci namespace kontextu.
 * 
 * Extractuje namespaceId z:
 * 1. JWT payload (req.user.activeNamespaceId)
 * 2. Route parametru :namespaceId
 * 3. Query parametru ?ns=
 * 
 * Ověří:
 * - Že namespace existuje a je aktivní
 * - Že uživatel je schválený člen namespace (pokud je přihlášen a není SUPER_ADMIN)
 * 
 * Připojí namespace objekt a namespace role k req.
 */
export async function namespaceMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Extrahuj namespaceId z různých zdrojů (priorita: JWT > route param > query)
    let namespaceId: string | undefined;

    if (req.user?.activeNamespaceId) {
      namespaceId = req.user.activeNamespaceId;
    } else if (req.params.namespaceId) {
      namespaceId = req.params.namespaceId;
    } else if (req.query.ns) {
      namespaceId = req.query.ns as string;
    }

    if (!namespaceId) {
      return res.status(400).json({ error: 'Namespace context is required' });
    }

    // 2. Načti namespace z DB
    const namespace = await prisma.namespace.findUnique({
      where: { id: namespaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    if (!namespace) {
      return res.status(404).json({ error: 'Namespace not found' });
    }

    if (namespace.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Namespace is not active' });
    }

    // 3. Pokud je uživatel přihlášen, ověř membership (kromě SUPER_ADMIN)
    if (req.user) {
      const isSuperAdmin = req.user.globalRole === GlobalRole.SUPER_ADMIN;

      if (!isSuperAdmin) {
        const membership = await prisma.namespaceMember.findUnique({
          where: {
            userId_namespaceId: {
              userId: req.user.id,
              namespaceId: namespace.id,
            },
          },
        });

        if (!membership) {
          return res.status(403).json({ error: 'You are not a member of this namespace' });
        }

        if (membership.status !== MemberStatus.APPROVED) {
          return res.status(403).json({ error: 'Your membership is not approved yet' });
        }

        // Připoj namespace role k req
        req.namespaceMemberRole = membership.role;
      }
    }

    // 4. Připoj namespace k req
    req.namespace = namespace;

    next();
  } catch (error) {
    console.error('Namespace middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Variantní middleware, který nevyžaduje namespace kontext, ale pokud je přítomen, validuje ho.
 * Užitečné pro endpoint, které mohou fungovat s i bez namespace kontextu.
 */
export async function optionalNamespaceMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let namespaceId: string | undefined;

    if (req.user?.activeNamespaceId) {
      namespaceId = req.user.activeNamespaceId;
    } else if (req.params.namespaceId) {
      namespaceId = req.params.namespaceId;
    } else if (req.query.ns) {
      namespaceId = req.query.ns as string;
    }

    // Pokud není namespace, pokračuj bez něj
    if (!namespaceId) {
      return next();
    }

    // Pokud je namespace, validuj ho stejně jako povinný middleware
    const namespace = await prisma.namespace.findUnique({
      where: { id: namespaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    if (!namespace || namespace.status !== 'ACTIVE') {
      return next();
    }

    if (req.user) {
      const isSuperAdmin = req.user.globalRole === GlobalRole.SUPER_ADMIN;

      if (!isSuperAdmin) {
        const membership = await prisma.namespaceMember.findUnique({
          where: {
            userId_namespaceId: {
              userId: req.user.id,
              namespaceId: namespace.id,
            },
          },
        });

        if (membership && membership.status === MemberStatus.APPROVED) {
          req.namespaceMemberRole = membership.role;
        }
      }
    }

    req.namespace = namespace;
    next();
  } catch (error) {
    console.error('Optional namespace middleware error:', error);
    next();
  }
}
