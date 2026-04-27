import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of, Subject, merge, firstValueFrom, take } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { HomeFirestoreService } from './home-firestore.service';
import { HomeTaskRow, JoinedProjectView, ProjectSearchHit } from '../models/home.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly authService = inject(AuthService);
  private readonly homeFs = inject(HomeFirestoreService);
  private readonly router = inject(Router);

  private readonly refreshJoined$ = new Subject<void>();

  readonly projectSearch = new FormControl('', { nonNullable: true });
  readonly joinPhrase = new FormControl('', { nonNullable: true });

  selectedProject: ProjectSearchHit | null = null;

  // 今日・明日のタスクを取得
  readonly tasks$: Observable<HomeTaskRow[]> = this.authService.user$.pipe(
    switchMap((u) => (u ? this.homeFs.homeTasks$(u.uid) : of([]))),
  );

  // 参加プロジェクト一覧を取得
  readonly joinedProjects$: Observable<JoinedProjectView[]> = this.authService.user$.pipe(
    tap(u => console.log('user:', u)),
    switchMap((u) => {
      if (!u) return of([]);
      return merge(of(undefined), this.refreshJoined$).pipe(
        switchMap(() => this.homeFs.joinedProjects$(u.uid)),
        tap(console.log)
      );
    }),
  );

  // プロジェクト検索結果を取得
  readonly searchResults$: Observable<ProjectSearchHit[]> = this.projectSearch.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((v) => this.homeFs.searchProjectsByName$(v)),
  );

  // プロジェクト詳細画面に遷移
  goToProjectDetail(projectId: string): void {
    void this.router.navigate(['/projects', projectId]);
  }

  // タスク詳細画面に遷移
  goToDetail(taskId: string): void {
    void this.router.navigate(['/tasks', taskId]);
  }

  // 新規プロジェクト作成画面に遷移
  goToCreateProject(): void {
    void this.router.navigate(['/projects/create']);
  }

  // プロジェクト検索結果から選択したプロジェクトをセット
  selectProject(p: ProjectSearchHit): void {
    this.selectedProject = p;
  }

  // プロジェクトに参加
  async joinProject(): Promise<void> {
    const u = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!u) {
      window.alert('ログインしてください');
      return;
    }
    if (!this.selectedProject) {
      window.alert('参加するプロジェクトを検索結果から選択してください');
      return;
    }
    const phrase = this.joinPhrase.value.trim();
    if (!phrase) {
      window.alert('合言葉を入力してください');
      return;
    }
    try {
      const projectId = this.selectedProject?.id;
      await this.homeFs.joinProject(this.selectedProject.id, phrase, u.uid);
      this.joinPhrase.setValue('');
      this.selectedProject = null;
      this.refreshJoined$.next();
      this.router.navigate(['/projects', projectId]);
      window.alert('プロジェクトに参加しました');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '参加に失敗しました';
      window.alert(msg);
    }
  }

  isMenuOpen = false;

  toggleMenu(event: MouseEvent, jp: any): void {
    event.stopPropagation();
  
    if (this.selectedProject?.id === jp.id) {
      this.isMenuOpen = !this.isMenuOpen;
    } else {
      this.selectedProject = jp;
      this.isMenuOpen = true;
    }
  }

  /* 外クリックで閉じる */
@HostListener('document:click')
closeMenu(): void {
  this.isMenuOpen = false;
}

onEdit() {
  this.router.navigate(['/projects', this.selectedProject?.id, 'edit']);
}

onDelete() {
  this.homeFs.deleteProject(this.selectedProject?.id ?? '');
}

async onLeave() {
  const user = await firstValueFrom(this.authService.user$);
  this.homeFs.leaveProject(this.selectedProject?.id ?? '', user?.uid ?? '');
  this.refreshJoined$.next();
  this.router.navigate(['/']);
  window.alert('プロジェクトから脱退しました');
}

  // ログアウト
  async signout(): Promise<void> {
    await this.authService.signout();
    await this.router.navigate(['/signin']);
  }
}
