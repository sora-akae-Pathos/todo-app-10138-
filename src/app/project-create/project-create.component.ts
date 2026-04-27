import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trimRequired, noWhitespace } from '../shares/custom-validators';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom, take, debounceTime } from 'rxjs';
import { setDoc, doc, addDoc, collection, serverTimestamp, Firestore } from '@angular/fire/firestore';
import { FormStateService } from '../shares/FormStateService';
import { toHiragana } from 'wanakana';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './project-create.component.html',
  styleUrl: './project-create.component.css',
})
export class ProjectCreateComponent {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private formState = inject(FormStateService);

  get name(): FormControl {
    return this.project_create_form.get('name') as FormControl;
  }
  get phrase(): FormControl {
    return this.project_create_form.get('phrase') as FormControl;
  }

  ngOnInit() {
    const saved = this.formState.load<any>('project_create_form');
    if (saved) {
      this.project_create_form.patchValue(saved);
    }

    this.project_create_form.valueChanges
    .pipe(
      debounceTime(300)
    )
    .subscribe(value => {
      const filteredValue = {
        name: value.name?.trim(),
        phrase: value.phrase?.trim(),
      };
      this.formState.save('project_create_form', filteredValue);
      console.log(filteredValue);
    // this.project_create_form.valueChanges.subscribe(value => {
    //   this.formState.save('project_create_form', value);
    });
  }

  project_create_form = this.fb.group({
    name: ['', [trimRequired, noWhitespace, Validators.maxLength(30)]],
    phrase: ['', [trimRequired, noWhitespace, Validators.minLength(4), Validators.maxLength(15)]],
  });

  async createProject() {
    const u = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!u) {
      window.alert('ログインしてください');
      return;
    }
    if (this.project_create_form.invalid) return;

    const raw = this.project_create_form.value;

    const name = raw.name?.trim();
    const phrase = raw.phrase?.trim();
    const name_kana = toHiragana(name);

    const projectRef = collection(this.firestore, 'projects');
    const projectDoc = await addDoc(projectRef, {
      name: name,
      name_kana: name_kana,
      phrase: phrase,
      createdBy: u.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(this.firestore, 'projects', projectDoc.id, 'members', u.uid), {
      userid: u.uid,
      projectid: projectDoc.id,
      displayname: u.displayName,
      joinedAt: serverTimestamp(),
    });

    await this.router.navigate(['/projects', projectDoc.id]);

    this.formState.clear('project_create_form');

    window.alert('プロジェクトを作成しました');
  }

  onCancel() {
    this.formState.clear('project_create_form');
    this.router.navigate(['/']);
  }
}
