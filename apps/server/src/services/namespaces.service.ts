import { PrismaClient, NamespaceStatus, MemberStatus, NamespaceRole, GlobalRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();


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

export async function requestNewOrganization(data: {
  userId: string;
  name: string;
  slug: string;
  description?: string;
  schoolType?: string;
  city?: string;
  country?: string;
}) {
  return prisma.$transaction(async (tx) => {

    const namespace = await tx.namespace.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        status: NamespaceStatus.PENDING,
      },
    });

    const membership = await tx.namespaceMember.create({
      data: {
        userId: data.userId,
        namespaceId: namespace.id,
        role: NamespaceRole.ORG_ADMIN,
        status: MemberStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return { namespace, membership };
  });
}

export async function listNamespaces(userId?: string, globalRole?: string) {
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

  if (!userId) {
    return [];
  }

  return prisma.namespace.findMany({
    where: {
      status: NamespaceStatus.ACTIVE,
    },
    orderBy: { name: 'asc' },
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
  return prisma.$transaction(async (tx) => {
    const namespace = await tx.namespace.update({
      where: { id: namespaceId },
      data,
    });

    if (data.status === NamespaceStatus.ACTIVE) {
      await tx.namespaceMember.updateMany({
        where: {
          namespaceId,
          status: MemberStatus.PENDING,
        },
        data: {
          status: MemberStatus.APPROVED,
          approvedAt: new Date(),
        },
      });
    }

    return namespace;
  });
}

export async function deleteNamespace(namespaceId: string) {
  return prisma.namespace.delete({
    where: { id: namespaceId },
  });
}


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

export async function addMemberDirectly(data: {
  userId: string;
  namespaceId: string;
  role: NamespaceRole;
}) {
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new Error('User not found');

  const namespace = await prisma.namespace.findUnique({ where: { id: data.namespaceId } });
  if (!namespace) throw new Error('Namespace not found');

  const existing = await prisma.namespaceMember.findUnique({
    where: { userId_namespaceId: { userId: data.userId, namespaceId: data.namespaceId } },
  });
  if (existing) throw new Error('User is already a member of this namespace');

  return prisma.namespaceMember.create({
    data: {
      userId: data.userId,
      namespaceId: data.namespaceId,
      role: data.role,
      status: MemberStatus.APPROVED,
      approvedAt: new Date(),
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function searchUsersForNamespace(namespaceId: string, query: string) {
  const existingMemberIds = await prisma.namespaceMember.findMany({
    where: { namespaceId },
    select: { userId: true },
  });
  const excludeIds = existingMemberIds.map(m => m.userId);

  return prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, globalRole: true },
    take: 20,
  });
}

export async function listNamespaceQuizzes(namespaceId: string) {
  const courses = await prisma.course.findMany({
    where: { namespaceId },
    include: {
      modules: {
        include: {
          quizzes: {
            include: { questions: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const quizzes: any[] = [];
  for (const course of courses) {
    for (const mod of course.modules) {
      for (const quiz of mod.quizzes) {
        quizzes.push({
          ...quiz,
          courseName: course.title,
          courseId: course.id,
          courseState: course.state,
          moduleName: mod.title,
        });
      }
    }
  }
  return quizzes;
}


export async function createInviteLink(data: {
  courseId: string;
  namespaceId: string;
  createdById: string;
  type: 'ONE_TIME' | 'PERSISTENT';
  expiresAt?: Date;
  maxUses?: number;
}) {
  //
  const token = uuidv4().replace(/-/g, '');

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
