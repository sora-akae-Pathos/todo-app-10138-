import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDocs,
  docData,
  orderBy,
  getDoc,
  updateDoc,
  setDoc,
  query,
  where,
  limit,
  collectionGroup,
  serverTimestamp,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Timestamp } from 'firebase/firestore';
import {
  HomeTaskRow,
  JoinedProjectView,
  PRIORITY_ORDER,
  ProjectSearchHit,
  TaskDoc,
} from '../models/home.models';
import { toHiragana } from 'wanakana';

/** 本日 00:00:00.000（ローカル） */
function startOfLocalDay(base: Date): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 本日 23:59:59.999（ローカル） */
function endOfLocalDay(base: Date): Date {
  const d = new Date(base);
  d.setHours(23, 59, 59, 999);
  return d;
}

// 日付を加算する
function addLocalDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * dueDate クエリ用: 今日0時〜明日23:59:59.999（ローカル）
 * （今日・明日の dueDate を timestamp 範囲で取得）
 */
function dueDateQueryBounds(now: Date = new Date()): { start: Date; end: Date } {
  const startToday = startOfLocalDay(now);
  const endTomorrow = endOfLocalDay(addLocalDays(now, 1));
  return { start: startToday, end: endTomorrow };
}

/**
 * 表示用 dayLabel: 今日・明日は各日 00:00〜23:59:59.999 で判定
 */
export function dayLabelForDueDate(due: Timestamp | null, now: Date = new Date()): '今日' | '明日' | null {
  if (!due) return null;
  const dueDate = due.toDate();
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const tomorrowStart = startOfLocalDay(addLocalDays(now, 1));
  const tomorrowEnd = endOfLocalDay(addLocalDays(now, 1));
  if (dueDate >= todayStart && dueDate <= todayEnd) return '今日';
  if (dueDate >= tomorrowStart && dueDate <= tomorrowEnd) return '明日';
  return null;
}

// 優先度の並び順を数値に変換する。緊急→「0」、未入力などは一番後ろになる
function priorityIndex(p: string): number {
  const i = PRIORITY_ORDER.indexOf(p as (typeof PRIORITY_ORDER)[number]);
  return i === -1 ? PRIORITY_ORDER.length : i;
}

/** 1.今日 2.明日 3.priority 4.createdAt 昇順 */
export function compareHomeTasks(a: HomeTaskRow, b: HomeTaskRow): number {
  const dayRank = (x: HomeTaskRow) => (x.dayLabel === '今日' ? 0 : 1);
  const byDay = dayRank(a) - dayRank(b);
  if (byDay !== 0) return byDay;
  const byPri = priorityIndex(a.priority) - priorityIndex(b.priority);
  if (byPri !== 0) return byPri;
  return a.createdAt.toMillis() - b.createdAt.toMillis();
}

// タスクを表示用のオブジェクトに変換する。
export function toHomeRows(docs: (TaskDoc & { id: string })[]): HomeTaskRow[] {
  const now = new Date();
  return docs
    .map((d) => {
      const label = dayLabelForDueDate(d.dueDate, now);
      if (!label) return null;
      const row: HomeTaskRow = { ...d, id: d.id, dayLabel: label };
      return row;
    })
    .filter((r): r is HomeTaskRow => r !== null)
    .sort(compareHomeTasks);
}

@Injectable({ providedIn: 'root' })

export class HomeFirestoreService {
  private readonly firestore = inject(Firestore);

  private readonly getProjectDoc$ = (id: string) => {
    const ref = doc(this.firestore, 'projects', id);
    return docData(ref, { idField: 'id' });
  }

  /** assignedid == uid かつ dueDate が今日〜明日（範囲クエリ）かつ順番通りに並び替え */
  homeTasks$(uid: string): Observable<HomeTaskRow[]> {
    const { start, end } = dueDateQueryBounds();
    const tasksRef = collection(this.firestore, 'tasks');
    const q = query(
      tasksRef,
      where('assignedid', '==', uid),
      where('dueDate', '>=', Timestamp.fromDate(start)),
      where('dueDate', '<=', Timestamp.fromDate(end)),
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map((rows) => toHomeRows(rows as (TaskDoc & { id: string })[])),
    );
  }

  
    // 名前検索（Firestore の制約上、主に「先頭一致」に相当する範囲クエリで絞り込み）
    // 取得後に部分一致（大文字小文字無視）でフィルタする。
  searchProjectsByName$(term: string): Observable<ProjectSearchHit[]> {
    const t = toHiragana(term.trim());
    if (!t) return of([]);
    const coll = collection(this.firestore, 'projects');
    const qy = query(
      coll,
      where('name_kana', '>=', t),
      where('name_kana', '<=', t + '\uf8ff'),
      limit(50),
    );
    const lower = t.toLowerCase();
    return collectionData(qy, { idField: 'id' }).pipe(
      map((rows) =>
        (rows as (ProjectSearchHit & { id: string })[]).filter((r) =>
          r.name_kana.toLowerCase().includes(lower),
        ),
      ),
    );
  }

