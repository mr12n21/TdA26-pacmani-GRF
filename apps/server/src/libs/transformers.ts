import path from 'path';
import { Course, CourseState, FeedPost, Material, MaterialType, Module, Question, QuestionType, Quiz } from '@prisma/client';

const MATERIALS_PUBLIC_BASE = '/uploads/materials';

function buildFileUrl(filePath: string | null | undefined) {
  if (!filePath) return undefined;
  const filename = path.basename(filePath);
  return `${MATERIALS_PUBLIC_BASE}/${filename}`;
}

// ─── Course transformers ─────────────────────────────────────────────

export function toCourseSummary(course: Course) {
  return {
    uuid: course.id,
    name: course.title,
    description: course.description ?? '',
    state: course.state,
    scheduledStart: course.scheduledStart,
    isDuplicate: course.isDuplicate,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

export function toCourseOverview(course: Course) {
  return {
    uuid: course.id,
    name: course.title,
    description: course.description ?? '',
    state: course.state,
    scheduledStart: course.scheduledStart,
    isDuplicate: course.isDuplicate,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    ownerId: course.ownerId,
  };
}

// ─── Module transformers ─────────────────────────────────────────────

type ModuleWithContent = Module & {
  materials?: Material[];
  quizzes?: (Quiz & { questions?: Question[] })[];
};

export function toModuleResponse(mod: ModuleWithContent) {
  return {
    uuid: mod.id,
    courseId: mod.courseId,
    title: mod.title,
    description: mod.description ?? '',
    order: mod.order,
    isRevealed: mod.isRevealed,
    createdAt: mod.createdAt,
    updatedAt: mod.updatedAt,
    materials: (mod.materials || []).map(toMaterialResponse),
    quizzes: (mod.quizzes || []).map(toQuizResponse),
  };
}

// ─── Material transformers ───────────────────────────────────────────

export function toMaterialResponse(material: Material) {
  const base = {
    uuid: material.id,
    moduleId: material.moduleId,
    name: material.title,
    description: material.description ?? '',
    type: material.type.toLowerCase(),
    createdAt: material.createdAt,
  };

  if (material.type === MaterialType.FILE) {
    return {
      ...base,
      fileUrl: buildFileUrl(material.filePath),
      mimeType: material.fileMime ?? undefined,
      sizeBytes: material.fileSize ?? undefined,
    };
  }

  return {
    ...base,
    url: material.url ?? '',
    faviconUrl: material.faviconUrl ?? undefined,
  };
}

// ─── Quiz transformers ───────────────────────────────────────────────

function mapQuestion(question: Question) {
  let parsedChoices: any = question.choices as any;
  if (typeof parsedChoices === 'string') {
    try { parsedChoices = JSON.parse(parsedChoices); } catch { parsedChoices = []; }
  }
  const choices: string[] = Array.isArray(parsedChoices) ? parsedChoices.map(String) : [];

  let correctRaw = question.correctAnswer as any;
  if (typeof correctRaw === 'string') {
    try { correctRaw = JSON.parse(correctRaw); } catch { /* leave as string */ }
  }

  const base = {
    uuid: question.id,
    question: question.text,
    type: question.type,
  };

  if (question.type === QuestionType.SINGLE_CHOICE) {
    return {
      ...base,
      type: 'singleChoice' as const,
      options: choices,
      correctIndex: typeof correctRaw === 'number' ? correctRaw : Number(correctRaw ?? 0),
    };
  }

  if (question.type === QuestionType.MULTIPLE_CHOICE) {
    const normalized = Array.isArray(correctRaw)
      ? correctRaw.map((v) => Number(v))
      : [];
    return {
      ...base,
      type: 'multipleChoice' as const,
      options: choices,
      correctIndices: normalized,
    };
  }

  if (question.type === QuestionType.TRUE_FALSE) {
    return {
      ...base,
      type: 'trueFalse' as const,
      correctAnswer: Boolean(correctRaw),
    };
  }

  // TEXT type
  return {
    ...base,
    type: 'text' as const,
    correctAnswer: String(correctRaw ?? ''),
  };
}

export function toQuizResponse(quiz: Quiz & { questions?: Question[] }) {
  return {
    uuid: quiz.id,
    moduleId: quiz.moduleId,
    title: quiz.title,
    description: quiz.description ?? '',
    isVisible: quiz.isVisible,
    attemptsCount: quiz.timesTaken,
    questions: (quiz.questions || []).map(mapQuestion),
  };
}

// ─── Feed transformers ───────────────────────────────────────────────

export function toFeedItem(post: FeedPost) {
  return {
    uuid: post.id,
    type: post.type === 'MANUAL' ? 'manual' : 'system',
    message: post.content,
    edited: post.edited,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

// ─── Full course payload (offline-friendly) ──────────────────────────

type FullCourseData = Course & {
  modules?: ModuleWithContent[];
  feedPosts?: FeedPost[];
  likes?: any[];
};

export function toFullCoursePayload(course: FullCourseData) {
  return {
    uuid: course.id,
    name: course.title,
    description: course.description ?? '',
    state: course.state,
    scheduledStart: course.scheduledStart,
    isDuplicate: course.isDuplicate,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    modules: (course.modules || []).map(toModuleResponse),
    feed: (course.feedPosts || []).map(toFeedItem),
    likesCount: (course.likes || []).length,
  };
}
