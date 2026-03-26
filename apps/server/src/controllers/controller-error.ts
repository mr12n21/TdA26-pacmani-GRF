import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { StateTransitionError } from '../services/state-machine.service';

export function handleControllerError(res: Response, err: unknown) {
  if (err instanceof StateTransitionError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Conflicting request. Please retry.' });
    }

    return res.status(400).json({ message: 'Database request failed.', code: err.code });
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  return res.status(500).json({ message });
}