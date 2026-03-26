// ─── Course DTOs ─────────────────────────────────────────────────────

export interface CourseCreateDTO {
  title: string;
  description?: string;
}

export interface ScheduleDTO {
  startTime: string; // ISO date string
}

export interface RescheduleDTO {
  startTime: string; // ISO date string
}

// ─── Module DTOs ─────────────────────────────────────────────────────

export interface ModuleCreateDTO {
  title: string;
  description?: string;
  order?: number;
}

export interface ModuleUpdateDTO {
  title?: string;
  description?: string;
  order?: number;
}

// ─── Material DTOs ───────────────────────────────────────────────────

export interface MaterialCreateDTO {
  type: 'FILE' | 'URL' | 'VIDEO' | 'TEXT';
  title: string;
  description?: string;
  url?: string;
}

export interface MaterialUpdateDTO {
  title?: string;
  description?: string;
  url?: string;
}

// ─── Quiz DTOs ───────────────────────────────────────────────────────

export interface QuestionCreateDTO {
  text: string;
  type: string;
  choices?: string[];
  correctAnswer?: number | number[] | string | boolean;
  options?: string[];
  correctIndex?: number;
  correctIndices?: number[];
}

export interface QuizCreateDTO {
  title: string;
  description?: string;
  questions?: QuestionCreateDTO[];
}

export interface QuizUpdateDTO {
  title?: string;
  description?: string;
  questions?: QuestionCreateDTO[];
}

export interface QuizSubmitAnswerDTO {
  uuid: string;
  selectedIndex?: number;
  selectedIndices?: number[];
  textAnswer?: string;
  selectedAnswer?: boolean;
}

// ─── Participant DTOs ────────────────────────────────────────────────

export interface ParticipantJoinDTO {
  nickname?: string;
  anonymousId?: string;
}

export interface ParticipantUpdateDTO {
  nickname: string;
}
