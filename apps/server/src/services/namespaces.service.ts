import { PrismaClient, NamespaceStatus, MemberStatus, NamespaceRole, GlobalRole } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// ─── Namespace Management ────────────────────────────────────────────

export async function createNamespace(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  return prisma.namespace.create({
    data: {
      ...data,
      status: NamespaceStatus.ACTIVE,
    },
  });
}

export async function listNamespaces(userId?: string, globalRole?: string) {
  // SUPER_ADMIN vidí všechny
  if (globalRole === GlobalRole.SUPER_ADMIN) {
    return prisma.namespace.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
            courses: true,
          },
        },
      },
    });
  }

  // Ostatní vidí jen své namespaces
  if (!userId) {
    return [];
  }

  const memberships = await prisma.namespaceMember.findMany({
    where: {
      userId,
      status: MemberStatus.APPROVED,
    },
    include: {
      namespace: {
        include: {
          _count: {
            select: {
              members: true,
              courses: true,
            },
          },
        },
      },
    },
  });

  return memberships.map(m => m.namespace);
}

export async function getNamespaceById(namespaceId: string) {
  return prisma.namespace.findUnique({
    where: { id: namespaceId },
    include: {
      _count: {
        select: {
          members: true,
          courses: true,
          feedPosts: true,
          documents: true,
        },
      },
    },
  });
}

export async function updateNamespace(namespaceId: string, data: {
  name?: string;
  slug?: string;
  description?: string;
  status?: NamespaceStatus;
}) {
  return prisma.namespace.update({
    where: { id: namespaceId },
    data,
  });
}

export async function deleteNamespace(namespaceId: string) {
  return prisma.namespace.delete({
    where: { id: namespaceId },
  });
}

// ─── Namespace Members Management ────────────────────────────────────

export async function listMembers(namespaceId: string) {
  return prisma.namespaceMember.findMany({
    where: { namespaceId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });
}

export async function requestMembership(data: {
  userId: string;
  namespaceId: string;
  role: NamespaceRole;
}) {
  return prisma.namespaceMember.create({
    data: {
      ...data,
      status: MemberStatus.PENDING,
    },
  });
}

export async function updateMembershipStatus(
  memberId: string,
  status: MemberStatus,
  approverId: string
) {
  return prisma.namespaceMember.update({
    where: { id: memberId },
    data: {
      status,
      approvedAt: status === MemberStatus.APPROVED ? new Date() : null,
    },
  });
}

export async function updateMemberRole(memberId: string, role: NamespaceRole) {
  return prisma.namespaceMember.update({
    where: { id: memberId },
    data: { role },
  });
}

export async function removeMember(memberId: string) {
  return prisma.namespaceMember.delete({
    where: { id: memberId },
  });
}

export async function getMemberByUserAndNamespace(userId: string, namespaceId: string) {
  return prisma.namespaceMember.findUnique({
    where: {
      userId_namespaceId: {
        userId,
        namespaceId,
      },
    },
  });
}

// ─── Invite Links Management ─────────────────────────────────────────

export async function createInviteLink(data: {
  courseId: string;
  namespaceId: string;
  createdById: string;
  type: 'ONE_TIME' | 'PERSISTENT';
  expiresAt?: Date;
  maxUses?: number;
}) {
  const token = nanoid(32);

  return prisma.inviteLink.create({
    data: {
      ...data,
      token,
    },
  });
}

export async function getInviteLinkByToken(token: string) {
  return prisma.inviteLink.findUnique({
    where: { token },
    include: {
      course: true,
      namespace: true,
    },
  });
}

export async function incrementInviteLinkUsage(inviteLinkId: string) {
  return prisma.inviteLink.update({
    where: { id: inviteLinkId },
    data: {
      usedCount: {
        increment: 1,
      },
    },
  });
}

export async function listInviteLinks(courseId: string) {
  return prisma.inviteLink.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteInviteLink(inviteLinkId: string) {
  return prisma.inviteLink.delete({
    where: { id: inviteLinkId },
  });
}

/**
 * Validuje, zda invite link je stále platný pro použití
 */
export function validateInviteLink(inviteLink: any): { valid: boolean; error?: string } {
  if (!inviteLink) {
    return { valid: false, error: 'Invite link not found' };
  }

  if (inviteLink.namespace.status !== NamespaceStatus.ACTIVE) {
    return { valid: false, error: 'Namespace is not active' };
  }

  if (inviteLink.expiresAt && new Date() > new Date(inviteLink.expiresAt)) {
    return { valid: false, error: 'Invite link has expired' };
  }

  if (inviteLink.maxUses && inviteLink.usedCount >= inviteLink.maxUses) {
    return { valid: false, error: 'Invite link has reached maximum uses' };
  }

  return { valid: true };
}
