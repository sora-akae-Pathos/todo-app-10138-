import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trimRequired, noWhitespace } from '../shares/custom-validators';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom, take, debounceTime, Observable, switchMap, Subject, takeUntil } from 'rxjs';
import { of } from 'rxjs';
import { doc, updateDoc, collection, serverTimestamp, Firestore, collectionData, DocumentReference, docData, collectionGroup, where, query, getDocs } from '@angular/fire/firestore';
import { FormStateService } from '../shares/FormStateService';
import { Location } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: "./profile.component.html",
  styleUrl: "./profile.component.css",
})
export class ProfileComponent {
  key!: string;
  userRef!: DocumentReference;
  user!: string;
  user$!: Observable<any>;
  displayname!: string;
  loadingState: 'idle' | 'saving' = 'idle';

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private formState = inject(FormStateService);
  private location = inject(Location);

  private destroy$ = new Subject<void>();

  profile_form = this.fb.group({
    displayname: ['', [trimRequired]],
  });

  ngOnInit() {
    this.key = `profile_form`;

    //ロード後に値を保存
    const saved = this.formState.load<any>(this.key);

    //ユーザー情報の取得準備(subscribeしないとデータは取得できない)
    this.user$ = this.authService.user$.pipe(
      switchMap(u => {
        if (!u) {
          window.alert('ログインしてください');
          return of(null);
        }

        const ref = doc(this.firestore, 'users', u.uid);
        return docData(ref);
      })
    );

    // 初期ロードフラグ
    let initialValue = true;

    // フォーム反映(ユーザー情報の取得)
    this.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (!user) return;

      const data = saved ?? {
        displayname: user.displayname ?? '',
      };

      this.profile_form.patchValue(data);

      initialValue = false;
    });

    this.profile_form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      if (initialValue) return;
    
      this.formState.save(this.key, value);
    });
  }


  async profileEdit() {
    const u = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!u) {
      window.alert('ログインしてください');
      return;
    }
    if (this.profile_form.invalid) return;

    this.loadingState = 'saving';
    try{
    const raw = this.profile_form.value;

    //usersのdisplaynameを更新
    const userRef = doc(this.firestore, 'users', u.uid);
    await updateDoc(userRef, {
      displayname: raw.displayname,
      updatedAt: serverTimestamp()
    });
    console.log('usersのdisplaynameを更新');

    //membersのdisplaynameを更新
    const membersRef = collectionGroup(this.firestore, 'members');
    const q1 = query(membersRef, where('userid', '==', u.uid));
    const membersSnap = await getDocs(q1);
    await Promise.all(
      membersSnap.docs.map(docSnap => 
        updateDoc(docSnap.ref, {
          displayname: raw.displayname,
          updatedAt: serverTimestamp(),
        })
      )
    );
    console.log('membersのdisplaynameを更新');

    //tasksのassignednameを更新
    const tasksRef = collection(this.firestore, 'tasks');
    const q2 = query(tasksRef, where('assignedid', '==', u.uid));
    const tasksSnap = await getDocs(q2);
    await Promise.all(
      tasksSnap.docs.map(docSnap => 
        updateDoc(docSnap.ref, {
          assignedname: raw.displayname,
          updatedAt: serverTimestamp(),
        })
      )
    );
    console.log('tasksのassignednameを更新');
    
    this.formState.clear(this.key);

    if(window.history.length > 1) {
      await this.location.back();
    } else {
      await this.router.navigate(['/']);
    }

    console.log(this.key);

    window.alert('プロフィールを更新しました');
} catch (error) {
  window.alert('プロフィールの更新に失敗しました')
  console.error(error);
} finally {
  this.loadingState = 'idle';
  console.log('loadingState', this.loadingState);
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

  ngOnDestroy(): void {
    console.log('onDestroy');

    this.destroy$.next();
    this.destroy$.complete();

    this.formState.clear(this.key);
  }
  
}
