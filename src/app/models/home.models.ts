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

/** ホーム表用（dayLabel 付与済み） */
export interface HomeTaskRow extends TaskDoc {
  id: string;
  dayLabel: '今日' | '明日';
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

export interface JoinedProjectView extends ProjectDoc {
  id: string;
}

/** 検索結果行 */
export interface ProjectSearchHit {
  id: string;
  name: string;
  name_kana: string;
  phrase: string;
}
