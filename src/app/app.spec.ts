import { Timestamp } from 'firebase/firestore';
import {
  dayLabelForDueDate,
  compareHomeTasks,
  toHomeRows,
} from './home/home-firestore.service';

describe('dayLabelForDueDate', () => {
  it('今日の日時なら「今日」を返す', () => {
    const now = new Date('2026-04-28T10:00:00');
    const due = Timestamp.fromDate(new Date('2026-04-28T18:00:00'));

    const result = dayLabelForDueDate(due, now);

    expect(result).toBe('今日');
  });

  it('明日の日時なら「明日」を返す', () => {
    const now = new Date('2026-04-28T10:00:00');
    const due = Timestamp.fromDate(new Date('2026-04-29T09:00:00'));

    expect(dayLabelForDueDate(due, now)).toBe('明日');
  });

  it('それ以外は null を返す', () => {
    const now = new Date('2026-04-28T10:00:00');
    const due = Timestamp.fromDate(new Date('2026-04-30T10:00:00'));

    expect(dayLabelForDueDate(due, now)).toBeNull();
  });

  it('due が null のとき null を返す', () => {
    const now = new Date('2026-04-28T10:00:00');

    expect(dayLabelForDueDate(null, now)).toBeNull();
  });
});

describe('compareHomeTasks', () => {
  const nowTs = Timestamp.fromDate(new Date());

  it('「今日」は「明日」より前に来る', () => {
    const a = { dayLabel: '今日', priority: '低', createdAt: nowTs } as any;
    const b = { dayLabel: '明日', priority: '低', createdAt: nowTs } as any;

    expect(compareHomeTasks(a, b)).toBeLessThan(0);
  });

  it('優先度が高い方が前に来る', () => {
    const a = { dayLabel: '今日', priority: '高', createdAt: nowTs } as any;
    const b = { dayLabel: '今日', priority: '低', createdAt: nowTs } as any;

    expect(compareHomeTasks(a, b)).toBeLessThan(0);
  });

  it('createdAtが古い方が前に来る', () => {
    const a = {
      dayLabel: '今日',
      priority: '低',
      createdAt: Timestamp.fromDate(new Date('2026-04-28T10:00:00')),
    } as any;

    const b = {
      dayLabel: '今日',
      priority: '低',
      createdAt: Timestamp.fromDate(new Date('2026-04-28T12:00:00')),
    } as any;

    expect(compareHomeTasks(a, b)).toBeLessThan(0);
  });
});

// describe('toHomeRows', () => {
//   it('今日・明日のタスクだけを返す', () => {
//     const now = new Date('2026-04-28T10:00:00');

//     const docs = [
//       {
//         id: '1',
//         dueDate: Timestamp.fromDate(new Date('2026-04-28T12:00:00')),
//         priority: '低',
//         createdAt: Timestamp.now(),
//       },
//       {
//         id: '2',
//         dueDate: Timestamp.fromDate(new Date('2026-04-29T12:00:00')),
//         priority: '低',
//         createdAt: Timestamp.now(),
//       },
//       {
//         id: '3',
//         dueDate: Timestamp.fromDate(new Date('2026-04-30T12:00:00')),
//         priority: '低',
//         createdAt: Timestamp.now(),
//       },
//     ] as any;

//     const result = toHomeRows(docs, now);

//     expect(result.length).toBe(2);
//     expect(result.map(r => r.id)).toEqual(['1', '2']);
//   });

//   it('dayLabel が付与される', () => {
//     const now = new Date('2026-04-28T10:00:00');

//     const docs = [
//       {
//         id: '1',
//         dueDate: Timestamp.fromDate(new Date('2026-04-28T12:00:00')),
//         priority: '低',
//         createdAt: Timestamp.now(),
//       },
//     ] as any;

//     const result = toHomeRows(docs, now);

//     expect(result[0].dayLabel).toBe('今日');
//   });

//   it('ソートされる（今日→明日）', () => {
//     const now = new Date('2026-04-28T10:00:00');

//     const docs = [
//       {
//         id: '2',
//         dueDate: Timestamp.fromDate(new Date('2026-04-29T12:00:00')),
//         priority: '低',
//         createdAt: Timestamp.now(),
//       },
//       {
//         id: '1',
//         dueDate: Timestamp.fromDate(new Date('2026-04-28T12:00:00')),
//         priority: '低',
//         createdAt: Timestamp.now(),
//       },
//     ] as any;

//     const result = toHomeRows(docs, now);

//     expect(result[0].id).toBe('1');
//   });
// });