export function relativeTime(ts: any): string {
  if (!ts?.toDate) return '';
  const date: Date = ts.toDate();
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function fullTime(ts: any): string {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleString('ko-KR');
}
