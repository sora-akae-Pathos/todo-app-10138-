import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdleService } from './auth/Idel.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private idleService = inject(IdleService);

  constructor() {
    this.idleService.init();
  }
}
