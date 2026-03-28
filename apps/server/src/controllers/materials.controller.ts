import { Request, Response } from 'express';
import { MaterialType } from '@prisma/client';
import fetch from 'node-fetch';
import { toMaterialResponse } from '../libs/transformers';
import { recordSystemFeed } from '../services/feed.service';
import * as materialsService from '../services/materials.service';
import { getOrCreateDefaultModule } from '../services/modules.service';
import { prisma } from '../server';
import { handleControllerError } from './controller-error';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'video/mp4',
  'audio/mpeg',
  'audio/mp3',
];

export const listMaterials = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const materials = await materialsService.listMaterials(moduleId);
    res.json(materials.map(toMaterialResponse));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const createMaterial = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId } = req.params;
    const { type, name, description, url, title } = req.body;
    const file = req.file;
    const userId = req.user!.id;

    const normalizedType = typeof type === 'string' ? type.toUpperCase() : '';
    let resolvedType: MaterialType | null = null;
    if (normalizedType === 'FILE') resolvedType = MaterialType.FILE;
    if (normalizedType === 'URL') resolvedType = MaterialType.URL;
    if (normalizedType === 'VIDEO') resolvedType = MaterialType.VIDEO;
    if (normalizedType === 'TEXT') resolvedType = MaterialType.TEXT;
    if (!resolvedType) return res.status(400).json({ message: 'Invalid type' });

    const materialName = name ?? title;
    if (!materialName) return res.status(400).json({ message: 'Name required' });

    const data: any = {
      type: resolvedType,
      title: materialName,
      description,
    };

    if (resolvedType === MaterialType.FILE) {
      if (!file) return res.status(400).json({ message: 'File required' });
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ message: 'Unsupported file type' });
      }
      data.filePath = file.path;
      data.fileMime = file.mimetype;
      data.fileSize = file.size;
    } else if (resolvedType === MaterialType.URL || resolvedType === MaterialType.VIDEO) {
      if (!url) return res.status(400).json({ message: 'URL required' });
      data.url = url;
      try {
        const response = await fetch(url);
        if (response.ok) {
          data.faviconUrl = new URL(url).origin + '/favicon.ico';
        }
      } catch { /* ignore fetch errors */ }
    }

    const material = await materialsService.createMaterial(moduleId, userId, data, req.user!.globalRole);

    const mod = await prisma.module.findUnique({ where: { id: moduleId } });
    if (mod) {
      await recordSystemFeed(mod.courseId, `New material added: ${material.title}`, {
        materialId: material.id,
        moduleId,
      });
    }

    res.status(201).json(toMaterialResponse(material));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const { materialId } = req.params;
    const { name, title, description, url } = req.body;
    const file = req.file;
    const userId = req.user!.id;

    const data: any = {
      title: name ?? title,
      description,
    };

    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ message: 'Unsupported file type' });
      }
      data.filePath = file.path;
      data.fileMime = file.mimetype;
      data.fileSize = file.size;
    } else if (url) {
      data.url = url;
      try {
        const response = await fetch(url);
        if (response.ok) {
          data.faviconUrl = new URL(url).origin + '/favicon.ico';
        }
      } catch { /* ignore */ }
    }

    const material = await materialsService.updateMaterial(materialId, userId, data, req.user!.globalRole);
    res.json(toMaterialResponse(material));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const { materialId } = req.params;
    const userId = req.user!.id;
    await materialsService.deleteMaterial(materialId, userId, req.user!.globalRole);
    res.status(204).send();
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const reorderMaterial = async (req: Request, res: Response) => {
  try {
    const { moduleId, materialId } = req.params;
    const { newOrder } = req.body;
    const userId = req.user!.id;
    const material = await materialsService.reorderMaterial(materialId, moduleId, newOrder, userId, req.user!.globalRole);
    res.json(toMaterialResponse(material));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const listCourseMaterials = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const materials = await prisma.material.findMany({
      where: { module: { courseId } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(materials.map(toMaterialResponse));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const createCourseMaterial = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const userId = req.user?.id ?? course.ownerId;
    const mod = await getOrCreateDefaultModule(courseId);

    const { type, name, description, url, title } = req.body;
    const file = req.file;

    const normalizedType = typeof type === 'string' ? type.toUpperCase() : '';
    let resolvedType: MaterialType | null = null;
    if (normalizedType === 'FILE') resolvedType = MaterialType.FILE;
    if (normalizedType === 'URL') resolvedType = MaterialType.URL;
    if (normalizedType === 'VIDEO') resolvedType = MaterialType.VIDEO;
    if (normalizedType === 'TEXT') resolvedType = MaterialType.TEXT;
    if (!resolvedType) return res.status(400).json({ message: 'Invalid type' });

    const materialName = name ?? title;
    if (!materialName) return res.status(400).json({ message: 'Name required' });

    const data: any = {
      type: resolvedType,
      title: materialName,
      description,
    };

    if (resolvedType === MaterialType.FILE) {
      if (!file) return res.status(400).json({ message: 'File required' });
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ message: 'Unsupported file type' });
      }
      data.filePath = file.path;
      data.fileMime = file.mimetype;
      data.fileSize = file.size;
    } else if (resolvedType === MaterialType.URL || resolvedType === MaterialType.VIDEO) {
      if (!url) return res.status(400).json({ message: 'URL required' });
      data.url = url;
      try {
        const response = await fetch(url);
        if (response.ok) {
          data.faviconUrl = new URL(url).origin + '/favicon.ico';
        }
      } catch { /* ignore fetch errors */ }
    }

    const material = await materialsService.createMaterial(mod.id, userId, data, req.user?.globalRole);
    await recordSystemFeed(courseId, `New material added: ${material.title}`, {
      materialId: material.id,
      moduleId: mod.id,
    });

    res.status(201).json(toMaterialResponse(material));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const updateCourseMaterial = async (req: Request, res: Response) => {
  try {
    const { courseId, materialId } = req.params;
    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) return res.status(404).json({ message: 'Material not found' });

    const mod = await prisma.module.findUnique({ where: { id: material.moduleId } });
    if (!mod || mod.courseId !== courseId) return res.status(404).json({ message: 'Material not found in this course' });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const userId = req.user?.id ?? course.ownerId;
    const { name, title, description, url } = req.body;
    const file = req.file;

    const data: any = {
      title: name ?? title,
      description,
    };

    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ message: 'Unsupported file type' });
      }
      data.filePath = file.path;
      data.fileMime = file.mimetype;
      data.fileSize = file.size;
    } else if (url) {
      data.url = url;
      try {
        const response = await fetch(url);
        if (response.ok) {
          data.faviconUrl = new URL(url).origin + '/favicon.ico';
        }
      } catch { /* ignore */ }
    }

    const updated = await materialsService.updateMaterial(materialId, userId, data, req.user?.globalRole);
    res.json(toMaterialResponse(updated));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const deleteCourseMaterial = async (req: Request, res: Response) => {
  try {
    const { courseId, materialId } = req.params;
    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) return res.status(404).json({ message: 'Material not found' });

    const mod = await prisma.module.findUnique({ where: { id: material.moduleId } });
    if (!mod || mod.courseId !== courseId) return res.status(404).json({ message: 'Material not found in this course' });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const userId = req.user?.id ?? course.ownerId;
    await materialsService.deleteMaterial(materialId, userId, req.user?.globalRole);
    res.status(204).send();
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const trackCourseMaterialInteraction = async (req: Request, res: Response) => {
  try {
    const { courseId, materialId } = req.params;
    const interactionTypeRaw = String(req.body?.interactionType || '').toUpperCase();

    if (interactionTypeRaw !== 'DOWNLOAD' && interactionTypeRaw !== 'URL_OPEN') {
      return res.status(400).json({ message: 'interactionType must be DOWNLOAD or URL_OPEN.' });
    }

    let participantId: string | undefined;
    if (req.user?.id) {
      const participant = await prisma.participant.findUnique({
        where: { courseId_userId: { courseId, userId: req.user.id } },
        select: { id: true },
      });
      participantId = participant?.id;
    }

    await materialsService.trackMaterialInteraction(
      courseId,
      materialId,
      interactionTypeRaw,
      participantId,
    );

    res.status(202).json({ ok: true });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const assignCourseMaterialToModule = async (req: Request, res: Response) => {
  try {
    const { courseId, materialId } = req.params;
    const moduleId = String(req.body?.moduleId || '').trim();

    if (!moduleId) {
      return res.status(400).json({ message: 'moduleId is required.' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const userId = req.user?.id ?? course.ownerId;

    const updated = await materialsService.reassignCourseMaterialToModule(
      courseId,
      materialId,
      moduleId,
      userId,
      req.user?.globalRole,
    );

    res.json(toMaterialResponse(updated));
  } catch (err) {
    handleControllerError(res, err);
  }
};