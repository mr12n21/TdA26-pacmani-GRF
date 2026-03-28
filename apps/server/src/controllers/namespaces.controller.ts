import { Request, Response } from 'express';
import * as namespacesService from '../services/namespaces.service';
import { MemberStatus, NamespaceRole, NamespaceStatus } from '@prisma/client';
import { handleControllerError } from './controller-error';

// ─── Namespace CRUD ──────────────────────────────────────────────────

export async function createNamespaceHandler(req: Request, res: Response) {
  try {
    const { name, slug, description } = req.body;

    const namespace = await namespacesService.createNamespace({
      name,
      slug,
      description,
    });

    return res.status(201).json(namespace);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * Žádost o vytvoření nové organizace (dostupné pro běžné uživatele)
 * - Vytvoří namespace s PENDING statusem
 * - Uživatel se stává ORG_ADMIN s PENDING statusem
 * - Vyžaduje schválení SUPER_ADMIN
 */
export async function requestNewOrganizationHandler(req: Request, res: Response) {
  try {
    const { name, slug, description, schoolType, city, country } = req.body;
    const userId = req.user!.id;

    const result = await namespacesService.requestNewOrganization({
      userId,
      name,
      slug,
      description,
      schoolType,
      city,
      country,
    });

    return res.status(201).json({
      message: 'Organization request submitted successfully',
      namespace: result.namespace,
      membership: result.membership,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function listNamespacesHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const globalRole = req.user?.globalRole;

    const namespaces = await namespacesService.listNamespaces(userId, globalRole);

    return res.json(namespaces);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function getNamespaceHandler(req: Request, res: Response) {
  try {
    const { namespaceId } = req.params;

    const namespace = await namespacesService.getNamespaceById(namespaceId);

    if (!namespace) {
      return res.status(404).json({ error: 'Namespace not found' });
    }

    return res.json(namespace);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function updateNamespaceHandler(req: Request, res: Response) {
  try {
    const { namespaceId } = req.params;
    const { name, slug, description, status } = req.body;

    const namespace = await namespacesService.updateNamespace(namespaceId, {
      name,
      slug,
      description,
      status: status as NamespaceStatus,
    });

    return res.json(namespace);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function deleteNamespaceHandler(req: Request, res: Response) {
  try {
    const { namespaceId } = req.params;

    await namespacesService.deleteNamespace(namespaceId);

    return res.status(204).send();
  } catch (error) {
    return handleControllerError(res, error);
  }
}

// ─── Namespace Members ───────────────────────────────────────────────

export async function listMembersHandler(req: Request, res: Response) {
  try {
    const { namespaceId } = req.params;

    const members = await namespacesService.listMembers(namespaceId);

    return res.json(members);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function requestMembershipHandler(req: Request, res: Response) {
  try {
    const { namespaceId } = req.params;
    const { role } = req.body;
    const userId = req.user!.id;

    // Kontrola, zda už není členem
    const existingMember = await namespacesService.getMemberByUserAndNamespace(userId, namespaceId);
    if (existingMember) {
      return res.status(400).json({ error: 'Already a member or request pending' });
    }

    const membership = await namespacesService.requestMembership({
      userId,
      namespaceId,
      role: role as NamespaceRole,
    });

    return res.status(201).json(membership);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function updateMembershipStatusHandler(req: Request, res: Response) {
  try {
    const { memberId } = req.params;
    const { status, role } = req.body;
    const approverId = req.user!.id;

    let member;
    if (status) {
      member = await namespacesService.updateMembershipStatus(
        memberId,
        status as MemberStatus,
        approverId
      );
    }
    if (role) {
      member = await namespacesService.updateMemberRole(
        memberId,
        role as NamespaceRole
      );
    }

    return res.json(member);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function updateMemberRoleHandler(req: Request, res: Response) {
  try {
    const { memberId } = req.params;
    const { role } = req.body;

    const member = await namespacesService.updateMemberRole(
      memberId,
      role as NamespaceRole
    );

    return res.json(member);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function removeMemberHandler(req: Request, res: Response) {
  try {
    const { memberId } = req.params;

    await namespacesService.removeMember(memberId);

    return res.status(204).send();
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function addMemberDirectlyHandler(req: Request, res: Response) {
  try {
    const { namespaceId } = req.params;
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'userId and role are required' });
    }

    const member = await namespacesService.addMemberDirectly({
      userId,
      namespaceId,
      role: role as NamespaceRole,
    });

    return res.status(201).json(member);
  } catch (error: any) {
    if (error?.message === 'User is already a member of this namespace') {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    return handleControllerError(res, error);
  }
}

export async function searchUsersForNamespaceHandler(req: Request, res: Response) {
  try {
    const { namespaceId } = req.params;
    const query = (req.query.q as string) || '';

    if (query.length < 2) {
      return res.json([]);
    }

    const users = await namespacesService.searchUsersForNamespace(namespaceId, query);
    return res.json(users);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function listNamespaceQuizzesHandler(req: Request, res: Response) {
  try {
    const { namespaceId } = req.params;
    const quizzes = await namespacesService.listNamespaceQuizzes(namespaceId);
    return res.json(quizzes);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

// ─── Invite Links ────────────────────────────────────────────────────

export async function createInviteLinkHandler(req: Request, res: Response) {
  try {
    const { namespaceId } = req.params;
    const { courseId, type, expiresAt, maxUses } = req.body;
    const createdById = req.user!.id;

    const inviteLink = await namespacesService.createInviteLink({
      courseId,
      namespaceId,
      createdById,
      type,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses,
    });

    return res.status(201).json(inviteLink);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function listInviteLinksHandler(req: Request, res: Response) {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const inviteLinks = await namespacesService.listInviteLinks(courseId as string);

    return res.json(inviteLinks);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function deleteInviteLinkHandler(req: Request, res: Response) {
  try {
    const { inviteLinkId } = req.params;

    await namespacesService.deleteInviteLink(inviteLinkId);

    return res.status(204).send();
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * Použití invite linku pro připojení k organizaci
 */
export async function joinViaInviteLinkHandler(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const userId = req.user!.id;

    const inviteLink = await namespacesService.getInviteLinkByToken(token);

    if (!inviteLink) {
      return res.status(404).json({ error: 'Invite link not found' });
    }

    const validation = namespacesService.validateInviteLink(inviteLink);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Zkontroluj, zda už není členem
    const existingMember = await namespacesService.getMemberByUserAndNamespace(
      userId,
      inviteLink.namespaceId
    );

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member' });
    }

    // Přidej uživatele jako STUDENT (auto-approved přes invite link)
    const membership = await namespacesService.requestMembership({
      userId,
      namespaceId: inviteLink.namespaceId,
      role: NamespaceRole.STUDENT,
    });

    // Auto-schválení
    const approvedMembership = await namespacesService.updateMembershipStatus(
      membership.id,
      MemberStatus.APPROVED,
      inviteLink.createdById
    );

    // Zvyš počítadlo použití
    await namespacesService.incrementInviteLinkUsage(inviteLink.id);

    return res.json({
      message: 'Successfully joined organization',
      membership: approvedMembership,
      namespace: inviteLink.namespace,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}
