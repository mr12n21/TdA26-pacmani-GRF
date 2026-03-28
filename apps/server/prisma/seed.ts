import { PrismaClient, Prisma, Role, GlobalRole, NamespaceRole, NamespaceStatus, MemberStatus, MaterialType, QuestionType, FeedType, CourseState, ParticipantType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const resetDbOnSeed = process.env.RESET_DB_ON_SEED === 'true';

  if (!resetDbOnSeed) {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log('Seed skipped: existing data detected (set RESET_DB_ON_SEED=true to force reset).');
      return;
    }
  }

  const safeDelete = async (fn: () => Promise<any>, name: string) => {
    try {
      await fn();
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021') {
        console.warn(`${name} table does not exist, skipping deleteMany.`);
      } else {
        throw err;
      }
    }
  };

  if (resetDbOnSeed) {
    await safeDelete(() => prisma.quizResult.deleteMany({}), 'QuizResult');
    await safeDelete(() => prisma.participant.deleteMany({}), 'Participant');
    await safeDelete(() => prisma.question.deleteMany({}), 'Question');
    await safeDelete(() => prisma.quiz.deleteMany({}), 'Quiz');
    await safeDelete(() => prisma.material.deleteMany({}), 'Material');
    await safeDelete(() => prisma.module.deleteMany({}), 'Module');
    await safeDelete(() => prisma.feedPost.deleteMany({}), 'FeedPost');
    await safeDelete(() => prisma.like.deleteMany({}), 'Like');
    await safeDelete(() => prisma.inviteLink.deleteMany({}), 'InviteLink');
    await safeDelete(() => prisma.course.deleteMany({}), 'Course');
    await safeDelete(() => prisma.namespaceMember.deleteMany({}), 'NamespaceMember');
    await safeDelete(() => prisma.namespace.deleteMany({}), 'Namespace');
    await safeDelete(() => prisma.user.deleteMany({}), 'User');
  }

  // ── Namespace (Výchozí organizace) ──────────────────────────────────

  const defaultNamespace = await prisma.namespace.create({
    data: {
      id: uuidv4(),
      name: 'Výchozí organizace',
      slug: 'vychozi-organizace',
      description: 'Výchozí namespace pro testovací data',
      status: NamespaceStatus.ACTIVE,
    },
  });

  const hashedPassword = await bcrypt.hash('TdA26!', 10);

  const admin = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'admin@tda.com',
      passwordHash: hashedPassword,
      name: 'Admin',
      role: Role.ADMIN, // deprecated - pro zpětnou kompatibilitu
      globalRole: GlobalRole.SUPER_ADMIN,
    },
  });

  const lecturer = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'lecturer@tda.com',
      passwordHash: hashedPassword,
      name: 'lecturer',
      role: Role.LECTURER, // deprecated
      globalRole: GlobalRole.USER,
    },
  });

  const testUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'test@example.com',
      passwordHash: hashedPassword,
      name: 'Test User',
      role: Role.LECTURER, // deprecated
      globalRole: GlobalRole.USER,
    },
  });

  const students = await Promise.all([
    prisma.user.create({
      data: { 
        id: uuidv4(), 
        email: 'student1@tda.com', 
        passwordHash: hashedPassword, 
        name: 'Student1', 
        role: Role.STUDENT, // deprecated
        globalRole: GlobalRole.USER,
      },
    }),
    prisma.user.create({
      data: { 
        id: uuidv4(), 
        email: 'student2@tda.com', 
        passwordHash: hashedPassword, 
        name: 'Student2', 
        role: Role.STUDENT, // deprecated
        globalRole: GlobalRole.USER,
      },
    }),
    prisma.user.create({
      data: { 
        id: uuidv4(), 
        email: 'student3@tda.com', 
        passwordHash: hashedPassword, 
        name: 'Student3', 
        role: Role.STUDENT, // deprecated
        globalRole: GlobalRole.USER,
      },
    }),
  ]);

  // ── Namespace Memberships ──────────────────────────────────────────

  // Admin je ORG_ADMIN ve výchozím namespace
  await prisma.namespaceMember.create({
    data: {
      id: uuidv4(),
      userId: admin.id,
      namespaceId: defaultNamespace.id,
      role: NamespaceRole.ORG_ADMIN,
      status: MemberStatus.APPROVED,
      approvedAt: new Date(),
    },
  });

  // Lecturer a test user jsou LECTURER v namespace
  await prisma.namespaceMember.createMany({
    data: [
      {
        id: uuidv4(),
        userId: lecturer.id,
        namespaceId: defaultNamespace.id,
        role: NamespaceRole.LECTURER,
        status: MemberStatus.APPROVED,
        approvedAt: new Date(),
      },
      {
        id: uuidv4(),
        userId: testUser.id,
        namespaceId: defaultNamespace.id,
        role: NamespaceRole.LECTURER,
        status: MemberStatus.APPROVED,
        approvedAt: new Date(),
      },
    ],
  });

  // Studenti jsou STUDENT v namespace
  await prisma.namespaceMember.createMany({
    data: students.map((student: any) => ({
      id: uuidv4(),
      userId: student.id,
      namespaceId: defaultNamespace.id,
      role: NamespaceRole.STUDENT,
      status: MemberStatus.APPROVED,
      approvedAt: new Date(),
    })),
  });

  // ── Course 1: Draft with modules ───────────────────────────────────

  const course1 = await prisma.course.create({
    data: {
      id: uuidv4(),
      title: 'Sample Course 1',
      description: 'Intro to TdA',
      state: CourseState.DRAFT,
      ownerId: lecturer.id,
      namespaceId: defaultNamespace.id,
    },
  });

  // Module 1 of Course 1
  const module1 = await prisma.module.create({
    data: {
      id: uuidv4(),
      courseId: course1.id,
      title: 'Getting Started',
      description: 'Introduction and setup',
      order: 0,
      isRevealed: false,
    },
  });

  // Material under module 1
  await prisma.material.create({
    data: {
      id: uuidv4(),
      moduleId: module1.id,
      type: MaterialType.URL,
      title: 'Sample URL',
      url: 'https://example.com',
      faviconUrl: 'https://example.com/favicon.ico',
      order: 0,
    },
  });

  await prisma.material.create({
    data: {
      id: uuidv4(),
      moduleId: module1.id,
      type: MaterialType.FILE,
      title: 'Sample File',
      filePath: '/storage/materials/sample.pdf',
      fileMime: 'application/pdf',
      fileSize: 1024,
      order: 1,
    },
  });

  // Quiz under module 1
  const quiz1 = await prisma.quiz.create({
    data: {
      id: uuidv4(),
      moduleId: module1.id,
      title: 'Sample Quiz 1',
      description: 'Test your knowledge',
    },
  });

  await prisma.question.createMany({
    data: [
      {
        id: uuidv4(),
        quizId: quiz1.id,
        text: 'What is 2+2?',
        type: QuestionType.SINGLE_CHOICE,
        choices: JSON.stringify(['3', '4', '5']),
        correctAnswer: JSON.stringify(1),
      },
      {
        id: uuidv4(),
        quizId: quiz1.id,
        text: 'Select multiples of 3',
        type: QuestionType.MULTIPLE_CHOICE,
        choices: JSON.stringify(['3', '5', '6', '9']),
        correctAnswer: JSON.stringify([0, 2, 3]),
      },
      {
        id: uuidv4(),
        quizId: quiz1.id,
        text: 'Is the sky blue?',
        type: QuestionType.TRUE_FALSE,
        correctAnswer: JSON.stringify(true),
      },
    ],
  });

  // Module 2 of Course 1
  const module2 = await prisma.module.create({
    data: {
      id: uuidv4(),
      courseId: course1.id,
      title: 'Advanced Topics',
      description: 'Deep dive into advanced concepts',
      order: 1,
      isRevealed: false,
    },
  });

  await prisma.material.create({
    data: {
      id: uuidv4(),
      moduleId: module2.id,
      type: MaterialType.TEXT,
      title: 'Reading Material',
      description: 'In-depth text about advanced topics',
      order: 0,
    },
  });

  // ── Course 2: Another draft ────────────────────────────────────────

  const course2 = await prisma.course.create({
    data: {
      id: uuidv4(),
      title: 'Sample Course 2',
      description: 'Advanced TdA',
      state: CourseState.DRAFT,
      ownerId: lecturer.id,
      namespaceId: defaultNamespace.id,
    },
  });

  const module3 = await prisma.module.create({
    data: {
      id: uuidv4(),
      courseId: course2.id,
      title: 'Module 1',
      description: 'First module of Course 2',
      order: 0,
      isRevealed: false,
    },
  });

  // ── Feed posts for Course 1 ────────────────────────────────────────

  await prisma.feedPost.create({
    data: {
      id: uuidv4(),
      courseId: course1.id,
      namespaceId: defaultNamespace.id,
      authorId: lecturer.id,
      content: 'Welcome to the course!',
      type: FeedType.MANUAL,
    },
  });

  await prisma.feedPost.create({
    data: {
      id: uuidv4(),
      courseId: course1.id,
      namespaceId: defaultNamespace.id,
      content: 'New material added: Sample URL',
      type: FeedType.AUTO,
    },
  });

  console.log('DB seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    (globalThis as any).process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });