import { prisma } from '../server';
import { StateTransitionError } from './state-machine.service';
import { QuestionType } from '@prisma/client';
import { getConnectedCount } from '../libs/sse.manager';

const PASSING_SCORE = 60;


async function getCourseOrThrow(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new StateTransitionError('Course not found.', 404);
  return course;
}

type CourseStatsOverviewFilters = {
  q?: string;
  state?: string;
  sortBy?: 'downloads' | 'averageScore' | 'successRate' | 'linkOpens' | 'sseConnected' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  minDownloads?: number;
  minAverageScore?: number;
  minSuccessRate?: number;
  minLinkOpens?: number;
  minSseConnected?: number;
};

const asRounded = (value: number | null | undefined) => Math.round(Number(value ?? 0));

const getCoursePerformanceMetrics = async (courseId: string) => {
  const interactionsDelegate = (prisma as any).materialInteraction;

  const [interactionRows, quizAggregate, passedAttempts] = await Promise.all([
    interactionsDelegate?.groupBy
      ? interactionsDelegate.groupBy({
          by: ['interactionType'],
          where: { courseId },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    prisma.quizResult.aggregate({
      where: { quiz: { module: { courseId } } },
      _avg: { score: true },
      _count: { _all: true },
    }),
    prisma.quizResult.count({
      where: { quiz: { module: { courseId } }, score: { gte: PASSING_SCORE } },
    }),
  ]);

  const materialDownloads = (interactionRows as any[]).find((row: any) => row.interactionType === 'DOWNLOAD')?._count._all ?? 0;
  const linkOpens = (interactionRows as any[]).find((row: any) => row.interactionType === 'URL_OPEN')?._count._all ?? 0;
  const attempts = quizAggregate._count._all ?? 0;
  const averageScore = asRounded(quizAggregate._avg.score);
  const successRate = attempts > 0 ? asRounded((passedAttempts / attempts) * 100) : 0;

  return {
    materialDownloads,
    averageScore,
    successRate,
    linkOpens,
    sseConnected: getConnectedCount(courseId),
    attempts,
  };
};

export const getCoursesStatsOverview = async (filters: CourseStatsOverviewFilters = {}) => {
  const q = String(filters.q || '').trim();
  const where: any = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (filters.state) {
    where.state = String(filters.state).toUpperCase();
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { modules: true, participants: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const withMetrics = await Promise.all(
    courses.map(async (course) => {
      const metrics = await getCoursePerformanceMetrics(course.id);
      return {
        courseId: course.id,
        title: course.title,
        description: course.description ?? '',
        state: course.state,
        createdAt: course.createdAt,
        owner: course.owner,
        modulesCount: course._count.modules,
        participantsCount: course._count.participants,
        ...metrics,
      };
    }),
  );

  let filtered = withMetrics;

  if (Number.isFinite(filters.minDownloads)) {
    filtered = filtered.filter((row) => row.materialDownloads >= Number(filters.minDownloads));
  }
  if (Number.isFinite(filters.minAverageScore)) {
    filtered = filtered.filter((row) => row.averageScore >= Number(filters.minAverageScore));
  }
  if (Number.isFinite(filters.minSuccessRate)) {
    filtered = filtered.filter((row) => row.successRate >= Number(filters.minSuccessRate));
  }
  if (Number.isFinite(filters.minLinkOpens)) {
    filtered = filtered.filter((row) => row.linkOpens >= Number(filters.minLinkOpens));
  }
  if (Number.isFinite(filters.minSseConnected)) {
    filtered = filtered.filter((row) => row.sseConnected >= Number(filters.minSseConnected));
  }

  const sortBy = filters.sortBy ?? 'createdAt';
  const orderMultiplier = (filters.sortOrder ?? 'desc') === 'asc' ? 1 : -1;

  filtered.sort((left, right) => {
    if (sortBy === 'downloads') return (left.materialDownloads - right.materialDownloads) * orderMultiplier;
    if (sortBy === 'averageScore') return (left.averageScore - right.averageScore) * orderMultiplier;
    if (sortBy === 'successRate') return (left.successRate - right.successRate) * orderMultiplier;
    if (sortBy === 'linkOpens') return (left.linkOpens - right.linkOpens) * orderMultiplier;
    if (sortBy === 'sseConnected') return (left.sseConnected - right.sseConnected) * orderMultiplier;
    return (left.createdAt.getTime() - right.createdAt.getTime()) * orderMultiplier;
  });

  const summary = {
    totalCourses: filtered.length,
    totalMaterialDownloads: filtered.reduce((sum, row) => sum + row.materialDownloads, 0),
    totalLinkOpens: filtered.reduce((sum, row) => sum + row.linkOpens, 0),
    totalSseConnected: filtered.reduce((sum, row) => sum + row.sseConnected, 0),
    averageScore: (() => {
      const totalAttempts = filtered.reduce((sum, row) => sum + row.attempts, 0);
      if (totalAttempts <= 0) return 0;
      const weightedScoreSum = filtered.reduce((sum, row) => sum + (row.averageScore * row.attempts), 0);
      return asRounded(weightedScoreSum / totalAttempts);
    })(),
    averageSuccessRate: (() => {
      const totalAttempts = filtered.reduce((sum, row) => sum + row.attempts, 0);
      if (totalAttempts <= 0) return 0;
      const weightedSuccessRateSum = filtered.reduce((sum, row) => sum + (row.successRate * row.attempts), 0);
      return asRounded(weightedSuccessRateSum / totalAttempts);
    })(),
  };

  return {
    summary,
    courses: filtered,
  };
};


export const getLeaderboard = async (courseId: string) => {
  await getCourseOrThrow(courseId);

  const modules = await prisma.module.findMany({
    where: { courseId },
    select: { id: true },
  });
  const moduleIds = modules.map((m) => m.id);

  if (moduleIds.length === 0) return [];

  const quizzes = await prisma.quiz.findMany({
    where: { moduleId: { in: moduleIds } },
    select: { id: true },
  });
  const quizIds = quizzes.map((q) => q.id);

  if (quizIds.length === 0) return [];

  const results = await prisma.quizResult.groupBy({
    by: ['participantId'],
    where: { quizId: { in: quizIds } },
    _sum: { score: true },
    _count: { id: true },
    _avg: { score: true },
    orderBy: { _sum: { score: 'desc' } },
  });

  const participantIds = results.map((r) => r.participantId);
  const participants = await prisma.participant.findMany({
    where: { id: { in: participantIds } },
    include: { user: { select: { id: true, name: true } } },
  });
  const participantMap = new Map(participants.map((p) => [p.id, p]));

  return results.map((r, index) => {
    const participant = participantMap.get(r.participantId);
    return {
      rank: index + 1,
      participantId: r.participantId,
      nickname: participant?.nickname ?? participant?.user?.name ?? 'Unknown',
      type: participant?.type ?? 'ANONYMOUS',
      totalScore: r._sum.score ?? 0,
      averageScore: Math.round(r._avg.score ?? 0),
      quizzesCompleted: r._count.id,
    };
  });
};

export const getParticipantProgress = async (courseId: string, participantId: string) => {
  await getCourseOrThrow(courseId);

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!participant || participant.courseId !== courseId) {
    throw new StateTransitionError('Participant not found in this course.', 404);
  }

  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: {
      quizzes: {
        include: {
          results: {
            where: { participantId },
            orderBy: { completedAt: 'desc' },
          },
        },
      },
    },
  });

  const moduleProgress = modules.map((mod) => ({
    moduleId: mod.id,
    moduleTitle: mod.title,
    order: mod.order,
    isRevealed: mod.isRevealed,
    quizzes: mod.quizzes.map((quiz) => ({
      quizId: quiz.id,
      quizTitle: quiz.title,
      attempts: quiz.results.length,
      bestScore: quiz.results.length > 0
        ? Math.max(...quiz.results.map((r) => r.score))
        : null,
      lastScore: quiz.results[0]?.score ?? null,
      lastCompletedAt: quiz.results[0]?.completedAt ?? null,
    })),
  }));

  const allResults = modules.flatMap((m) =>
    m.quizzes.flatMap((q) => q.results),
  );

  return {
    participantId: participant.id,
    nickname: participant.nickname ?? participant.user?.name ?? 'Unknown',
    type: participant.type,
    joinedAt: participant.joinedAt,
    totalQuizzesTaken: allResults.length,
    averageScore: allResults.length > 0
      ? Math.round(allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length)
      : 0,
    modules: moduleProgress,
  };
};

export const getModuleStats = async (courseId: string, moduleId: string) => {
  await getCourseOrThrow(courseId);

  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      quizzes: {
        include: {
          results: true,
          _count: { select: { results: true } },
        },
      },
    },
  });
  if (!mod || mod.courseId !== courseId) {
    throw new StateTransitionError('Module not found in this course.', 404);
  }

  const totalParticipants = await prisma.participant.count({
    where: { courseId },
  });

  const quizStats = mod.quizzes.map((quiz) => {
    const scores = quiz.results.map((r) => r.score);
    const uniqueParticipants = new Set(quiz.results.map((r) => r.participantId)).size;

    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      totalAttempts: quiz.results.length,
      uniqueParticipants,
      completionRate: totalParticipants > 0
        ? Math.round((uniqueParticipants / totalParticipants) * 100)
        : 0,
      averageScore: scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    };
  });

  return {
    moduleId: mod.id,
    moduleTitle: mod.title,
    isRevealed: mod.isRevealed,
    totalParticipants,
    quizzes: quizStats,
  };
};


export const getCourseStats = async (courseId: string) => {
  await getCourseOrThrow(courseId);

  const [totalParticipants, totalModules, modules, metrics] = await Promise.all([
    prisma.participant.count({ where: { courseId } }),
    prisma.module.count({ where: { courseId } }),
    prisma.module.findMany({
      where: { courseId },
      include: {
        quizzes: { include: { _count: { select: { results: true } } } },
        _count: { select: { materials: true, quizzes: true } },
      },
    }),
    getCoursePerformanceMetrics(courseId),
  ]);

  const revealedModules = modules.filter((m) => m.isRevealed).length;
  const totalQuizzes = modules.reduce((sum, m) => sum + m._count.quizzes, 0);
  const totalMaterials = modules.reduce((sum, m) => sum + m._count.materials, 0);
  const totalQuizAttempts = modules.reduce(
    (sum, m) => sum + m.quizzes.reduce((qs, q) => qs + q._count.results, 0),
    0,
  );

  return {
    courseId,
    totalParticipants,
    totalModules,
    revealedModules,
    totalQuizzes,
    totalMaterials,
    totalQuizAttempts,
    materialDownloads: metrics.materialDownloads,
    averageScore: metrics.averageScore,
    successRate: metrics.successRate,
    linkOpens: metrics.linkOpens,
    sseConnected: metrics.sseConnected,
  };
};

const normalizeIndices = (input: unknown): number[] => {
  if (Array.isArray(input)) return input.map((value) => Number(value)).filter(Number.isFinite);
  if (typeof input === 'number') return [input];
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => Number(value)).filter(Number.isFinite);
      }
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeAnswerItem = (answers: unknown, questionId: string, questionIndex: number) => {
  if (!Array.isArray(answers)) return null;

  const byId = answers.find((item: any) => {
    if (!item || typeof item !== 'object') return false;
    const answerQuestionId = item.uuid ?? item.questionId;
    return answerQuestionId === questionId;
  });

  if (byId) return byId;

  const byIndex = answers[questionIndex];
  if (byIndex && typeof byIndex === 'object') return byIndex;

  return null;
};

const getParticipantLabel = (participant: any) =>
  participant?.nickname ?? participant?.user?.name ?? `Anonym-${String(participant?.id || '').slice(0, 6)}`;

const scoreAnswerCorrectness = (question: any, answerItem: any): boolean => {
  const correct = question.correctAnswer as any;

  if (question.type === QuestionType.SINGLE_CHOICE) {
    const correctIndex = typeof correct === 'number' ? correct : Number(correct);
    const submittedIndex = answerItem?.selectedIndex ?? answerItem?.answer ?? answerItem?.value;
    return Number(submittedIndex) === correctIndex;
  }

  if (question.type === QuestionType.MULTIPLE_CHOICE) {
    const expected = normalizeIndices(correct).sort((left, right) => left - right);
    const provided = normalizeIndices(answerItem?.selectedIndices ?? answerItem?.answers ?? answerItem?.value)
      .sort((left, right) => left - right);
    return expected.length === provided.length && expected.every((value, index) => value === provided[index]);
  }

  if (question.type === QuestionType.TRUE_FALSE) {
    const submittedBoolean = answerItem?.selectedAnswer ?? answerItem?.answer ?? answerItem?.value;
    return String(submittedBoolean).toLowerCase() === String(Boolean(correct));
  }

  const submittedText = String(answerItem?.textAnswer ?? answerItem?.answer ?? answerItem?.value ?? '').trim().toLowerCase();
  const correctText = String(correct ?? '').trim().toLowerCase();
  return submittedText.length > 0 && submittedText === correctText;
};

export const getQuizDashboard = async (courseId: string) => {
  await getCourseOrThrow(courseId);

  const participants = await prisma.participant.findMany({
    where: { courseId },
    include: { user: { select: { id: true, name: true } } },
  });

  const quizzes = await prisma.quiz.findMany({
    where: { module: { courseId } },
    include: {
      module: { select: { id: true, title: true } },
      questions: true,
      results: {
        include: {
          participant: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  const participantMap = new Map(participants.map((participant) => [participant.id, participant]));
  const allResults = quizzes.flatMap((quiz) => quiz.results);

  const attemptsTotal = allResults.length;
  const scores = allResults.map((result) => result.score);
  const passed = scores.filter((score) => score >= 60).length;

  const participantResultsMap = new Map<string, {
    participantId: string;
    nickname: string;
    type: string;
    attempts: number;
    totalScore: number;
    bestScore: number;
    lastAttemptAt: Date | null;
  }>();

  for (const result of allResults) {
    const participant = participantMap.get(result.participantId);
    const participantLabel = getParticipantLabel(participant);
    const existing = participantResultsMap.get(result.participantId);
    if (existing) {
      existing.attempts += 1;
      existing.totalScore += result.score;
      existing.bestScore = Math.max(existing.bestScore, result.score);
      existing.lastAttemptAt = !existing.lastAttemptAt || result.completedAt > existing.lastAttemptAt
        ? result.completedAt
        : existing.lastAttemptAt;
    } else {
      participantResultsMap.set(result.participantId, {
        participantId: result.participantId,
        nickname: participantLabel,
        type: participant?.type ?? 'ANONYMOUS',
        attempts: 1,
        totalScore: result.score,
        bestScore: result.score,
        lastAttemptAt: result.completedAt,
      });
    }
  }

  const participantResults = Array.from(participantResultsMap.values())
    .map((row) => ({
      ...row,
      averageScore: row.attempts > 0 ? Math.round(row.totalScore / row.attempts) : 0,
    }))
    .sort((left, right) => {
      if (right.averageScore !== left.averageScore) return right.averageScore - left.averageScore;
      if (right.bestScore !== left.bestScore) return right.bestScore - left.bestScore;
      return left.nickname.localeCompare(right.nickname, 'cs-CZ');
    });

  const quizPerformance = quizzes.map((quiz) => {
    const quizScores = quiz.results.map((result) => result.score);
    const uniqueParticipants = new Set(quiz.results.map((result) => result.participantId)).size;
    const quizPassed = quizScores.filter((score) => score >= 60).length;
    const bestScore = quizScores.length ? Math.max(...quizScores) : 0;
    const worstScore = quizScores.length ? Math.min(...quizScores) : 0;
    const averageScore = quizScores.length
      ? Math.round(quizScores.reduce((sum, value) => sum + value, 0) / quizScores.length)
      : 0;
    const passRate = quizScores.length ? Math.round((quizPassed / quizScores.length) * 100) : 0;

    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      moduleId: quiz.module.id,
      moduleTitle: quiz.module.title,
      attempts: quizScores.length,
      uniqueParticipants,
      averageScore,
      bestScore,
      worstScore,
      passRate,
    };
  }).sort((left, right) => {
    if (right.averageScore !== left.averageScore) return right.averageScore - left.averageScore;
    return left.quizTitle.localeCompare(right.quizTitle, 'cs-CZ');
  });

  const questionBreakdown = quizzes.map((quiz) => {
    const questions = quiz.questions.map((question, questionIndex) => {
      const distribution = new Map<string, { label: string; count: number; participants: any[] }>();
      const textAnswers = new Map<string, { value: string; count: number; participants: any[] }>();

      let totalAnswers = 0;
      let correctCount = 0;

      for (const result of quiz.results) {
        const answerItem = normalizeAnswerItem(result.answers, question.id, questionIndex);
        if (!answerItem) continue;

        totalAnswers += 1;
        if (scoreAnswerCorrectness(question, answerItem)) {
          correctCount += 1;
        }

        const participant = participantMap.get(result.participantId);
        const participantInfo = {
          participantId: result.participantId,
          nickname: getParticipantLabel(participant),
          type: participant?.type ?? 'ANONYMOUS',
        };

        if (question.type === QuestionType.SINGLE_CHOICE) {
          const selected = Number(answerItem.selectedIndex ?? answerItem.answer ?? answerItem.value);
          const optionLabel = Array.isArray(question.choices)
            ? String((question.choices as any[])[selected] ?? `Volba #${selected + 1}`)
            : `Volba #${selected + 1}`;
          const current = distribution.get(optionLabel) ?? { label: optionLabel, count: 0, participants: [] };
          current.count += 1;
          current.participants.push(participantInfo);
          distribution.set(optionLabel, current);
        } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
          const selectedIndices = normalizeIndices(answerItem.selectedIndices ?? answerItem.answers ?? answerItem.value);
          if (!selectedIndices.length) {
            const none = distribution.get('Bez odpovědi') ?? { label: 'Bez odpovědi', count: 0, participants: [] };
            none.count += 1;
            none.participants.push(participantInfo);
            distribution.set('Bez odpovědi', none);
          }
          for (const index of selectedIndices) {
            const optionLabel = Array.isArray(question.choices)
              ? String((question.choices as any[])[index] ?? `Volba #${index + 1}`)
              : `Volba #${index + 1}`;
            const current = distribution.get(optionLabel) ?? { label: optionLabel, count: 0, participants: [] };
            current.count += 1;
            current.participants.push(participantInfo);
            distribution.set(optionLabel, current);
          }
        } else if (question.type === QuestionType.TRUE_FALSE) {
          const boolValue = Boolean(answerItem.selectedAnswer ?? answerItem.answer ?? answerItem.value);
          const label = boolValue ? 'Ano / True' : 'Ne / False';
          const current = distribution.get(label) ?? { label, count: 0, participants: [] };
          current.count += 1;
          current.participants.push(participantInfo);
          distribution.set(label, current);
        } else {
          const rawText = String(answerItem.textAnswer ?? answerItem.answer ?? answerItem.value ?? '').trim();
          if (!rawText) {
            const empty = textAnswers.get('') ?? { value: 'Bez odpovědi', count: 0, participants: [] };
            empty.count += 1;
            empty.participants.push(participantInfo);
            textAnswers.set('', empty);
          } else {
            const normalized = rawText.toLowerCase();
            const existing = textAnswers.get(normalized) ?? { value: rawText, count: 0, participants: [] };
            existing.count += 1;
            existing.participants.push(participantInfo);
            textAnswers.set(normalized, existing);
          }
        }
      }

      const accuracyRate = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;

      const answerRows = Array.from(distribution.values())
        .sort((left, right) => right.count - left.count)
        .map((row) => ({
          label: row.label,
          count: row.count,
          participants: row.participants,
        }));

      const topTextAnswers = Array.from(textAnswers.values())
        .sort((left, right) => right.count - left.count)
        .slice(0, 8)
        .map((row) => ({
          value: row.value,
          count: row.count,
          participants: row.participants,
        }));

      return {
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        totalAnswers,
        correctCount,
        accuracyRate,
        answers: answerRows,
        textAnswers: topTextAnswers,
      };
    });

    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      moduleId: quiz.module.id,
      moduleTitle: quiz.module.title,
      attempts: quiz.results.length,
      questions,
    };
  });

  const registeredParticipants = participants.filter((participant) => participant.type === 'REGISTERED').length;
  const anonymousParticipants = participants.filter((participant) => participant.type === 'ANONYMOUS').length;

  return {
    courseId,
    summary: {
      totalParticipants: participants.length,
      registeredParticipants,
      anonymousParticipants,
      totalQuizzes: quizzes.length,
      totalAttempts: attemptsTotal,
      averageScore: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0,
      passRate: attemptsTotal > 0 ? Math.round((passed / attemptsTotal) * 100) : 0,
      bestScore: scores.length ? Math.max(...scores) : 0,
      worstScore: scores.length ? Math.min(...scores) : 0,
    },
    quizPerformance,
    participantResults,
    questionBreakdown,
  };
};
