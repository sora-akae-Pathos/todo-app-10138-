import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorService {

  errorMessage: string = '';

  handleError(error: unknown): void {
    if (error instanceof Error) {
      switch (error.message) {
        case 'auth/email-already-in-use':
          this.errorMessage = 'このメールアドレスは既に使用されています';
          break;
        case 'auth/invalid-email':
          this.errorMessage = '正しいメールアドレスを入力してください';
          break;
        default:
          this.errorMessage = 'エラーが発生しました';
          break;
      }
    } else {
      this.errorMessage = '不明なエラーが発生しました';
    }
  }

}