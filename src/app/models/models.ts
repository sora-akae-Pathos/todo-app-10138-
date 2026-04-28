import { Timestamp } from 'firebase/firestore';

/** tasks.priority の並び（並び順で使用） */
export const PRIORITY_ORDER = ['緊急', '高', '中', '低', '無期'] as const;

export const STATUS_ORDER = ['未対応', '対応中', '苦戦中', '保留', '完了'] as const;

export type TaskPriority = (typeof PRIORITY_ORDER)[number];

export type TaskStatus = (typeof STATUS_ORDER)[number];

/** Firestore tasks/{taskId} */
export interface TaskDoc {
  projectid: string;
  title: string;
  title_kana: string;
  description: string;
  dueDate: Timestamp | null;
  assignedid: string;
  assignedname: string;
  priority: TaskPriority | string;
  status: TaskStatus | string;
  approach: string;
  completioncriteria: string;
  // completioncriteria: unknown;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}



/** Firestore projects/{projectId} */
export interface ProjectDoc {
  name: string;
  name_kana: string;
  phrase: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Firestore projects/{projectId}/members/{userId} */
export interface MemberDoc {
  userid: string;
  displayname: string;
  projectid: string;
  joinedAt: Timestamp | null;
}

/** Firestore users/{userId} */
export interface UserDoc {
  displayname: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}