import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorService {

  errorMessage: string = '';

  handleError(error: unknown): void {
    if (error instanceof Error) {
      switch (error.message) {
        case 'ADD_PROJECT_FAILED':
          this.errorMessage = '保存に失敗しました';
          break;
        case 'DELETE_PROJECT_FAILED':
          this.errorMessage = 'プロジェクトの削除に失敗しました';
          break;
        case 'UPDATE_PROJECT_FAILED':
          this.errorMessage = 'プロジェクトの更新に失敗しました';
          break;
        case 'JOIN_PROJECT_FAILED':
          this.errorMessage = 'プロジェクトの参加に失敗しました';
          break;
        case 'LEAVE_PROJECT_FAILED':
          this.errorMessage = 'プロジェクトの脱退に失敗しました';
          break;
        case 'DELETE_TASK_FAILED':
          this.errorMessage = 'タスクの削除に失敗しました';
          break;
        case 'UPDATE_TASK_FAILED':
          this.errorMessage = 'タスクの更新に失敗しました';
          break;
        case 'ADD_TASK_FAILED':
          this.errorMessage = 'タスクの追加に失敗しました';
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