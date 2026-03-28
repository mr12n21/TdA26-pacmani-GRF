import { QuestionType } from '@prisma/client';
import { prisma } from '../server';
import { v4 as uuidv4 } from 'uuid';
import { sendEvent, sendStatsEvent } from '../libs/sse.manager';
import { assertDraftState, assertOwnership, StateTransitionError } from './state-machine.service';

// ── helpers ──────────────────────────────────────────────────────────

async function getModuleOrThrow(moduleId: string) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!mod) throw new StateTransitionError('Module not found.', 404);
  return mod;
}

async function getCourseOrThrow(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new StateTransitionError('Course not found.', 404);
  return course;
}

async function getQuizOrThrow(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });
  if (!quiz) throw new StateTransitionError('Quiz not found.', 404);
  return quiz;
}

async function assertQuizEditPermission(userId: string, ownerId: string, globalRole?: string) {
  if (globalRole === 'SUPER_ADMIN') return;
  if (userId === ownerId) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user && (user.role === 'LECTURER' || user.role === 'ADMIN')) return;

  assertOwnership(userId, ownerId);
}

// ── question type normalisation ──────────────────────────────────────

export function normalizeQuestionType(type: string): QuestionType | null {
  if (!type) return null;
  const n = type.toLowerCase().replace(/[_-]/g, '');
  if (n === 'singlechoice' || n === 'single') return QuestionType.SINGLE_CHOICE;
  if (n === 'multiplechoice' || n === 'multi') return QuestionType.MULTIPLE_CHOICE;
  if (n === 'text') return QuestionType.TEXT;
  if (n === 'truefalse') return QuestionType.TRUE_FALSE;
  return null;
}

function normalizeChoices(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String);
  return [];
}

function normalizeIndices(input: any): number[] {
  if (Array.isArray(input)) return input.map(Number);
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch { /* ignore */ }
  }
  if (typeof input === 'number') return [input];
  return [];
}

export function buildQuestionData(quizId: string, q: any) {
  const resolvedType = normalizeQuestionType(q.type);
  if (!resolvedType) throw new Error('Invalid question type');

  const text = q.question ?? q.text;
  if (!text) throw new Error('Question text required');

  const choices = normalizeChoices(q.options ?? q.choices);

  let correctAnswer: any;
  if (resolvedType === QuestionType.SINGLE_CHOICE) {
    correctAnswer = Number(q.correctIndex ?? q.correctAnswer ?? 0);
  } else if (resolvedType === QuestionType.MULTIPLE_CHOICE) {
    correctAnswer = normalizeIndices(q.correctIndices ?? q.correctAnswer);
  } else if (resolvedType === QuestionType.TRUE_FALSE) {
    correctAnswer = Boolean(q.correctAnswer ?? q.selectedAnswer);
  } else {
    // TEXT
    correctAnswer = String(q.correctAnswer ?? '');
  }

  return {
    id: q.uuid ?? uuidv4(),
    quizId,
    text,
    type: resolvedType,
    choices: choices.length > 0 ? choices : undefined,
    correctAnswer,
  };
}

// ── Quiz CRUD ────────────────────────────────────────────────────────

export const listQuizzes = async (moduleId: string) => {
  await getModuleOrThrow(moduleId);
  return prisma.quiz.findMany({
    where: { moduleId },
    include: { questions: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const getQuizById = async (id: string) => {
  return getQuizOrThrow(id);
};

export const createQuiz = async (
  moduleId: string,
  userId: string,
  data: { title: string; description?: string; questions?: any[] },
  globalRole?: string,
) => {
  const mod = await getModuleOrThrow(moduleId);
  const course = await getCourseOrThrow(mod.courseId);
  await assertQuizEditPermission(userId, course.ownerId, globalRole);

  const quizId = uuidv4();
  const quiz = await prisma.quiz.create({
    data: {
      id: quizId,
      moduleId,
      title: data.title,
      description: data.description,
    },
  });

  if (data.questions && data.questions.length > 0) {
    const prepared = data.questions.map((q) => buildQuestionData(quizId, q));
    await prisma.question.createMany({ data: prepared });
  }

  const created = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });

  // SSE broadcast
  sendEvent(mod.courseId, 'quiz_created', {
    quizId: created!.id,
    moduleId,
    title: created!.title,
  });
  sendStatsEvent('statistics_updated', { courseId: mod.courseId, source: 'quiz_created', quizId: created!.id });

  return created;
};

export const updateQuiz = async (
  quizId: string,
  userId: string,
  data: { title?: string; description?: string; isVisible?: boolean; questions?: any[] },
  globalRole?: string,
) => {
  const quiz = await getQuizOrThrow(quizId);
  const mod = await getModuleOrThrow(quiz.moduleId);
  const course = await getCourseOrThrow(mod.courseId);
  await assertQuizEditPermission(userId, course.ownerId, globalRole);

  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
    },
  });

  if (data.questions) {
    await prisma.question.deleteMany({ where: { quizId } });
    const prepared = data.questions.map((q) => buildQuestionData(quizId, q));
    await prisma.question.createMany({ data: prepared });
  }

  const updated = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });

  // SSE broadcast
  sendEvent(mod.courseId, 'quiz_updated', {
    quizId: updated!.id,
    moduleId: quiz.moduleId,
    title: updated!.title,
  });
  sendStatsEvent('statistics_updated', { courseId: mod.courseId, source: 'quiz_updated', quizId: updated!.id });

  return updated;
};

