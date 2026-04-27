export type ProjectSortKey = 'dueDate' | 'createdAt' | 'priority' | 'updatedAt';

/** 画面用（Timestamp を Date に変換済み） */
export interface ProjectTaskView {
  id: string;
  projectid: string;
  title: string;
  description: string;
  dueDate: Date;
  assignedid: string;
  assignedname: string;
  priority: string;
  status: string;
  approach: string;
  completioncriteria: unknown;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface ProjectMemberOption {
  userid: string;
  displayname: string;
}

export interface TaskStatusGroup {
  status: string;
  tasks: ProjectTaskView[];
}

export interface ProjectViewModel {
  projectName: string | null;
  members: ProjectMemberOption[];
  groupedTasks: TaskStatusGroup[];
  /** Firestore 取得直後の件数（フィルタ前） */
  rawTotal: number;
  /** フィルタ・検索後の合計件数 */
  filteredTotal: number;
  sortKey: ProjectSortKey;
}
