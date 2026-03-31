import { Request, Response } from 'express';
import { toQuizResponse } from '../libs/transformers';
import { recordSystemFeed } from '../services/feed.service';
import * as quizzesService from '../services/quizzes.service';
import * as participantsService from '../services/participants.service';
import { getOrCreateDefaultModule } from '../services/modules.service';
import { prisma } from '../server';
import { handleControllerError } from './controller-error';

export const listQuizzes = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const quizzes = await quizzesService.listQuizzes(moduleId);
    res.json(quizzes.map(toQuizResponse));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const createQuiz = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user!.id;
    const { title, description, questions } = req.body;

    if (!title) return res.status(400).json({ message: 'Title required' });

    const quiz = await quizzesService.createQuiz(moduleId, userId, {
      title,
      description,
      questions,
    }, req.user!.globalRole);

    if (quiz) {
      const mod = await prisma.module.findUnique({ where: { id: moduleId } });
      if (mod) {
        await recordSystemFeed(mod.courseId, `New quiz added: ${quiz.title}`, {
          quizId: quiz.id,
          moduleId,
        });
      }
    }

    res.status(201).json(quiz ? toQuizResponse(quiz) : null);
  } catch (err: any) {
    if (err?.message?.includes('Invalid question')) {
      return res.status(400).json({ message: err.message });
    }
    handleControllerError(res, err);
  }
};

export const getQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizzesService.getQuizById(quizId);
    res.json(toQuizResponse(quiz));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user!.id;
    const { title, description, isVisible, questions } = req.body;

    const quiz = await quizzesService.updateQuiz(quizId, userId, {
      title,
      description,
      isVisible,
      questions,
    }, req.user!.globalRole);

    res.json(quiz ? toQuizResponse(quiz) : null);
  } catch (err: any) {
    if (err?.message?.includes('Invalid question')) {
      return res.status(400).json({ message: err.message });
    }
    handleControllerError(res, err);
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user!.id;
    await quizzesService.deleteQuiz(quizId, userId, req.user!.globalRole);
    res.status(204).send();
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const { courseId, quizId } = req.params;
    const { answers, anonymousId } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid answers' });
    }

    // Resolve or create participant
    const participant = await participantsService.resolveParticipant(
      courseId,
      req.user?.id,
      anonymousId,
    );

    const result = await quizzesService.submitQuiz(quizId, participant.id, answers);
    res.json(result);
  } catch (err) {
    handleControllerError(res, err);
  }
};


export const listCourseQuizzes = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const quizzes = await prisma.quiz.findMany({
      where: { module: { courseId } },
      include: { questions: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quizzes.map(toQuizResponse));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const createCourseQuiz = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const userId = req.user?.id ?? course.ownerId;
    const mod = await getOrCreateDefaultModule(courseId);

    const { title, description, questions } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const quiz = await quizzesService.createQuiz(mod.id, userId, {
      title,
      description,
      questions,
    }, req.user?.globalRole);

    if (quiz) {
      await recordSystemFeed(courseId, `New quiz added: ${quiz.title}`, {
        quizId: quiz.id,
        moduleId: mod.id,
      });
    }

    res.status(201).json(quiz ? toQuizResponse(quiz) : null);
  } catch (err: any) {
    if (err?.message?.includes('Invalid question')) {
      return res.status(400).json({ message: err.message });
    }
    handleControllerError(res, err);
  }
};

export const getCourseQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizzesService.getQuizById(quizId);
    res.json(toQuizResponse(quiz));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const updateCourseQuiz = async (req: Request, res: Response) => {
  try {
    const { courseId, quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { module: true },
    });
    if (!quiz || quiz.module.courseId !== courseId) {
      return res.status(404).json({ message: 'Quiz not found in this course' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const userId = req.user?.id ?? course.ownerId;
    const { title, description, isVisible, questions } = req.body;

    const updated = await quizzesService.updateQuiz(quizId, userId, {
      title,
      description,
      isVisible,
      questions,
    }, req.user?.globalRole);

    res.json(updated ? toQuizResponse(updated) : null);
  } catch (err: any) {
    if (err?.message?.includes('Invalid question')) {
      return res.status(400).json({ message: err.message });
    }
    handleControllerError(res, err);
  }
};

export const deleteCourseQuiz = async (req: Request, res: Response) => {
  try {
    const { courseId, quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { module: true },
    });
    if (!quiz || quiz.module.courseId !== courseId) {
      return res.status(404).json({ message: 'Quiz not found in this course' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const userId = req.user?.id ?? course.ownerId;
    await quizzesService.deleteQuiz(quizId, userId, req.user?.globalRole);
    res.status(204).send();
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const submitCourseQuiz = async (req: Request, res: Response) => {
  try {
    const { courseId, quizId } = req.params;
    const { answers, anonymousId } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid answers' });
    }

    const participant = await participantsService.resolveParticipant(
      courseId,
      req.user?.id,
      anonymousId,
    );

    const result = await quizzesService.submitQuiz(quizId, participant.id, answers);
    res.json(result);
  } catch (err) {
    handleControllerError(res, err);
  }
};