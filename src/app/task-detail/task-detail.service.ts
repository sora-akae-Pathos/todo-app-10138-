import { inject, Injectable } from '@angular/core';
import { setDoc, doc, updateDoc, deleteDoc, collection, serverTimestamp, DocumentReference, Firestore, Timestamp } from '@angular/fire/firestore';
import { TaskDoc } from '../models/home.models';

@Injectable({ providedIn: 'root' })

export class TaskDetailService {

  async updateTask(taskref: DocumentReference, data:{
    title: string;
    title_kana: string;
    description: string;
    dueDate: Timestamp | null;
    priority: string;
    status: string;
    assignedid: string;
    assignedname: string;
    approach: string;
    completioncriteria: string;
    updatedBy: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    createdBy: string;
    projectid: string;
  }) {
    try{
    await updateDoc(taskref, {
      title: data.title,
      title_kana: data.title_kana,
      description: data.description,
      dueDate: data.dueDate,
      priority: data.priority,
      status: data.status,
      assignedid: data.assignedid,
      assignedname: data.assignedname,
      approach: data.approach,
      completioncriteria: data.completioncriteria,
      updatedAt: serverTimestamp(),
      updatedBy: data.updatedBy,
    });
    }catch(e) {
      throw new Error('UPDATE_TASK_FAILED');
    }
  }

  // async deleteTask(taskref: DocumentReference<TaskDoc>) {
  //   if(confirm('課題を削除しますか？')) {
  //     try{
  //       await deleteDoc(taskref);
  //     } catch (error) {
  //       throw error;
  //     }
  //   }
  // }
}
