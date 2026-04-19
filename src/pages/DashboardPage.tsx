import { useAuth } from '@/features/auth/useAuth';

export default function DashboardPage() {
  const { profile } = useAuth();
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">대시보드</h2>
      <p className="text-slate-700">
        환영합니다, <strong>{profile?.display_name ?? '사용자'}</strong>님. (role: {profile?.role ?? 'unknown'})
      </p>
      <p className="text-slate-500 text-sm mt-2">
        Plan 2에서 요약 카드와 지도 미니뷰가 추가됩니다.
      </p>
    </div>
  );
}
