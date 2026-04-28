import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trimRequired } from '../shares/custom-validators';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom, take, debounceTime, Observable, combineLatest, map, startWith } from 'rxjs';
import { addDoc, collection, serverTimestamp, Firestore, collectionData, Timestamp } from '@angular/fire/firestore';
import { FormStateService } from '../shares/FormStateService';
import { toHiragana } from 'wanakana';
import { toTimestamp } from '../shares/utiles';
import { MemberDoc } from '../models/models';
import { CanComponentDeactivate } from '../shares/clear-session.guard';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './task-create.component.html',
  styleUrl: './task-create.component.css',
})

export class TaskCreateComponent implements CanComponentDeactivate {
  projectId!: string;
  key!: string;
  vm$!: Observable<{ user: any | null; members: any[] }>;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formState = inject(FormStateService);


ngOnInit() {
  // プロジェクトidの取得
  const id = this.route.snapshot.paramMap.get('projectId');
  if (!id) throw new Error('projectIdが取得できませんでした');
  this.projectId = id;

  // セッションストレージからの復元と保存
  this.key = `task_create_form_${this.projectId}`;
  const saved = this.formState.load<any>(this.key);
  if (saved) {
    this.task_create_form.patchValue(saved);
  }

  this.task_create_form.valueChanges
  .pipe(
    debounceTime(300)
  )
  .subscribe(value => {
    const filteredValue = {
      title: value.title?.trim(),
      dueDate: value.dueDate,
      priority: value.priority?.trim(),
      status: value.status?.trim(),
      assignedid: value.assignedid?.trim(),
      approach: value.approach?.trim(),
      completioncriteria: value.completioncriteria?.trim(),
      description: value.description?.trim(),
    };
    console.log(filteredValue);
    this.formState.save(this.key, filteredValue);
  });

  // メンバーの取得
  this.vm$ = combineLatest([
    this.authService.user$,
    this.watchMembers(),
  ]).pipe(
    map(([user, members]) => ({ user, members }))
  );
}

trackByMemberUserId(index: number, m: any) {
  return m.userid;
}

watchMembers() {
  const ref = collection(
    this.firestore,
    'projects',
    this.projectId,
    'members'
  );

  return collectionData(ref, { idField: 'userid' });
}

  task_create_form = this.fb.group({
    title: ['', [trimRequired, Validators.maxLength(50)]],
    description: ['', [trimRequired, Validators.maxLength(500)]],
    dueDate: ['', [Validators.required]],
    priority: ['', [Validators.required]],
    status: ['', [Validators.required]],
    assignedid: ['', [Validators.required]],
    approach: ['', [trimRequired, Validators.maxLength(100)]],
    completioncriteria: ['', [trimRequired, Validators.maxLength(100)]],
  });

  descLength$ = this.task_create_form.get('description')!.valueChanges.pipe(
    map(v => v?.length || 0),
    startWith(0));
  apLength$ = this.task_create_form.get('approach')!.valueChanges.pipe(
    map(v => v?.length || 0),
    startWith(0));
  compLength$ = this.task_create_form.get('completioncriteria')!.valueChanges.pipe(
    map(v => v?.length || 0),
    startWith(0));

  async createTask() {
    const u = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!u) {
      window.alert('ログインしてください');
      return;
    }
    if (this.task_create_form.invalid) return;

    const raw = this.task_create_form.value;
    const title_kana = toHiragana(raw.title ?? '');

    //担当者の表示名取得
    const members =await firstValueFrom(this.watchMembers()) as MemberDoc[];
    const selected = members.find(m => m.userid === raw.assignedid);
    const assignedname = selected?.displayname;

    const taskRef = collection(this.firestore, 'tasks');
    await addDoc(taskRef, {
      title: raw.title,
      title_kana: title_kana,
      projectid: this.projectId,
      description: raw.description,
      dueDate: toTimestamp(raw.dueDate ?? null),
      priority: raw.priority?.trim(),
      status: raw.status?.trim(),
      assignedid: raw.assignedid?.trim(),
      assignedname: assignedname,
      approach: raw.approach?.trim(),
      completioncriteria: raw.completioncriteria?.trim(),
      createdBy: u.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    

    await this.router.navigate(['/projects', this.projectId]);

    this.formState.clear(this.key);

    window.alert('課題を作成しました');
  }

  onCancel() {
    this.formState.clear(this.key);
    this.router.navigate(['/projects', this.projectId]);
  }

  onLeave(): void {
    this.formState.clear(this.key);
  }
}
