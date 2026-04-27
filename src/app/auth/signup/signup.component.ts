import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormControl, AbstractControl } from '@angular/forms';
import { Firestore, doc, setDoc, serverTimestamp, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { trimRequired, noWhitespace } from '../../shares/custom-validators';

type UserField = 'username' | 'email';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports:[RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './signup.component.html',
  styleUrl:'./signup.component.css'
})

export class SignUpComponent {

  errorMessage: string = '';

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private firestore = inject(Firestore);

  get username(): FormControl {
    return this.signupForm.get('username') as FormControl;
  }

  get email(): FormControl {
    return this.signupForm.get('email') as FormControl;
  }
  
  get password(): FormControl {
    return this.signupForm.get('password') as FormControl;
  }

  get usernameValue(): string {
    return this.username.value ?? '';
  }

  // get emailValue(): string {
  //   return this.email.value ?? '';
  // }

  ngOnInit(){
    this.signupForm.valueChanges.subscribe(value => {
      console.log(value);
      const { password, ...safeData } = value;
      localStorage.setItem('signupForm', JSON.stringify(safeData));
    });
    this.loadForm();
  }

  loadForm(){
    const saved = localStorage.getItem('signupForm');
    if(saved){
      this.signupForm.patchValue(JSON.parse(saved));
    }
  }

  // 新規登録フォーム
  signupForm = this.fb.group({
    username: ['', [trimRequired, Validators.maxLength(30)]],
    email: ['', [trimRequired, noWhitespace, Validators.email]],
    password: ['', [trimRequired, noWhitespace, Validators.minLength(8), Validators.maxLength(32)]]
  });

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
      localStorage.removeItem('signupForm');
      this.router.navigate(['/']); // 登録後の遷移
    } catch (error: any) {
      this.errorMessage = error.message;
    }
  }
}