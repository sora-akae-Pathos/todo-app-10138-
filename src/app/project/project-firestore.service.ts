import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  getDocs,
  updateDoc,
  query,
  where,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Timestamp } from 'firebase/firestore';
import { ProjectMemberOption, ProjectTaskView } from './project.models';

function toDate(v: unknown): Date {
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as Timestamp).toDate === 'function') {
    return (v as Timestamp).toDate();
  }
  if (v instanceof Date) return v;
  return new Date(0);
}

function mapTask(doc: Record<string, unknown> & { id: string }): ProjectTaskView {
  return {
    id: doc.id,
    projectid: String(doc['projectid'] ?? ''),
    title: String(doc['title'] ?? ''),
    description: String(doc['description'] ?? ''),
    dueDate: toDate(doc['dueDate']),
    assignedid: String(doc['assignedid'] ?? ''),
    assignedname: String(doc['assignedname'] ?? ''),
    priority: String(doc['priority'] ?? '中'),
    status: String(doc['status'] ?? '未対応'),
    approach: String(doc['approach'] ?? ''),
    completioncriteria: doc['completioncriteria'],
    createdAt: toDate(doc['createdAt']),
    updatedAt: toDate(doc['updatedAt']),
    createdBy: String(doc['createdBy'] ?? ''),
    updatedBy: String(doc['updatedBy'] ?? ''),
  };
}

@Injectable({ providedIn: 'root' })
export class ProjectFirestoreService {
  private readonly firestore = inject(Firestore);

  /** Firestore では projectid のみで絞る */
  watchTasksByProjectId(projectId: string): Observable<ProjectTaskView[]> {
    const tasksRef = collection(this.firestore, 'tasks');
    const q = query(tasksRef, where('projectid', '==', projectId));
    return collectionData(q, { idField: 'id' }).pipe(
      map((rows) => (rows as (Record<string, unknown> & { id: string })[]).map(mapTask)),
    );
  }

  watchMembers(projectId: string): Observable<ProjectMemberOption[]> {
    const ref = collection(this.firestore, 'projects', projectId, 'members');
    return collectionData(ref, { idField: 'id' }).pipe(
      map((rows) =>
        (rows as ({ id: string } & Record<string, unknown>)[]).map((r) => ({
          userid: String(r['userid'] ?? r.id),
          displayname: String(r['displayname'] ?? ''),
        })),
      ),
    );
  }

  watchProjectName(projectId: string): Observable<string | null> {
    return docData(doc(this.firestore, 'projects', projectId)).pipe(
      map((d) => (d ? String((d as { name?: string }).name ?? '') : null)),
    );
  }

  // プロジェクトを削除
  async deleteProject(projectid: string): Promise<void> {
    if(confirm('プロジェクトを削除しますか？')) {
      try{
        // メンバーを削除
        const membersRef = collection(this.firestore, 'projects', projectid, 'members');
        const membersSnap = await getDocs(membersRef);
        await Promise.all(membersSnap.docs.map(docSnap => deleteDoc(docSnap.ref)));

        // タスクを削除
        const tasksRef = collection(this.firestore, 'tasks');
        const q = query(tasksRef, where('projectid', '==', projectid));
        const tasksSnap = await getDocs(q);
        await Promise.all(tasksSnap.docs.map(docSnap => deleteDoc(docSnap.ref)));

        // プロジェクトを削除
        await deleteDoc(doc(this.firestore, 'projects', projectid));
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  }

  // プロジェクトから脱退
  async leaveProject(projectid: string, uid: string): Promise<void> {
    if(confirm('プロジェクトから脱退しますか？')) {
    try{
    // assignedname及びassignedidがnullに変更する
    const tasksRef = collection(this.firestore, 'tasks');
    const q = query(tasksRef, where('projectid', '==', projectid), where('assignedid', '==', uid));
    const tasksSnap = await getDocs(q);
    await Promise.all(tasksSnap.docs.map(docSnap => updateDoc(docSnap.ref, { assignedname: null, assignedid: null })));

    // メンバーを削除
    const memberRef = doc(this.firestore, 'projects', projectid, 'members', uid);
    await deleteDoc(memberRef);
    } catch (error) {
      console.error(error);
      throw error;
    }
    }
  }
}