  /** 参加中プロジェクト（members の collectionGroup を監視） */
  joinedProjects$(uid: string): Observable<JoinedProjectView[]> {
    const q = query(collectionGroup(this.firestore, 'members'),where('userid', '==', uid),orderBy('joinedAt', 'desc'));
    // return fromRef(q).pipe(
    //   switchMap((snap) => {
    //     const ids = [...new Set(snap.docs.map((d) => d.ref.parent.parent!.id))];
      return collectionData(q).pipe(
        // tap(members => console.log('members:', members)),
        switchMap((members: any[]) => {
        const ids = [...new Set(members.map(m => m.projectid))];
          // console.log('ids:', ids);
        if (ids.length === 0) return of([]);
        return combineLatest(
          ids.map((id) => this.getProjectDoc$(id)),
        ).pipe(
          map((list) =>
            list
              .filter((p): p is JoinedProjectView => !!p && typeof (p as JoinedProjectView).name === 'string')
              // .sort((a, b) => a.name.localeCompare(b.name, 'ja')),
          ),
        );
      }),
    );
  }

  /** 合言葉が一致したときのみ members/{uid} を作成（既存なら何もしない） */
  async joinProject(projectid: string, phrase: string, uid: string): Promise<void> {
    const projRef = doc(this.firestore, 'projects', projectid);
    const projSnap = await getDoc(projRef);
    if (!projSnap.exists()) {
      throw new Error('プロジェクトが見つかりません');
    }
    const proj = projSnap.data() as { phrase?: string };
    if (proj.phrase !== phrase) {
      throw new Error('合言葉が一致しません');
    }
    const memberRef = doc(this.firestore, 'projects', projectid, 'members', uid);
    const existing = await getDoc(memberRef);
    if (existing.exists()) {
      return;
    }
    const userSnap = await getDoc(doc(this.firestore, 'users', uid));
    const u = userSnap.data() as { displayname?: string } | undefined;
    const displayname = u?.displayname ?? '';
    await setDoc(memberRef, {
      userid: uid,
      projectid: projectid,
      displayname,
      joinedAt: serverTimestamp(),
    });
  }

  /** プロジェクトを削除 */
  async deleteProject(projectid: string): Promise<void> {
    if(confirm('プロジェクトを削除しますか？')) {
    try{
    // メンバーを削除
    const membersRef = collection(this.firestore, 'projects', projectid, 'members');
    const membersSnap = await getDocs(membersRef);
    await Promise.all(membersSnap.docs.map(docSnap => deleteDoc(docSnap.ref)));
    // for (const member of membersSnap.docs) {
    //   await deleteDoc(doc(this.firestore, 'projects', projectid, 'members', member.id));
    // }

    // タスクを削除
    const tasksRef = collection(this.firestore, 'tasks');
    const q = query(tasksRef, where('projectid', '==', projectid));
    const tasksSnap = await getDocs(q);
    await Promise.all(tasksSnap.docs.map(docSnap => deleteDoc(docSnap.ref)));

    // プロジェクトを削除
    const projRef = doc(this.firestore, 'projects', projectid);
    await deleteDoc(projRef);
    } catch (error) {
      console.error(error);
      throw error;
    }
    }
  }

  /** プロジェクトを脱退 */
  async leaveProject(projectid: string, uid: string): Promise<void> {
    if(confirm('プロジェクトから脱退しますか？')) {
    try{
    // assignedname及びassignedidがnullに変更する
    const tasksRef = collection(this.firestore, 'tasks');
    const q = query(tasksRef, where('projectid', '==', projectid), where('assignedid', '==', uid));
    const tasksSnap = await getDocs(q);
    await Promise.all(tasksSnap.docs.map(docSnap => updateDoc(docSnap.ref, { assignedname: '', assignedid: '' })));

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
