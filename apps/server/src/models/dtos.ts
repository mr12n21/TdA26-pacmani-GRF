export interface CourseCreateDTO {
  title: string;
  description?: string;
}

export interface ScheduleDTO {
  startTime: string;
}

export interface RescheduleDTO {
  startTime: string;
}


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


export interface ParticipantJoinDTO {
  nickname?: string;
  anonymousId?: string;
}

export interface ParticipantUpdateDTO {
  nickname: string;
}

export interface NamespaceCreateDTO {
  name: string;
  slug: string;
  description?: string;
}

export interface NamespaceUpdateDTO {
  name?: string;
  slug?: string;
  description?: string;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
}

export interface MembershipRequestDTO {
  role: 'ORG_ADMIN' | 'LECTURER' | 'STUDENT';
}

export interface MembershipStatusUpdateDTO {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface MemberRoleUpdateDTO {
  role: 'ORG_ADMIN' | 'LECTURER' | 'STUDENT';
}

export interface InviteLinkCreateDTO {
  courseId: string;
  type: 'ONE_TIME' | 'PERSISTENT';
  expiresAt?: string;
  maxUses?: number;
}

export interface JoinViaInviteDTO {
  nickname?: string;
}
