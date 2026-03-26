import { Request, Response } from 'express';
import * as statisticsService from '../services/statistics.service';
import { handleControllerError } from './controller-error';

export const getCourseStats = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const stats = await statisticsService.getCourseStats(courseId);
    res.json(stats);
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const getQuizDashboard = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const stats = await statisticsService.getQuizDashboard(courseId);
    res.json(stats);
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const leaderboard = await statisticsService.getLeaderboard(courseId);
    res.json(leaderboard);
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const getParticipantProgress = async (req: Request, res: Response) => {
  try {
    const { courseId, participantId } = req.params;
    const progress = await statisticsService.getParticipantProgress(courseId, participantId);
    res.json(progress);
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const getModuleStats = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId } = req.params;
    const stats = await statisticsService.getModuleStats(courseId, moduleId);
    res.json(stats);
  } catch (err) {
    handleControllerError(res, err);
  }
};
