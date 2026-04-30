import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trimRequired, noWhitespace } from '../shares/custom-validators';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom, take, debounceTime, Observable } from 'rxjs';
import { doc, updateDoc, collection, serverTimestamp, Firestore, collectionData, DocumentReference, docData, collectionGroup, where, query, getDocs } from '@angular/fire/firestore';
import { FormStateService } from '../shares/FormStateService';
import { Location } from '@angular/common';
import { toDateInputString, toTimestamp } from '../shares/utiles';

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
  vm$!: Observable<{ user: any | null; members: any[] }>;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formState = inject(FormStateService);
  private location = inject(Location);
  private isSavingEnabled = true;

  profile_form = this.fb.group({
    displayname: ['', [trimRequired]],
  });

  ngOnInit() {
    //セッションごとにキーを作成(タブで複製されても対応可能)
    this.key = `profile_form`;
    this.user$ = this.authService.user$.pipe(take(1));
    this.user$.subscribe(u => {
      if (!u) {
        window.alert('ログインしてください');
        return;
      }
      this.userRef = doc(this.firestore, 'users', u.uid);
    });
    this.user$ = docData(this.userRef);

    const saved = this.formState.load<any>(this.key);

    // 初期ロードフラグ
    let initialValue = true;

     // DB取得 → フォーム反映（セッション優先）
    this.user$.subscribe(user => {
    this.user = user;

    const data = saved ?? {
      displayname: user?.displayname ?? '',
    };

    this.profile_form.patchValue(data);

    initialValue = false;
    
  });

  // フォーム変更 → セッション保存
  this.profile_form.valueChanges
    .pipe(debounceTime(300))
    .subscribe(value => {
      if (initialValue || !this.isSavingEnabled) return;
      this.formState.save(this.key, value);
      console.log(value);
    });
}

  async profileEdit() {
    try{
    const u = await firstValueFrom(this.authService.user$.pipe(take(1)));
    if (!u) {
      window.alert('ログインしてください');
      return;
    }
    if (this.profile_form.invalid) return;

    const raw = this.profile_form.value;

    //usersのdisplaynameを更新
    await updateDoc(this.userRef, {
      displayname: raw.displayname,
      updatedAt: serverTimestamp(),
    });

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

    this.isSavingEnabled = false;
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
    this.formState.clear(this.key);
  }
  
}
