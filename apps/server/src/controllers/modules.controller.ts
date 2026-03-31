import { Request, Response } from 'express';
import { toModuleResponse } from '../libs/transformers';
import * as modulesService from '../services/modules.service';
import { handleControllerError } from './controller-error';

export const listModules = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const isLecturer = req.user && (req.user.role === 'LECTURER' || req.user.role === 'ADMIN');
    const onlyRevealed = !isLecturer;
    const modules = await modulesService.listModules(courseId, onlyRevealed);
    res.json(modules.map(toModuleResponse));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const getModule = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const mod = await modulesService.getModule(moduleId);
    res.json(toModuleResponse(mod));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const createModule = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;
    const mod = await modulesService.createModule(courseId, userId, req.body, req.user!.globalRole);
    res.status(201).json(toModuleResponse(mod));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const updateModule = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user!.id;
    const mod = await modulesService.updateModule(moduleId, userId, req.body, req.user!.globalRole);
    res.json(toModuleResponse(mod));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user!.id;
    await modulesService.deleteModule(moduleId, userId, req.user!.globalRole);
    res.status(204).send();
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const reorderModule = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId } = req.params;
    const { newOrder } = req.body;
    const userId = req.user!.id;
    const mod = await modulesService.reorderModule(courseId, moduleId, newOrder, userId, req.user!.globalRole);
    res.json(toModuleResponse(mod));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const revealModule = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user!.id;
    const mod = await modulesService.revealModule(moduleId, courseId, userId, req.user!.globalRole);
    res.json({ success: true, module: toModuleResponse(mod) });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const hideModule = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user!.id;
    const mod = await modulesService.hideModule(moduleId, courseId, userId, req.user!.globalRole);
    res.json({ success: true, module: toModuleResponse(mod) });
  } catch (err) {
    handleControllerError(res, err);
  }
};