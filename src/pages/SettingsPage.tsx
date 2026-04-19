import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '@/shared/auth/usePermission';
import { useAuth } from '@/features/auth/useAuth';
import { useAppUsers } from '@/features/settings/hooks/useAppUsers';
import { useUpdateProfileRole, useUpdateDisplayName } from '@/features/settings/hooks/useProfileMutations';
import type { Database } from '@/types/database.types';

type Role = Database['public']['Enums']['user_role'];

const ROLE_LABELS: Record<Role, string> = {
  rs_president: '상호부조회장',
  eq_president: '장로정원회장',
  bishopric: '감독단',
  viewer: '뷰어',
};

export default function SettingsPage() {
  const perm = usePermission();
  const { user, profile } = useAuth();
  const { data: users = [], isLoading } = useAppUsers();
  const updateRole = useUpdateProfileRole();
  const updateName = useUpdateDisplayName();

  const [editingName, setEditingName] = useState<string>(profile?.display_name ?? '');
  const [nameEditing, setNameEditing] = useState(false);

  if (!perm.canManageUsers) {
    return <Navigate to="/" replace />;
  }

  const onRoleChange = async (userId: string, role: Role) => {
    if (!confirm(`${userId === user?.id ? '본인의' : ''} 권한을 "${ROLE_LABELS[role]}" 으로 변경하시겠습니까?`)) return;
    try {
      await updateRole.mutateAsync({ userId, role });
    } catch (err) {
      alert(err instanceof Error ? err.message : '권한 변경 실패');
    }
  };

  const onSaveName = async () => {
    if (!user) return;
    try {
      await updateName.mutateAsync({ userId: user.id, displayName: editingName });
      setNameEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '이름 변경 실패');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">설정</h2>

      <section className="border rounded p-4">
        <h3 className="font-medium mb-3">내 프로필</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-slate-500">이메일:</span>{' '}
            <strong>{user?.email ?? '—'}</strong>
          </div>
          <div>
            <span className="text-slate-500">역할:</span>{' '}
            <strong>{profile?.role ? ROLE_LABELS[profile.role] : '—'}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">표시 이름:</span>
            {nameEditing ? (
              <>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <button onClick={onSaveName} disabled={updateName.isPending}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs disabled:opacity-60">
                  저장
                </button>
                <button onClick={() => { setNameEditing(false); setEditingName(profile?.display_name ?? ''); }}
                  className="text-slate-500 px-2 py-1 text-xs">
                  취소
                </button>
              </>
            ) : (
              <>
                <strong>{profile?.display_name ?? '—'}</strong>
                <button onClick={() => { setNameEditing(true); setEditingName(profile?.display_name ?? ''); }}
                  className="text-blue-600 hover:underline text-xs">
                  편집
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="border rounded p-4">
        <h3 className="font-medium mb-3">사용자 권한 관리</h3>
        {isLoading ? (
          <div className="text-slate-500 text-sm">불러오는 중...</div>
        ) : users.length === 0 ? (
          <div className="text-slate-500 text-sm italic">사용자 없음</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 px-3">이메일</th>
                <th className="py-2 px-3">표시 이름</th>
                <th className="py-2 px-3">역할</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b hover:bg-slate-50">
                  <td className="py-2 px-3">{u.email}</td>
                  <td className="py-2 px-3 text-slate-600">{u.display_name ?? '—'}</td>
                  <td className="py-2 px-3">
                    <select
                      value={u.role}
                      onChange={(e) => onRoleChange(u.user_id, e.target.value as Role)}
                      disabled={updateRole.isPending}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-slate-500 mt-3">
          ⚠ 본인의 권한을 감독단이 아닌 다른 값으로 바꾸면 이 페이지 접근을 잃게 됩니다.
        </p>
      </section>

      <section className="border rounded p-4 bg-slate-50">
        <h3 className="font-medium mb-2 text-slate-700">사용자 초대</h3>
        <p className="text-xs text-slate-600">
          신규 사용자는 <code>/login</code> 페이지에서 이메일로 가입하면 자동으로 <strong>뷰어</strong> 권한으로 생성됩니다.
          이후 이 페이지에서 역할을 부여하세요. (향후 플랜에서 이메일 초대 기능 추가 예정)
        </p>
      </section>
    </div>
  );
}
