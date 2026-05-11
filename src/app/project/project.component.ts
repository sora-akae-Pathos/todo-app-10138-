import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, switchMap } from 'rxjs/operators';
import { PRIORITY_ORDER, STATUS_ORDER } from '../models/home.models';
import { ProjectFirestoreService } from './project-firestore.service';
import {
  ProjectMemberOption,
  ProjectSortKey,
  ProjectTaskView,
  ProjectViewModel,
  TaskStatusGroup,
} from './project.models';
import { AuthService } from '../auth/auth.service';
import { MenuService } from '../shares/MenuService';


const PRIORITY_RANK: Record<string, number> = {
  緊急: 0,
  高: 1,
  中: 2,
  低: 3,
  無期: 4,
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function pr(p: string): number {
  return PRIORITY_RANK[p] ?? 99;
}

//  単一キー。デフォルトは dueDate 昇順、同一は createdAt 昇順
function compareBySortKey(a: ProjectTaskView, b: ProjectTaskView, key: ProjectSortKey): number {
  switch (key) {
    case 'dueDate': {
      const d = a.dueDate.getTime() - b.dueDate.getTime();
      if (d !== 0) return d;
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    case 'createdAt': {
      const c = a.createdAt.getTime() - b.createdAt.getTime();
      if (c !== 0) return c;
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    case 'priority': {
      const p = pr(a.priority) - pr(b.priority);
      if (p !== 0) return p;
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    case 'updatedAt': {
      const u = a.updatedAt.getTime() - b.updatedAt.getTime();
      if (u !== 0) return u;
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    default:
      return 0;
  }
}

//  1.フィルタ 2.検索 3.ソート → グルーピング
function applyStatusPriorityAssigneeDueFilter(
  tasks: ProjectTaskView[],
  statusSel: ReadonlySet<string>,
  prioritySel: ReadonlySet<string>,
  assigneeId: string | null,
  dueFrom: Date | null,
  dueTo: Date | null,
): ProjectTaskView[] {
  return tasks.filter((t) => {
    if (statusSel.size > 0 && !statusSel.has(t.status)) return false;
    if (prioritySel.size > 0 && !prioritySel.has(t.priority)) return false;
    if (assigneeId === 'UNASSIGNED' && t.assignedid) return false;
    if (assigneeId && assigneeId !== 'UNASSIGNED' && t.assignedid !== assigneeId) return false;
    if (dueFrom && t.dueDate.getTime() < startOfDay(dueFrom).getTime()) return false;
    if (dueTo && t.dueDate.getTime() > endOfDay(dueTo).getTime()) return false;
    return true;
  });
}

function applyTitleSearch(tasks: ProjectTaskView[], raw: string): ProjectTaskView[] {
  const needle = raw.trim().toLowerCase();
  if (!needle) return tasks;
  return tasks.filter((t) => t.title.toLowerCase().includes(needle));
}

function sortTasks(tasks: ProjectTaskView[], key: ProjectSortKey): ProjectTaskView[] {
  return [...tasks].sort((a, b) => compareBySortKey(a, b, key));
}

function buildGroupedTasks(sorted: ProjectTaskView[], order: readonly string[]): TaskStatusGroup[] {
  const known = new Set(order);
  const groups: TaskStatusGroup[] = order.map((status) => ({
    status,
    tasks: sorted.filter((t) => t.status === status),
  }));
  const orphan = sorted.filter((t) => !known.has(t.status));
  if (orphan.length) {
    groups.push({ status: 'その他', tasks: orphan });
  }
  return groups;
}

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './project.component.html',
  styleUrl: './project.component.css',
})
export class ProjectComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectFs = inject(ProjectFirestoreService);
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  openedMenu = this.menuService.openedMenu;
  readonly statusOptions = [...STATUS_ORDER];
  readonly priorityOptions = [...PRIORITY_ORDER];
  readonly sortOptions: { value: ProjectSortKey; label: string }[] = [
    { value: 'dueDate', label: '期限' },
    { value: 'createdAt', label: '作成日' },
    { value: 'priority', label: '優先度' },
    { value: 'updatedAt', label: '更新日' },
  ];
  // isMenuOpen: boolean = false;
  loadingState: 'idle' | 'dropping' | 'deleting' = 'idle';


  readonly statusSelection$ = new BehaviorSubject<ReadonlySet<string>>(new Set());
  readonly prioritySelection$ = new BehaviorSubject<ReadonlySet<string>>(new Set());
  readonly assigneeId$ = new BehaviorSubject<string | null>(null);
  private readonly dueFrom$ = new BehaviorSubject<Date | null>(null);
  private readonly dueTo$ = new BehaviorSubject<Date | null>(null);
  readonly sortKey$ = new BehaviorSubject<ProjectSortKey>('dueDate');

  readonly titleSearch = new FormControl('', { nonNullable: true });

  //  セクション開閉（データ更新でリセットしない）
  sectionOpen: Record<string, boolean> = Object.fromEntries(
    [...STATUS_ORDER].map((s) => [s, true] as const),
  );

  private readonly titleSearch$ = this.titleSearch.valueChanges.pipe(
    startWith(this.titleSearch.value),
    debounceTime(200),
    distinctUntilChanged(),
  );

  private readonly projectId$ = this.route.paramMap.pipe(
    map((pm) => pm.get('projectId')),
    filter((id): id is string => !!id),
    distinctUntilChanged(),
  );

  readonly viewModel$: Observable<ProjectViewModel> = combineLatest([
    this.projectId$.pipe(switchMap((id) => this.projectFs.watchTasksByProjectId(id))),
    this.projectId$.pipe(switchMap((id) => this.projectFs.watchMembers(id))),
    this.projectId$.pipe(switchMap((id) => this.projectFs.watchProjectName(id))),
    this.statusSelection$,
    this.prioritySelection$,
    this.assigneeId$,
    this.dueFrom$,
    this.dueTo$,
    this.titleSearch$,
    this.sortKey$,
  ]).pipe(
    map(
      ([
        tasks,
        members,
        projectName,
        statusSel,
        prioritySel,
        assigneeId,
        dueFrom,
        dueTo,
        titleQ,
        sortKey,
      ]) => {
        const rawTotal = tasks.length;
        let t = applyStatusPriorityAssigneeDueFilter(
          tasks,
          statusSel,
          prioritySel,
          assigneeId,
          dueFrom,
          dueTo,
        );
        t = applyTitleSearch(t, titleQ);
        t = sortTasks(t, sortKey);
        const groupedTasks = buildGroupedTasks(t, STATUS_ORDER);
        return {
          projectName,
          members,
          groupedTasks,
          rawTotal,
          filteredTotal: t.length,
          sortKey,
        };
      },
    ),
  );

  isStatusSelected(s: string): boolean {
    return this.statusSelection$.value.has(s);
  }

  isPrioritySelected(p: string): boolean {
    return this.prioritySelection$.value.has(p);
  }

  onStatusToggle(status: string, checked: boolean): void {
    const next = new Set(this.statusSelection$.value);
    if (checked) next.add(status);
    else next.delete(status);
    this.statusSelection$.next(next);
  }

  onPriorityToggle(priority: string, checked: boolean): void {
    const next = new Set(this.prioritySelection$.value);
    if (checked) next.add(priority);
    else next.delete(priority);
    this.prioritySelection$.next(next);
  }

  onAssigneeChange(userid: string): void {
    this.assigneeId$.next(userid || null);
  }

  onDueFromInput(isoDate: string): void {
    const from = isoDate
    ? new Date(`${isoDate}T00:00:00`)
    : null;

    this.dueFrom$.next(from);

    const to = this.dueTo$.value;

    // 開始日 > 終了日 なら終了日を合わせる
    if (from && to && from > to) {
      this.dueTo$.next(from);
    }
  }

  onDueToInput(isoDate: string): void {
    const to = isoDate
    ? new Date(`${isoDate}T00:00:00`)
    : null;

    this.dueTo$.next(to);

    const from = this.dueFrom$.value;

    // 終了日 < 開始日 なら開始日を合わせる
    if (to && from && to < from) {
      this.dueFrom$.next(to);
    }
  }

  onSortKeyChange(key: string): void {
    this.sortKey$.next(key as ProjectSortKey);
  }

  toggleSection(status: string): void {
    const cur = this.sectionOpen[status] !== false;
    this.sectionOpen = { ...this.sectionOpen, [status]: !cur };
  }

  isSectionOpen(status: string): boolean {
    return this.sectionOpen[status] !== false;
  }

  goToTask(taskId: string): void {
    void this.router.navigate(['/tasks', taskId]);
  }

  trackByStatus = (_: number, g: TaskStatusGroup): string => g.status;
  trackByTaskId = (_: number, t: ProjectTaskView): string => t.id;
  trackByMemberUserId = (_: number, m: ProjectMemberOption): string => m.userid;

  currentDueFrom(): string {
    const d = this.dueFrom$.value;
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  }

  currentDueTo(): string {
    const d = this.dueTo$.value;
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  goToEditProject(): void {
    const projectId = this.route.snapshot.paramMap.get('projectId');
    if(!projectId) return;
    void this.router.navigate(['/projects', projectId ,'edit']);
  }

  async onEdit(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('projectId');
    if(!projectId) return;
    await this.router.navigate(['/projects', projectId ,'edit']);
  }

  async onDelete(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('projectId');
    if(!projectId) return;
    const result = confirm('プロジェクトを削除しますか？');
    if(!result){
      window.alert('キャンセルされました');
      return;
    }
    this.loadingState = 'deleting';
    try{
    await this.projectFs.deleteProject(projectId);
    window.alert('プロジェクトを削除しました');
    await this.router.navigate(['/']);
  } catch (error) {
    window.alert('プロジェクトの削除に失敗しました')
    console.error(error);
  } finally {
    this.loadingState = 'idle';
  }
  }

  async onDrop(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('projectId');
    if(!projectId) return;
    const user = await firstValueFrom(this.authService.user$);
    if(!user) return;
    const result = confirm('プロジェクトから脱退しますか？');
    if(!result){
      window.alert('キャンセルされました');
      return;
    }
    this.loadingState = 'dropping';
      try{
      await this.projectFs.leaveProject(projectId, user.uid);
      window.alert('プロジェクトを脱退しました');
      void this.router.navigate(['/']);
      } catch (error) {
        window.alert('プロジェクトの脱退に失敗しました')
        console.error(error);
      } finally {
        this.loadingState = 'idle';
      }
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuService.toggle('project');
    // if(this.isMenuOpen === true) {
    //   this.isMenuOpen = false;
    // } else {
    //   this.isMenuOpen = true;
    // }
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.menuService.close();
    // this.isMenuOpen = false;
  }

  // ログアウト
  // async signout(): Promise<void> {
  //   await this.authService.signout();
  //   await this.router.navigate(['/signin']);
  // }
}
