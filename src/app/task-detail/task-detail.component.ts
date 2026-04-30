import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trimRequired, noWhitespace } from '../shares/custom-validators';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom, take, debounceTime, Observable, combineLatest, map, startWith, switchMap } from 'rxjs';
import { doc, updateDoc, collection, serverTimestamp, Firestore, collectionData, DocumentReference, docData, deleteDoc } from '@angular/fire/firestore';
import { FormStateService } from '../shares/FormStateService';
import { toHiragana } from 'wanakana';
import { Location } from '@angular/common';
import { TaskDoc } from '../models/home.models';
import { toDateInputString, toTimestamp } from '../shares/utiles';
import { MemberDoc } from '../models/models';
// import { TaskDetailService } from './task-detail.service';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: "./task-detail.component.html",
  styleUrl: "./task-detail.component.css",
})
export class TaskDetailComponent {
  task!: TaskDoc;
  key!: string;
  task$!: Observable<any>;
  taskRef!: DocumentReference;
  projectId!: string;
  vm$!: Observable<{ user: any | null; members: any[] }>;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formState = inject(FormStateService);
  private location = inject(Location);
  // private taskDetailService = inject(TaskDetailService);
  private isSavingEnabled = true;

  task_detail_form = this.fb.group({
    title: ['', [trimRequired, Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(500)]],
    dueDate: ['', [Validators.required]],
    priority: ['', []],
    status: ['', []],
    assignedid: ['', []],
    approach: ['', [Validators.maxLength(100)]],
    completioncriteria: ['', [Validators.maxLength(100)]],
  });

  ngOnInit() {
    const taskId = this.route.snapshot.paramMap.get('taskId');
    if (!taskId) throw new Error('taskIdが取得できませんでした');

    //セッションごとにキーを作成(タブで複製されても対応可能)
    this.key = `task_detail_form_${taskId}`;
    this.taskRef = doc(this.firestore, 'tasks', taskId);
    this.task$ = docData(this.taskRef, { idField: 'id' });

    const saved = this.formState.load<any>(this.key);

    // 初期ロードフラグ
    let initialValue = true;

     // DB取得 → フォーム反映（セッション優先）
    this.task$.subscribe(task => {
    this.task = task;

    const data = saved ?? {
      title: task?.title ?? '',
      projectid: task?.projectid ?? '',
      description: task?.description ?? '',
      dueDate: toDateInputString(task?.dueDate),
      priority: task?.priority ?? '',
      status: task?.status ?? '',
      assignedid: task?.assignedid ?? '',
      approach: task?.approach ?? '',
      completioncriteria: task?.completioncriteria ?? '',
    };

    this.task_detail_form.patchValue(data);

    initialValue = false;
    
  });

  // フォーム変更 → セッション保存
  this.task_detail_form.valueChanges
    .pipe(debounceTime(300))
    .subscribe(value => {
      if (initialValue || !this.isSavingEnabled) return;
      this.formState.save(this.key, value);
      console.log(value);
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
  return this.task$.pipe(
    switchMap(task => {
      const ref = collection(
        this.firestore,
        'projects',
        task.projectid,
        'members'
      );
      return collectionData(ref, { idField: 'userid' });
    })
  );
}

  descLength$ = this.task_detail_form.get('description')!.valueChanges.pipe(
    map(v => v?.length || 0),
    startWith(0));
  apLength$ = this.task_detail_form.get('approach')!.valueChanges.pipe(
    map(v => v?.length || 0),
    startWith(0));
  compLength$ = this.task_detail_form.get('completioncriteria')!.valueChanges.pipe(
    map(v => v?.length || 0),
    startWith(0));

  async taskEdit() {
    try{
    const u = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!u) {
      window.alert('ログインしてください');
      return;
    }
    if (this.task_detail_form.invalid) return;

    const raw = this.task_detail_form.value;
    const title_kana = toHiragana(raw.title ?? '');

    //担当者の表示名取得
    const members =await firstValueFrom(this.watchMembers()) as MemberDoc[];
    const selected = members.find(m => m.userid === raw.assignedid);
    const assignedname = selected?.displayname;

    // const payload = {
    //   title: raw.title,
    //   title_kana: title_kana ,
    //   projectid: this.task.projectid,
    //   description: raw.description,
    //   dueDate: toTimestamp(raw.dueDate ?? null),
    //   priority: raw.priority,
    //   status: raw.status,
    //   assignedid: raw.assignedid,
    //   assignedname: assignedname,
    //   approach: raw.approach,
    //   completioncriteria: raw.completioncriteria,
    //   updatedAt: serverTimestamp(),
    //   updatedBy: u.uid,
    // }

    // await this.taskDetailService.updateTask(this.taskRef, payload);

    await updateDoc(this.taskRef, {
      title: raw.title,
      title_kana: title_kana,
      projectid: this.task.projectid,
      description: raw.description ?? '',
      dueDate: toTimestamp(raw.dueDate ?? null),
      priority: raw.priority ?? '',
      status: raw.status ?? '',
      assignedid: raw.assignedid ?? '',
      assignedname: assignedname ?? '',
      approach: raw.approach ?? '',
      completioncriteria: raw.completioncriteria ?? '',
      updatedAt: serverTimestamp(),
      updatedBy: u.uid,
    });

    this.isSavingEnabled = false;
    this.formState.clear(this.key);

    if(window.history.length > 1) {
      await this.location.back();
    } else {
      await this.router.navigate(['/']);
    }

    console.log(this.key);

    window.alert('課題を更新しました');
} catch (error) {
  window.alert('課題の更新に失敗しました')
  console.error(error);
}
}

  onCancel() {
    this.formState.clear(this.key);
    if(window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  async deleteTask() {
    if(confirm('課題を削除しますか？')) {
      try{
      await deleteDoc(this.taskRef);
      this.formState.clear(this.key);
      window.alert('課題を削除しました');
      if(window.history.length > 1) {
        this.location.back();
      } else {
        this.router.navigate(['/']);
      }
    } catch (error) {
      window.alert('課題の削除に失敗しました')
      console.error(error);
    }
    }
  }

  ngOnDestroy(): void {
    console.log('onDestroy');
    this.formState.clear(this.key);
  }
  
}
