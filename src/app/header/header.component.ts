import { Component, inject, HostListener } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { doc, deleteDoc, collection, query, where, getDocs, updateDoc, Firestore, collectionGroup } from '@angular/fire/firestore';
import { firstValueFrom, take } from 'rxjs';
import { MenuService } from '../shares/MenuService';

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
  private firestore = inject(Firestore);
  // isMenuOpen: boolean = false;
  loading: 'idle' | 'deleting' | 'signout' = 'idle';
  private readonly menuService = inject(MenuService);
  openedMenu = this.menuService.openedMenu;

  async signout(): Promise<void> {
    this.loading = 'signout';
    try {
    await this.authService.signout();
    await this.router.navigate(['/signin']);
    } catch (error) {
      window.alert('ログアウトに失敗しました');
      console.error(error);
    } finally {
      this.loading = 'idle';
    }
  }

  goToMypage(): void {
    this.router.navigate(['/profile']);
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuService.toggle('header');
    // this.isMenuOpen = !this.isMenuOpen;
  }

  async deleteUser(): Promise<void> {
    const result = confirm('アカウントを削除しますか？');
    if(!result){
      window.alert('キャンセルされました');
      return;
    }
      this.loading = 'deleting';
    try {
      //firestoreのUsersコレクションからユーザーを削除
      const user = await firstValueFrom(this.authService.user$.pipe(take(1)));
      if(!user) return;
      const userRef = doc(this.firestore, 'users', user.uid);
      await deleteDoc(userRef);

      //firestoreのMembersコレクションからユーザーを削除
      const membersRef = collectionGroup(this.firestore, 'members');
      const q1 = query(membersRef, where('userid', '==', user.uid));
      const membersSnap = await getDocs(q1);
      await Promise.all(membersSnap.docs.map(docSnap => deleteDoc(docSnap.ref)));

      // firestoreのTasksコレクションから担当ユーザー情報を削除
      const tasksRef = collection(this.firestore, 'tasks');
      const q2 = query(tasksRef, where('assignedid', '==', user.uid));
      const tasksSnap = await getDocs(q2);
      await Promise.all(tasksSnap.docs.map(docSnap => updateDoc(docSnap.ref, { assignedname: '', assignedid: '' })));

      // ユーザーの削除
      await this.authService.deleteUser();
      window.alert('アカウントを削除しました');
      await this.router.navigate(['/signin']);
    } catch (error) {
      window.alert('アカウントの削除に失敗しました');
      console.error(error);
    } finally {
      this.loading = 'idle';
    }
  }

  @HostListener('document:click')
  closeMenu(): void {
    // this.isMenuOpen = false;
    this.menuService.close();
  }
}