import { Timestamp } from 'firebase/firestore';


export function toDateInputString(timestamp: Timestamp | null): string {
  if (!timestamp) return '';
  // return timestamp.toDate().toISOString().substring(0, 10);
  const d = timestamp.toDate();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function toTimestamp(dateString: string | null): Timestamp | null {
  if (!dateString) return null;

  const [y,m,d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d); //ローカル00;00

  return Timestamp.fromDate(date);
}

//全角数字を半角に変換
export function normalizeNumbers(input: string): string {
  return input.replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
    );
  }