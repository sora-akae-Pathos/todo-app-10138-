import { Component, inject, HostListener } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  isMenuOpen: boolean = false;
  
  async signout(): Promise<void> {
    await this.authService.signout();
    await this.router.navigate(['/signin']);
  }

  goToMypage(): void {
    this.router.navigate(['/profile']);
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.isMenuOpen = false;
  }
}