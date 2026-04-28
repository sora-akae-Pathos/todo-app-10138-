import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

//画面離脱時(コンポーネント破棄時)に呼ばれるインターフェイス
export interface CanComponentDeactivate {
  onLeave: () => void;
}

@Injectable({ providedIn: 'root' })
export class ClearSessionGuard implements CanDeactivate<CanComponentDeactivate> {

  canDeactivate(component: CanComponentDeactivate): boolean {
    component.onLeave();
    return true;
  }
}