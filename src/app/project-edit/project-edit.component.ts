import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { trimRequired, noWhitespace } from '../shares/custom-validators';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom, take, debounceTime, Observable, Subject, takeUntil, distinctUntilChanged } from 'rxjs';
import { doc, docData, Firestore, DocumentReference } from '@angular/fire/firestore';
import { FormStateService } from '../shares/FormStateService';
import { toHiragana } from 'wanakana';
import { ProjectDoc } from '../models/home.models';
import { ProjectEditService } from './project-edit.service';

@Component({
  selector: 'app-project-edit',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './project-edit.component.html',
  styleUrl: './project-edit.component.css',
})
export class ProjectEditComponent {
  projectId: string | null = null;
  key!: string;
  project$!: Observable<ProjectDoc>;
  project!: ProjectDoc;
  projectRef!: DocumentReference;
  loadingState: 'idle' | 'saving' | 'deleting' = 'idle';
  private isSavingEnabled = true;
  private isInitialValue = true;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formState = inject(FormStateService);
  private location = inject(Location);
  private peService = inject(ProjectEditService);

  private destroy$ = new Subject<void>();


  // get name(): FormControl {
  //   return this.project_edit_form.get('name') as FormControl;
  // }
  // get phrase(): FormControl {
  //   return this.project_edit_form.get('phrase') as FormControl;
  // }

  project_edit_form = this.fb.group({
    name: ['', [trimRequired, noWhitespace, Validators.maxLength(30)]],
    phrase: ['', [trimRequired, noWhitespace, Validators.minLength(4), Validators.maxLength(15)]],
  });

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    if (!this.projectId) throw new Error('projectIdが取得できませんでした');

    //セッションごとにキーを作成(タブで複製されても対応可能)
    this.key = `project_edit_form_${this.projectId}`;
    this.projectRef = doc(this.firestore, 'projects', this.projectId);
    this.project$ = docData(this.projectRef) as Observable<ProjectDoc>;
    const saved = this.formState.load<any>(this.key);
     // 初期ロードフラグ
    this.isInitialValue = true;

     // DB取得 → フォーム反映（セッション優先）
    this.project$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(project => {
        if (!project) return;
        console.log(project);
        this.project = project;

        const data = saved ?? {
          name: project?.name,
          phrase: project?.phrase,
        };

        this.project_edit_form.patchValue(data);

        this.isInitialValue = false;
      });

    // フォーム変更 → セッション保存
    this.project_edit_form.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        if (this.isInitialValue || !this.isSavingEnabled) return;
        this.formState.save(this.key, value);
    });
  }

  async editProject() {
    const u = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!u) {
      window.alert('ログインしてください');
      return;
    }

    if (!this.projectId) return;

    if (this.project_edit_form.invalid) return;

    this.loadingState = 'saving';
    try {
    const raw = this.project_edit_form.value;

    const name = raw.name?.trim();
    const phrase = raw.phrase?.trim();
    const name_kana = toHiragana(name);

    await this.peService.updateProject(this.projectId, {
      name: name ?? '',
      name_kana: name_kana ?? '',
      phrase: phrase ?? '',
      userId: u.uid,
    });

    // await this.router.navigate(['/projects', this.projectId]);

    this.isSavingEnabled = false;
    this.formState.clear(this.key);

    if(window.history.length > 1) {
      await this.location.back();
    } else {
      await this.router.navigate(['/']);
    }
      window.alert('プロジェクトを更新しました');
    } catch (error) {
      window.alert('プロジェクトの更新に失敗しました')
      console.error(error);
    } finally {
      this.loadingState = 'idle';
      console.log('loadingState', this.loadingState);
    }
  }

  onCancel() {
    this.isSavingEnabled = false;
    this.formState.clear(this.key);
    if(window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  async deleteProject() {
    if(!this.projectId) return;
    this.loadingState = 'deleting';
    try{
        await this.peService.deleteProject(this.projectId);
        if(window.history.length > 1) {
          this.location.back();
        } else {
          this.router.navigate(['/']);
        }
        window.alert('プロジェクトを削除しました');
      } catch (error) {
        window.alert('プロジェクトの削除に失敗しました')
        console.error(error);
      } finally {
        this.loadingState = 'idle';
        console.log('loadingState', this.loadingState);
      }
  }

  ngOnDestroy(): void {
    console.log('onDestroy');
    this.formState.clear(this.key);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
