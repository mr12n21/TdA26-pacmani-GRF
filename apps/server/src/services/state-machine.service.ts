import { CourseState } from '@prisma/client';

const TRANSITIONS: Record<CourseState, CourseState[]> = {
  DRAFT: [CourseState.SCHEDULED, CourseState.LIVE],
  SCHEDULED: [CourseState.DRAFT, CourseState.SCHEDULED, CourseState.LIVE],
  LIVE: [CourseState.PAUSED, CourseState.ARCHIVED],
  PAUSED: [CourseState.LIVE, CourseState.SCHEDULED, CourseState.ARCHIVED],
  ARCHIVED: [],
};

export const ACTIONS: Record<string, { from: CourseState[]; to: CourseState }> = {
  schedule: { from: [CourseState.DRAFT, CourseState.PAUSED], to: CourseState.SCHEDULED },
  reschedule: { from: [CourseState.SCHEDULED], to: CourseState.SCHEDULED },
  cancel: { from: [CourseState.SCHEDULED], to: CourseState.DRAFT },
  revertToDraft: { from: [CourseState.SCHEDULED], to: CourseState.DRAFT },
  start: { from: [CourseState.DRAFT, CourseState.SCHEDULED], to: CourseState.LIVE },
  pause: { from: [CourseState.LIVE], to: CourseState.PAUSED },
  resume: { from: [CourseState.PAUSED], to: CourseState.LIVE },
  archive: { from: [CourseState.LIVE, CourseState.PAUSED], to: CourseState.ARCHIVED },
};

export class StateTransitionError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'StateTransitionError';
    this.statusCode = statusCode;
  }
}

export function validateTransition(currentState: CourseState, targetState: CourseState): void {
  const allowed = TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(targetState)) {
    throw new StateTransitionError(
      `Invalid state transition: cannot move from ${currentState} to ${targetState}.`
    );
  }
}


export function validateAction(actionName: string, currentState: CourseState): CourseState {
  const action = ACTIONS[actionName];
  if (!action) {
    throw new StateTransitionError(`Unknown action: ${actionName}.`);
  }
  if (!action.from.includes(currentState)) {
    throw new StateTransitionError(
      `Action '${actionName}' is not allowed in ${currentState} state.`
    );
  }
  return action.to;
}

export function assertDraftState(currentState: CourseState): void {
  if (currentState !== CourseState.DRAFT) {
    throw new StateTransitionError(
      'Course edits are only permitted in Draft state for preparation.',
      403
    );
  }
}


export function assertOwnership(userId: string, ownerId: string, globalRole?: string): void {
  if (globalRole === 'SUPER_ADMIN') return;
  if (userId !== ownerId) {
    throw new StateTransitionError('Only the course owner can perform this action.', 403);
  }
}
