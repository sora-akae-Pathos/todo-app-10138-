import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {

  set(key: string, value: unknown): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  get<T>(key: string): T | null {
    const item = sessionStorage.getItem(key);
    try {
      return item ? JSON.parse(item) as T : null;
    } catch {
      return null; // 壊れたデータ対策
    }
  }

  remove(key: string): void {
    sessionStorage.removeItem(key);
  }

  clear(): void {
    sessionStorage.clear();
  }
}