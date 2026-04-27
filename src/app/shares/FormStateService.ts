import { inject, Injectable } from '@angular/core';
import { StorageService } from './StorageService';

@Injectable({ providedIn: 'root' })
export class FormStateService {

  private storage = inject(StorageService);

  save(key: string, value: unknown): void {
    this.storage.set(key, value);
  }

  load<T>(key: string): T | null {
    return this.storage.get<T>(key);
  }

  clear(key: string): void {
    this.storage.remove(key);
  }
}