import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { trimRequired, noWhitespace } from '../shares/custom-validators';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom, take, debounceTime, Observable } from 'rxjs';
import { updateDoc, doc, docData, deleteDoc, serverTimestamp, Firestore, DocumentReference } from '@angular/fire/firestore';
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
  private isSavingEnabled = true;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formState = inject(FormStateService);
  private location = inject(Location);
  private peService = inject(ProjectEditService);


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
    let initialValue = true;

     // DB取得 → フォーム反映（セッション優先）
    this.project$.subscribe(project => {
      if (!project) return;
      console.log(project);
      this.project = project;

      const data = saved ?? {
        name: project?.name,
        phrase: project?.phrase,
      };

      this.project_edit_form.patchValue(data);

      initialValue = false;
    });

    // フォーム変更 → セッション保存
  this.project_edit_form.valueChanges
  .pipe(debounceTime(300))
  .subscribe(value => {
    if (initialValue || !this.isSavingEnabled) return;
    this.formState.save(this.key, value);
  });
  }

  async editProject() {
    try {
    const u = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!u) {
      window.alert('ログインしてください');
      return;
    }

    if (!this.projectId) return;

    if (this.project_edit_form.invalid) return;

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
    }
  }

  ngOnDestroy(): void {
    console.log('onDestroy');
    this.formState.clear(this.key);
  }
}
