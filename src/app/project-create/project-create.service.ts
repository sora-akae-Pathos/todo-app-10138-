import { Component, inject, Injectable } from '@angular/core';
import { setDoc, doc, addDoc, deleteDoc, collection, serverTimestamp, Firestore } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })

export class ProjectCreateService {

  private readonly firestore = inject(Firestore);

  async createProject(projectId: string, data:{
    name: string;
    name_kana: string;
    phrase: string;
    userId: string;
  }) {
    try{
    const projectRef = collection(this.firestore, 'projects');
    await addDoc(projectRef, {
      name: data.name,
      name_kana: data.name_kana,
      phrase: data.phrase,
      createdBy: data.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    }catch(e) {
      throw new Error('ADD_PROJECT_FAILED');
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
