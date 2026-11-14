import { describe, expect, it, beforeEach } from 'vitest';
import { useMemberFilterStore, filterMembers } from './store';
import type { Member } from './types';

const member = (p: Partial<Member>): Member => ({
  id: 'm',
  full_name: '홍길동',
  gender: 'M',
  birth_date: '1990-01-01',
  active_status: 'active',
  personality: 'moderate',
  phone: null,
  memo: null,
  household_id: null,
  household_role: 'other',
  is_deleted: false,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...p,
});

describe('useMemberFilterStore', () => {
  beforeEach(() => {
    useMemberFilterStore.setState({
      search: '',
      gender: 'all',
      activeStatus: 'all',
      personality: 'all',
    });
  });

  it('초기 상태는 모두 all/empty', () => {
    const s = useMemberFilterStore.getState();
    expect(s.search).toBe('');
    expect(s.gender).toBe('all');
  });

  it('set 으로 필드 업데이트 가능', () => {
    useMemberFilterStore.getState().setGender('F');
    expect(useMemberFilterStore.getState().gender).toBe('F');
  });

  it('reset 으로 초기화', () => {
    useMemberFilterStore.setState({ search: 'foo', gender: 'F' });
    useMemberFilterStore.getState().reset();
    expect(useMemberFilterStore.getState().search).toBe('');
    expect(useMemberFilterStore.getState().gender).toBe('all');
  });
});

describe('filterMembers', () => {
  const members = [
    member({ id: '1', full_name: '김성도', gender: 'M', active_status: 'active', personality: 'active' }),
    member({ id: '2', full_name: '이자매', gender: 'F', active_status: 'active', personality: 'moderate' }),
    member({ id: '3', full_name: '박형제', gender: 'M', active_status: 'less_active', personality: 'passive' }),
  ];

  it('검색어로 이름 필터', () => {
    const result = filterMembers(members, { search: '김', gender: 'all', activeStatus: 'all', personality: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0].full_name).toBe('김성도');
  });

  it('성별 필터', () => {
    const result = filterMembers(members, { search: '', gender: 'F', activeStatus: 'all', personality: 'all' });
    expect(result).toHaveLength(1);
  });

  it('활동 상태 필터', () => {
    const result = filterMembers(members, { search: '', gender: 'all', activeStatus: 'less_active', personality: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('활동 상태 필터: 새로운 회원', () => {
    const withNew = [...members, member({ id: '4', full_name: '최신입', active_status: 'new_member' })];
    const result = filterMembers(withNew, { search: '', gender: 'all', activeStatus: 'new_member', personality: 'all' });
    expect(result.map((m) => m.id)).toEqual(['4']);
  });

  it('복수 필터 조합', () => {
    const result = filterMembers(members, { search: '', gender: 'M', activeStatus: 'active', personality: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('모두 all 이면 전체 반환', () => {
    const result = filterMembers(members, { search: '', gender: 'all', activeStatus: 'all', personality: 'all' });
    expect(result).toHaveLength(3);
  });
});
