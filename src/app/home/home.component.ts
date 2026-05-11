import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of, Subject, merge, firstValueFrom, take } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map, startWith } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { HomeFirestoreService } from './home-firestore.service';
import { HomeTaskRow, JoinedProjectView, ProjectSearchHit } from '../models/home.models';
import { MenuService } from '../shares/MenuService';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  selectedProject: ProjectSearchHit | null = null;
  selectedJoinedProject: JoinedProjectView | null = null;
  isMenuOpen: boolean = false;
  loadingState: 'idle' | 'dropping' | 'deleting' = 'idle';

  private readonly authService = inject(AuthService);
  private readonly homeFs = inject(HomeFirestoreService);
  private readonly router = inject(Router);
  private readonly menuService = inject(MenuService);
  openedMenu = this.menuService.openedMenu;
  private readonly refreshJoined$ = new Subject<void>();

  readonly projectSearch = new FormControl('', { nonNullable: true });
  readonly joinPhrase = new FormControl('', { nonNullable: true });
  readonly joinedProjectSearch = new FormControl('', { nonNullable: true });

  // 今日・明日のタスクを取得
  readonly tasks$: Observable<HomeTaskRow[]> = this.authService.user$.pipe(
    switchMap((u) => (u ? this.homeFs.homeTasks$(u.uid) : of([]))),
  );

  // 参加プロジェクト一覧を取得
  readonly joinedProjects$: Observable<JoinedProjectView[]> = this.authService.user$.pipe(
    // tap(u => console.log('user:', u)),
    switchMap((u) => {
      if (!u) return of([]);
      return merge(of(undefined), this.refreshJoined$).pipe(
        switchMap(() => this.homeFs.joinedProjects$(u.uid)),
        // tap(console.log)
      );
    }),
  );

  // プロジェクト検索結果を取得
  readonly searchResults$: Observable<ProjectSearchHit[] | null> = this.projectSearch.valueChanges.pipe(
    debounceTime(200),
    distinctUntilChanged(),
    map(v => (v ?? '').trim()),
    switchMap((v) => {
      if (!v) return of(null);
      return this.homeFs.searchProjectsByName$(v);
    }),
  );

  // 参加中プロジェクト一覧を検索
  readonly filteredProjects$: Observable<JoinedProjectView[]> = this.joinedProjectSearch.valueChanges.pipe(
    startWith(''),
    debounceTime(200),
    map(v => (v ?? '').trim().toLowerCase()),
    switchMap(keyword =>
      this.joinedProjects$.pipe(
        map(projects => {
          if (!keyword) return projects;
  
          return projects.filter(p =>
            p.name.toLowerCase().includes(keyword)
          );
        })
      )
    )
  );

  // プロジェクト詳細画面に遷移
  goToProjectDetail(projectId: string): void {
    console.log('goToProjectDetail', projectId);
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
      if(e instanceof Error && e.message === '合言葉が一致しません') {
        window.alert('合言葉が一致しません');
        return;
      }else if(e instanceof Error && e.message === 'プロジェクトが見つかりません') {
        window.alert('プロジェクトが見つかりません');
        return;
      }else {
        const msg = e instanceof Error ? e.message : 'プロジェクトの参加に失敗しました';
        window.alert(msg);
      }
    }
  }

  toggleMenu(event: MouseEvent, jp: JoinedProjectView): void {
    event.stopPropagation();
    // if (this.selectedProject?.id === jp.id) {
    //   this.isMenuOpen = !this.isMenuOpen;
    // } else {
    //   this.selectedProject = jp;
    //   this.isMenuOpen = true;
    // }
      // 同じprojectなら閉じる
    if (
      this.selectedProject?.id === jp.id &&
      this.openedMenu() === 'home'
    ) {

      this.menuService.close();

    } else {

      // project切替
      this.selectedProject = jp;

      // home menu開く
      this.menuService.open('home');
    }
  }

    /* 外クリックで閉じる */
  @HostListener('document:click')
  closeMenu(): void {
    this.isMenuOpen = false;
    this.menuService.close();
  }

  onEdit(event: MouseEvent) {
    event.stopPropagation();
    if(!this.selectedProject) return;
    console.log('onEdit');
    this.router.navigate(['/projects', this.selectedProject.id, 'edit']);
  }

  async onDelete(event: MouseEvent) {
    event.stopPropagation();
    if(!this.selectedProject) return;
    this.loadingState = 'deleting';
    try{
      const result = await this.homeFs.deleteProject(this.selectedProject.id);
      if (!result) {
        window.alert('キャンセルされました');
        return;
      }
      this.refreshJoined$.next();
      this.router.navigate(['/']);
      window.alert('プロジェクトを削除しました');
    } catch (error) {
      window.alert('プロジェクトの削除に失敗しました')
      console.error(error);
    }
    finally {
      this.loadingState = 'idle';
    }
  }

  async onDrop(event: MouseEvent) {
    event.stopPropagation();
    const user = await firstValueFrom(this.authService.user$);
    if(!this.selectedProject) return;
    if(!user) return;
    this.loadingState = 'dropping';
    try{
    console.log('onDrop');
    const result =await this.homeFs.leaveProject(this.selectedProject.id, user.uid);

    if (!result) {
      window.alert('キャンセルされました');
      return;
    }

    this.refreshJoined$.next();
    this.router.navigate(['/']);
      window.alert('プロジェクトから脱退しました');
    } catch (error) {
      window.alert('プロジェクトの脱退に失敗しました')
      console.error(error);
    }
    finally {
      this.loadingState = 'idle';
    }
  }

  // ログアウト
  // async signout(): Promise<void> {
  //   await this.authService.signout();
  //   await this.router.navigate(['/signin']);
  // }
}