export const deleteQuiz = async (quizId: string, userId: string, globalRole?: string) => {
  const quiz = await getQuizOrThrow(quizId);
  const mod = await getModuleOrThrow(quiz.moduleId);
  const course = await getCourseOrThrow(mod.courseId);
  await assertQuizEditPermission(userId, course.ownerId, globalRole);

  await prisma.quiz.delete({ where: { id: quizId } });
  
  // SSE broadcast
  sendEvent(mod.courseId, 'quiz_deleted', {
    quizId,
    moduleId: quiz.moduleId,
  });
  sendStatsEvent('statistics_updated', { courseId: mod.courseId, source: 'quiz_deleted', quizId });
  
  return quiz;
};

// ── Quiz Submission ──────────────────────────────────────────────────

export const submitQuiz = async (
  quizId: string,
  participantId: string,
  answers: any[],
) => {
  const quiz = await getQuizOrThrow(quizId);
  if (!answers || !Array.isArray(answers)) {
    throw new StateTransitionError('Invalid answers.', 400);
  }

  const answerMap = new Map<string, any>();
  for (const ans of answers) {
    const questionId = ans?.uuid ?? ans?.questionId;
    if (questionId) answerMap.set(String(questionId), ans);
  }

  let score = 0;
  const maxScore = quiz.questions.length;
  const correctPerQuestion: boolean[] = [];

  for (let idx = 0; idx < quiz.questions.length; idx++) {
    const question = quiz.questions[idx];
    const userAnswer = answerMap.get(question.id) ?? answers[idx];
    if (!userAnswer) {
      correctPerQuestion.push(false);
      continue;
    }

    const correct = question.correctAnswer as any;

    if (question.type === QuestionType.SINGLE_CHOICE) {
      const correctIndex = typeof correct === 'number' ? correct : Number(correct);
      const submittedIndex = userAnswer.selectedIndex ?? userAnswer.answer ?? userAnswer.value;
      const isCorrect = Number(submittedIndex) === correctIndex;
      if (isCorrect) score++;
      correctPerQuestion.push(isCorrect);
    } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
      const expected = normalizeIndices(correct);
      const provided = normalizeIndices(userAnswer.selectedIndices ?? userAnswer.answers ?? userAnswer.value);
      const isCorrect = expected.sort().toString() === provided.sort().toString();
      if (isCorrect) score++;
      correctPerQuestion.push(isCorrect);
    } else if (question.type === QuestionType.TRUE_FALSE) {
      const submittedBoolean = userAnswer.selectedAnswer ?? userAnswer.answer ?? userAnswer.value;
      const isCorrect = String(submittedBoolean).toLowerCase() === String(Boolean(correct));
      if (isCorrect) score++;
      correctPerQuestion.push(isCorrect);
    } else {
      // TEXT — case-insensitive comparison
      const isCorrect =
        String(userAnswer.textAnswer ?? userAnswer.answer ?? userAnswer.value ?? '').trim().toLowerCase() ===
        String(correct ?? '').trim().toLowerCase();
      if (isCorrect) score++;
      correctPerQuestion.push(isCorrect);
    }
  }

  // Percentage score 0-100
  const percentScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  await prisma.quiz.update({
    where: { id: quizId },
    data: { timesTaken: { increment: 1 } },
  });

  const result = await prisma.quizResult.create({
    data: {
      id: uuidv4(),
      quizId,
      participantId,
      score: percentScore,
      answers,
    },
  });

  // SSE: broadcast quiz result update for leaderboard
  const mod = await getModuleOrThrow(quiz.moduleId);
  sendEvent(mod.courseId, 'quiz_result_updated', {
    quizId,
    participantId,
    score: percentScore,
  });
  sendEvent(mod.courseId, 'statistics_updated', {
    courseId: mod.courseId,
    source: 'quiz_result_updated',
    quizId,
    participantId,
  });
  sendStatsEvent('statistics_updated', {
    courseId: mod.courseId,
    source: 'quiz_result_updated',
    quizId,
    participantId,
  });

  return {
    resultId: result.id,
    quizUuid: quizId,
    score,
    maxScore,
    percentScore,
    correctPerQuestion,
    completedAt: result.completedAt,
  };
};