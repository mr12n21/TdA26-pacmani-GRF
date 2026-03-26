import { Role } from '@prisma/client';
import { prisma } from '../server';
import { v4 as uuidv4 } from 'uuid';

// Returns a stable default lecturer user (created if missing)
export async function getDefaultLecturerId() {
  const existing = await prisma.user.findFirst({ where: { role: Role.LECTURER, email: 'lecturer@tda.com' } });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'lecturer@tda.com',
      passwordHash: '$2a$10$zqqR5gk7gip7xxKIMuHN2OcS9MT0SqnX5nZzGOgrV0t7QQQjFZN7G', // hash for TdA26!
      name: 'lecturer',
      role: Role.LECTURER,
    },
  });
  return created.id;
}

// Returns a stable default student user (created if missing)
export async function getDefaultStudentId() {
  const existing = await prisma.user.findFirst({ where: { role: Role.STUDENT, email: 'student@tda.com' } });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'student@tda.com',
      passwordHash: '$2a$10$zqqR5gk7gip7xxKIMuHN2OcS9MT0SqnX5nZzGOgrV0t7QQQjFZN7G', // hash for TdA26!
      name: 'student',
      role: Role.STUDENT,
    },
  });
  return created.id;
}
