import { inject, Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);

  user$ = authState(this.auth);

  // 登録
  signup(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  // ログイン
  signin(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  // 認証状態確認
  isAuthenticated(): Observable<boolean> {
    return this.user$.pipe(
      map(user => {
        if(user){
          return true;
        }else{
          return false;
        }
      })
    );
  }

  // getUid(): string | null {
  //   return this.auth.currentUser?.uid ?? null;
  // }

  // signout
  signout() {
    return signOut(this.auth);
    // await signOut(this.auth);
    // this.router.navigate(['/signin']);
  }
}