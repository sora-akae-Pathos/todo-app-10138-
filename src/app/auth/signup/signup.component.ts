import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormControl, AbstractControl } from '@angular/forms';
import { Firestore, doc, setDoc, serverTimestamp, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { trimRequired, noWhitespace, passwordMismatch } from '../../shares/custom-validators';
import { FormStateService } from '../../shares/FormStateService';
import { debounceTime, Subject, takeUntil } from 'rxjs';

type UserField = 'username' | 'email';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports:[RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './signup.component.html',
  styleUrl:'./signup.component.css'
})

export class SignUpComponent {
  key!: string;
  errorMessage: string = '';
  loading: 'idle' | 'loading' = 'idle';
  
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private formState = inject(FormStateService);
  private destroy$ = new Subject<void>();

  get username(): FormControl {
    return this.signupForm.get('username') as FormControl;
  }

  get email(): FormControl {
    return this.signupForm.get('email') as FormControl;
  }
  
  get password(): FormControl {
    return this.signupForm.get('password') as FormControl;
  }

  get confirmPassword(): FormControl {
    return this.signupForm.get('confirmPassword') as FormControl;
  }

  // get usernameValue(): string {
  //   return this.username.value ?? '';
  // }

  // get emailValue(): string {
  //   return this.email.value ?? '';
  // }

  ngOnInit(){
    this.key = `signup_form`;
    const saved = this.formState.load<any>(this.key);
    if (saved) {
      this.signupForm.patchValue(saved);
    }
    this.signupForm.valueChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      const filteredValue = {
        username: value.username?.trim() ?? '',
        email: value.email?.trim() ?? '',
      };
      this.formState.save(this.key, filteredValue);
      console.log(filteredValue);
    });
  }

  // 新規登録フォーム
  signupForm = this.fb.group({
    username: ['', [trimRequired, Validators.maxLength(30)]],
    email: ['', [trimRequired, noWhitespace, Validators.email]],
    password: ['', [trimRequired, noWhitespace, Validators.minLength(8), Validators.maxLength(32)]],
    confirmPassword: ['', [trimRequired, noWhitespace, Validators.minLength(8), Validators.maxLength(32)]]
  }, { validator: passwordMismatch });

async isFieldTaken(field: UserField, value: string): Promise<boolean> {
  const usersRef = collection(this.firestore, 'users');
  const q = query(usersRef, where(field, '==', value));
  const snapshot = await getDocs(q);

  return !snapshot.empty;
}

async isUsernameTaken(username: string): Promise<boolean> {
  return this.isFieldTaken('username', username);
}

async isEmailTaken(email: string): Promise<boolean> {
  return this.isFieldTaken('email', email);
}

  async signup() { 
    if (this.signupForm.invalid) return;

    // const { username, email, password } = this.signupForm.value;

    const raw = this.signupForm.value;

    const username = raw.username?.trim();
    const email = raw.email?.trim();
    const password = raw.password?.trim();

    this.loading = 'loading';
    try {
      // ユーザー名、メールアドレスの重複チェック
      const usernametaken = await this.isUsernameTaken(username!);
      const emailTaken = await this.isEmailTaken(email!);
      if(usernametaken){
        this.errorMessage = 'このユーザー名は既に使用されています';
        return;
      }else if(emailTaken){
        this.errorMessage = 'このメールアドレスは既に使用されています';
        return;
      }

      // ユーザー作成
      const userCredential = await this.authService.signup(email!, password!);

      // uid取得
      const uid = userCredential.user.uid;

      // Firestoreに保存
      await setDoc(doc(this.firestore, 'users', uid), {
        username: username,
        email: email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      this.formState.clear(this.key);
      this.router.navigate(['/']);
    } catch (error: any) {
      switch(error.code){
        case 'auth/email-already-in-use':
          this.errorMessage = 'このメールアドレスは既に使用されています';
          break;
        default:
          this.errorMessage = '新規登録に失敗しました';
      }
    } finally {
      this.loading = 'idle';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}