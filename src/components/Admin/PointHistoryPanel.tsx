import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { buildPointHistory, filterPointHistory, POINT_HISTORY_LABELS, type PointHistoryKind } from '../../lib/pointHistory';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Pagination, usePaginated } from '../ui/Pagination';

export function PointHistoryPanel({ payments, users, initialUserId = '' }: { payments: any[]; users: any[]; initialUserId?: string }) {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>(payments);
  const [ledger, setLedger] = useState<any[]>([]);
  const [ready, setReady] = useState({ adjustments: false, transfers: false, payments: false, ledger: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({ kind: 'all', search: '', userId: initialUserId, start: '', end: '' });
  useEffect(() => setFilters(prev => ({ ...prev, userId: initialUserId })), [initialUserId]);
  useEffect(() => {
    const subscriptions = [
      { key: 'adjustments', name: 'point_adjustments', label: '관리자 조정', set: setAdjustments },
      { key: 'transfers', name: 'point_transfers', label: '선물', set: setTransfers },
      { key: 'payments', name: 'payments', label: '결제', set: setPaymentRecords },
      { key: 'ledger', name: 'point_ledger', label: '서버 포인트 원장', set: setLedger },
    ].map(source => onSnapshot(collection(db, source.name), snap => {
      source.set(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      setReady(prev => ({ ...prev, [source.key]: true }));
      setErrors(prev => { const next = { ...prev }; delete next[source.key]; return next; });
    }, error => {
      setErrors(prev => ({ ...prev, [source.key]: `${source.label} 기록 조회 실패 (${error.code}). Firestore 권한과 연결을 확인해주세요.` }));
      setReady(prev => ({ ...prev, [source.key]: true }));
    }));
    return () => subscriptions.forEach(unsubscribe => unsubscribe());
  }, []);
  const entries = useMemo(() => buildPointHistory(adjustments, transfers, paymentRecords, users, ledger), [adjustments, transfers, paymentRecords, users, ledger]);
  const filtered = useMemo(() => filterPointHistory(entries, filters), [entries, filters]);
  const page = usePaginated(filtered, 20);
  useEffect(() => page.setPage(1), [filters]);
  const total = (kinds: PointHistoryKind[]) => filtered.filter(e => kinds.includes(e.kind)).reduce((sum, e) => sum + e.amount, 0);
  const inputClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500';

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">포인트 내역 관리</h2>
        <p className="mt-2 text-sm text-slate-500">사용자별 지급·회수, 선물, 결제 차감·반환, 추천 보상을 확인합니다.</p>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        관리자 지급·회수 로그는 이 기능 적용 이후부터 기록됩니다. 과거 내역은 기존 선물·결제 문서에 남은 기록만 표시합니다.
        결제 포인트는 주문 생성 시 차감되므로 입금 대기·취소 주문도 포함됩니다. 과거 추천 보상의 수령인·처리 일시가 기록되지 않은 경우 ‘미기록’으로 표시합니다.
        선물·결제 기록 기반 내역은 완전한 잔액 감사 원장이 아니며, 기록 삭제 시 표시되지 않을 수 있습니다.
      </div>
      {Object.values(errors).map(message => <p key={message} role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>)}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: '필터 내 지급·보상', value: total(['grant', 'reward']) },
          { label: '필터 내 회수·사용', value: total(['reclaim', 'use']) },
          { label: '필터 내 선물', value: total(['gift']) },
          { label: '필터 내 반환', value: total(['refund']) },
        ].map(stat => <Card key={stat.label} className="p-4"><p className="text-xs text-slate-500">{stat.label}</p><p className="mt-2 text-xl font-bold">{stat.value.toLocaleString()} P</p></Card>)}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-500">유형
          <select className={inputClass} value={filters.kind} onChange={e => setFilters(prev => ({ ...prev, kind: e.target.value }))}>
            <option value="all">전체 유형</option>
            {Object.entries(POINT_HISTORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-500">사용자
          <select className={`${inputClass} max-w-64`} value={filters.userId} onChange={e => setFilters(prev => ({ ...prev, userId: e.target.value }))}>
            <option value="">전체 사용자</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">시작일<input type="date" className={inputClass} value={filters.start} onChange={e => setFilters(prev => ({ ...prev, start: e.target.value }))} /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">종료일<input type="date" className={inputClass} min={filters.start || undefined} value={filters.end} onChange={e => setFilters(prev => ({ ...prev, end: e.target.value }))} /></label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">검색<input className={`${inputClass} min-w-48`} placeholder="이름·UID·주문번호·사유" value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} /></label>
        <Button variant="outline" onClick={() => setFilters({ kind: 'all', search: '', userId: '', start: '', end: '' })}>필터 초기화</Button>
      </div>
      {filters.start && filters.end && filters.start > filters.end && <p role="alert" className="text-sm text-red-600">종료일은 시작일 이후로 선택해주세요.</p>}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['일시', '유형', '사용자 / 선물 대상', '금액', '잔액 전 → 후', '처리자', '사유 / 참조'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {page.sliced.map(entry => <tr key={entry.id} className="align-top hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-xs">{entry.timestamp === null ? '일시 미기록' : new Date(entry.timestamp).toLocaleString('ko-KR')}</td>
                <td className="px-4 py-3"><span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-xs font-bold">{POINT_HISTORY_LABELS[entry.kind]}</span><p className="mt-2 text-[10px] text-slate-400">{entry.source}</p></td>
                <td className="px-4 py-3"><p className="font-semibold">{entry.userName}</p><p className="mt-1 break-all text-[10px] text-slate-400">{entry.userId || 'UID 미기록'}</p>{entry.otherUserName && <p className="mt-2 text-xs">→ {entry.otherUserName}<span className="block break-all text-[10px] text-slate-400">{entry.otherUserId}</span></p>}</td>
                <td className="whitespace-nowrap px-4 py-3 font-bold">{['grant', 'refund', 'reward'].includes(entry.kind) ? '+' : ['reclaim', 'use'].includes(entry.kind) ? '−' : '↔'} {entry.amount.toLocaleString()} P</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{entry.before !== undefined && entry.after !== undefined ? `${entry.before.toLocaleString()} → ${entry.after.toLocaleString()}` : '미기록'}</td>
                <td className="px-4 py-3 text-xs">{entry.actor}</td>
                <td className="max-w-64 px-4 py-3"><p className="break-words text-xs">{entry.reason}</p><p className="mt-2 break-all font-mono text-[10px] text-slate-400">{entry.reference}</p></td>
              </tr>)}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">{Object.values(ready).some(value => !value) ? '포인트 기록을 불러오는 중입니다.' : Object.keys(errors).length ? '일부 기록을 불러오지 못했습니다. 위 오류를 확인해주세요.' : '조건에 맞는 포인트 기록이 없습니다.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page.page} totalItems={filtered.length} pageSize={20} onPageChange={page.setPage} />
      </Card>
    </section>
  );
}
