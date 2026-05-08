import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { trimRequired, noWhitespace } from '../../shares/custom-validators';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports:[RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './signin.component.html',
  styleUrl:'./signin.component.css'
})
export class SignInComponent {

  errorMessage = '';
  loading: 'idle' | 'loading' = 'idle';

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  signinForm = this.fb.group({
    email: ['', [trimRequired, noWhitespace, Validators.email]],
    password: ['', [trimRequired, noWhitespace, Validators.minLength(8), Validators.maxLength(32)]]
  });

  get email(): FormControl {
    return this.signinForm.get('email') as FormControl;
  }
  
  get password(): FormControl {
    return this.signinForm.get('password') as FormControl;
  }

  async signin() {
    if (this.signinForm.invalid) return;

    // const { email, password } = this.signinForm.value;

    const raw = this.signinForm.value;

    const email = raw.email?.trim();
    const password = raw.password?.trim();
    this.loading = 'loading';

    try{
      await this.authService.signin(email!,password!)
      this.router.navigate(['/']);
    }catch(error:any){
      switch(error.code){

        case 'auth/invalid-credential':
          this.errorMessage = 'メールアドレスまたはパスワードが違います';
          break;
    
        case 'auth/too-many-requests':
          this.errorMessage = '試行回数が多すぎます。しばらく待ってください';
          break;
    
        default:
          this.errorMessage = 'ログインに失敗しました';
      }
      setTimeout(() => {
        this.errorMessage = '';
      }, 5000);
    } finally {
      this.loading = 'idle';
    }
  }

  googleLogin() {
    console.log('Googleログイン（未実装）');
  }
}