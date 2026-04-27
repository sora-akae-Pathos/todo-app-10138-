import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { trimRequired, noWhitespace } from '../shares/custom-validators';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom, take, debounceTime } from 'rxjs';
import { setDoc, doc, addDoc, collection, serverTimestamp, Firestore } from '@angular/fire/firestore';
import { FormStateService } from '../shares/FormStateService';
import { toHiragana } from 'wanakana';

@Component({
  selector: 'app-project-edit',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './project-edit.component.html',
  styleUrl: './project-edit.component.css',
})
export class ProjectEditComponent {
  projectId: string | null = null;
  key: string | null = null;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formState = inject(FormStateService);
  private location = inject(Location);


  get name(): FormControl {
    return this.project_edit_form.get('name') as FormControl;
  }
  get phrase(): FormControl {
    return this.project_edit_form.get('phrase') as FormControl;
  }

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    if (!this.projectId) throw new Error('projectIdが取得できませんでした');

    //セッションごとにキーを作成(タブで複製されても対応可能)
    this.key = `project_edit_form_${this.projectId}`;
    const saved = this.formState.load<any>(this.key);
    if (saved) {
      this.project_edit_form.patchValue(saved);
    }

    this.project_edit_form.valueChanges
    .pipe(
      debounceTime(300)
    )
    .subscribe(value => {
      const filteredValue = {
        name: value.name?.trim(),
        phrase: value.phrase?.trim(),
      };
      this.formState.save(this.key ?? '', filteredValue);
      console.log(filteredValue);
    });
  }

  project_edit_form = this.fb.group({
    name: ['', [trimRequired, noWhitespace, Validators.maxLength(30)]],
    phrase: ['', [trimRequired, noWhitespace, Validators.minLength(4), Validators.maxLength(15)]],
  });

  async editProject() {
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

    const projectRef = doc(this.firestore, 'projects', this.projectId);
    await setDoc(projectRef, {
      name: name,
      name_kana: name_kana,
      phrase: phrase,
      createdBy: u.uid,
      updatedAt: serverTimestamp(),
    });

    await this.router.navigate(['/projects', this.projectId]);

    this.formState.clear(this.key ?? '');

    window.alert('プロジェクトを保存しました');
  }

  onCancel() {
    this.formState.clear(this.key ?? '');
    if(window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}
