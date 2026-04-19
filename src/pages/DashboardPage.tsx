import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { useRealtimeSync } from '@/shared/hooks/useRealtimeSync';

export default function DashboardPage() {
  const { profile } = useAuth();
  const { metrics, loading } = useDashboardData();

  useRealtimeSync(
    ['members', 'households', 'ministries', 'ministry_companions', 'ministry_member_recipients', 'ministry_household_recipients'],
    'dashboard',
  );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">대시보드</h2>
        <span className="text-sm text-slate-500">
          {profile?.display_name ?? '—'} · {profile?.role ?? 'unknown'}
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">불러오는 중...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="RS 조" value={metrics.rsMinistryCount} tone="pink" />
            <StatCard label="EQ 조" value={metrics.eqMinistryCount} tone="blue" />
            <StatCard
              label="미배정"
              value={metrics.unassignedSisterCount + metrics.unassignedHouseholdCount}
              tone="orange"
              hint={`자매 ${metrics.unassignedSisterCount} · 가정 ${metrics.unassignedHouseholdCount}`}
            />
            <StatCard
              label="활동 회원"
              value={`${metrics.activeMembersPct}%`}
              tone="green"
              hint={`총 ${metrics.totalMembers}명`}
            />
          </div>

          {(metrics.unassignedSisterCount > 0 || metrics.unassignedHouseholdCount > 0) && (
            <div className="border border-orange-200 bg-orange-50 rounded p-4 flex items-center justify-between">
              <div className="text-sm">
                <strong>미배정 알림:</strong> 자매 {metrics.unassignedSisterCount}명
                {' · '} 가정 {metrics.unassignedHouseholdCount}개
              </div>
              <div className="flex gap-2">
                {metrics.unassignedSisterCount > 0 && (
                  <Link to="/assignments/rs" className="bg-orange-600 text-white text-xs px-3 py-1 rounded">
                    RS 편성하러 →
                  </Link>
                )}
                {metrics.unassignedHouseholdCount > 0 && (
                  <Link to="/assignments/eq" className="bg-orange-600 text-white text-xs px-3 py-1 rounded">
                    EQ 편성하러 →
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link to="/members" className="border rounded p-4 hover:bg-slate-50 block">
              <div className="text-sm font-medium">회원 관리</div>
              <div className="text-xs text-slate-500 mt-1">추가/편집, CSV 업로드/내보내기</div>
            </Link>
            <Link to="/households" className="border rounded p-4 hover:bg-slate-50 block">
              <div className="text-sm font-medium">가정 관리</div>
              <div className="text-xs text-slate-500 mt-1">이름/주소 편집, 구성원 확인</div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string | number;
  tone: 'pink' | 'blue' | 'orange' | 'green';
  hint?: string;
}) {
  const toneMap = {
    pink: 'text-pink-700 bg-pink-50 border-pink-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    orange: 'text-orange-700 bg-orange-50 border-orange-200',
    green: 'text-green-700 bg-green-50 border-green-200',
  };
  return (
    <div className={`border rounded p-4 ${toneMap[tone]}`}>
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs mt-1 opacity-80">{hint}</div>}
    </div>
  );
}
