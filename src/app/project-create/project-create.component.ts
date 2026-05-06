import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trimRequired, noWhitespace } from '../shares/custom-validators';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom, take, debounceTime, Subject, takeUntil } from 'rxjs';
import { getDoc, setDoc, doc, addDoc, collection, serverTimestamp, Firestore } from '@angular/fire/firestore';
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
  key!: string;
  loading = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private formState = inject(FormStateService);

  private destroy$ = new Subject<void>();

  get name(): FormControl {
    return this.project_create_form.get('name') as FormControl;
  }
  get phrase(): FormControl {
    return this.project_create_form.get('phrase') as FormControl;
  }

  ngOnInit() {
    this.key = `project_create_form`;
    const saved = this.formState.load<any>(this.key);
    if (saved) {
      this.project_create_form.patchValue(saved);
    }

    this.project_create_form.valueChanges
    .pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    )
    .subscribe(value => {
      const filteredValue = {
        name: value.name?.trim(),
        phrase: value.phrase?.trim(),
      };
      this.formState.save(this.key, filteredValue);
      console.log(filteredValue);
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

    this.loading = true;
    try{
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

    const userDoc = await getDoc(doc(this.firestore, 'users', u.uid));
    const userData = userDoc.data() as { displayname?: string };
    const displayname = userData.displayname ?? '';

    await setDoc(doc(this.firestore, 'projects', projectDoc.id, 'members', u.uid), {
      userid: u.uid,
      projectid: projectDoc.id,
      displayname: displayname,
      joinedAt: serverTimestamp(),
    });

    await this.router.navigate(['/projects', projectDoc.id]);

    this.formState.clear(this.key);

    window.alert('プロジェクトを作成しました');
  } catch (error) {
    window.alert('プロジェクトの作成に失敗しました')
    console.error(error);
  } finally {
    this.loading = false;
    console.log('loading', this.loading);
  }
}

  onCancel() {
    this.formState.clear(this.key);
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    console.log('onDestroy');
    this.destroy$.next();
    this.destroy$.complete();
    this.formState.clear(this.key);
  }
}
