import { inject, Injectable } from '@angular/core';
import { doc, updateDoc, deleteDoc, serverTimestamp, Firestore } from '@angular/fire/firestore';

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
    try {
      const ref = doc(this.firestore, 'projects', projectId);
      await deleteDoc(ref);
    } catch (e) {
      throw new Error('DELETE_PROJECT_FAILED');
    }
  }
}
