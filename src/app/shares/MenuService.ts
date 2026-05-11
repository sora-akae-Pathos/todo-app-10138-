import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  openedMenu = signal<string | null>(null);

  open(menu: string) {
    this.openedMenu.set(menu);
  }

  toggle(menu: string) {

    if (this.openedMenu() === menu) {
      this.openedMenu.set(null);
    } else {
      this.openedMenu.set(menu);
    }
  }

  close() {
    this.openedMenu.set(null);
  }
}