import { inject, Injectable } from '@angular/core';
import { doc, updateDoc, deleteDoc, serverTimestamp, Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })

export class ProjectEditService {

  private readonly firestore = inject(Firestore);

  async updateProject(projectId: string, data:{
    name: string;
    name_kana: string;
    phrase: string;
    userId: string;
  }) {
    try{
    const projectRef = doc(this.firestore, 'projects', projectId);
    await updateDoc(projectRef, {
      name: data.name,
      name_kana: data.name_kana,
      phrase: data.phrase,
      updatedBy: data.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    }catch(e) {
      throw new Error('UPDATE_PROJECT_FAILED');
    }
  }

  async deleteProject(projectId: string) {
      try{
       // メンバーを削除
      const membersRef = collection(this.firestore, 'projects', projectId, 'members');
      const membersSnap = await getDocs(membersRef);
      await Promise.all(membersSnap.docs.map(docSnap => deleteDoc(docSnap.ref)));

      // タスクを削除
      const tasksRef = collection(this.firestore, 'tasks');
      const q = query(tasksRef, where('projectid', '==', projectId));
      const tasksSnap = await getDocs(q);
      await Promise.all(tasksSnap.docs.map(docSnap => deleteDoc(docSnap.ref)));

      // プロジェクトを削除
      await deleteDoc(doc(this.firestore, 'projects', projectId));
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
