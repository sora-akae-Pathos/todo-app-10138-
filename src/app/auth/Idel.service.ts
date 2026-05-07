import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private MAX_IDLE = 30 * 60 * 1000;

  private authService = inject(AuthService);
  private router = inject(Router);
  
  init() {
    this.update();

    window.addEventListener('click', this.update);
    window.addEventListener('keydown', this.update);
    window.addEventListener('storage', (event) => {
      if (event.key === 'signout') {
        this.authService.signout();
        }
      });

    setInterval(() => this.check(), 60_000); // 1分ごと
  }

  private update = () => {
    localStorage.setItem('lastActive', Date.now().toString());
  };

  private async check() {
    const last = Number(localStorage.getItem('lastActive') || 0);

    if (Date.now() - last > this.MAX_IDLE) {
      localStorage.setItem('signout', Date.now().toString());
      await this.authService.signout();
      await this.router.navigate(['/signin']);
    }
  }
}