import { describe, expect, it } from 'vitest';
import type { Household } from '@/features/households/types';
import type { Member } from '@/features/members/types';
import { groupRoster } from './groupRoster';

const member = (p: Partial<Member> & Pick<Member, 'id' | 'full_name'>): Member => ({
  gender: 'M',
  birth_date: '1980-01-01',
  address: null,
  lat: null,
  lng: null,
  active_status: 'active',
  personality: 'moderate',
  phone: null,
  memo: null,
  household_id: null,
  household_role: 'other',
  is_deleted: false,
  created_at: '',
  updated_at: '',
  ...p,
});
const household = (p: Partial<Household> & Pick<Household, 'id' | 'name'>): Household => ({
  address: null,
  lat: null,
  lng: null,
  memo: null,
  created_at: '',
  updated_at: '',
  ...p,
});

const none = { search: '', gender: 'all', activeStatus: 'all', personality: 'all' } as const;

const hKim = household({ id: 'h1', name: '김철수 가정', address: '서울 강남구' });
const hAhn = household({ id: 'h2', name: '안영희 가정', address: '부산 중구' });
const hEmpty = household({ id: 'h3', name: '가나다 가정' });

const kimHusband = member({ id: 'a', full_name: '김철수', household_id: 'h1', household_role: 'husband', birth_date: '1975-01-01' });
const kimWife = member({ id: 'b', full_name: '박영미', gender: 'F', household_id: 'h1', household_role: 'wife', birth_date: '1978-01-01', active_status: 'less_active' });
const kimChild = member({ id: 'c', full_name: '김지훈', household_id: 'h1', household_role: 'child', birth_date: '2008-01-01', active_status: 'new_member' });
const ahn = member({ id: 'd', full_name: '안영희', gender: 'F', household_id: 'h2', household_role: 'wife' });
const lone = member({ id: 'e', full_name: '독거인' });

const members = [kimChild, kimWife, ahn, lone, kimHusband];
const households = [hKim, hAhn, hEmpty];

describe('groupRoster', () => {
  it('가정은 이름순, 구성원은 sortFamily 순서', () => {
    const groups = groupRoster(members, households, none);
    expect(groups.map((g) => g.household?.name ?? null)).toEqual([
      '가나다 가정',
      '김철수 가정',
      '안영희 가정',
      null,
    ]);
    expect(groups[1].members.map((m) => m.full_name)).toEqual(['김철수', '박영미', '김지훈']);
  });

  it('필터가 비어 있으면 구성원 0명 가정도 포함', () => {
    const groups = groupRoster(members, households, none);
    expect(groups[0].household?.id).toBe('h3');
    expect(groups[0].members).toEqual([]);
  });

  it("'가정 미지정'은 맨 끝에 오고 구성원이 있을 때만 있다", () => {
    const withLone = groupRoster(members, households, none);
    expect(withLone.at(-1)).toEqual({ household: null, members: [lone] });
    const without = groupRoster(members.filter((m) => m.id !== 'e'), households, none);
    expect(without.some((g) => g.household === null)).toBe(false);
  });

  it('household_id가 없는 가정을 가리키면 가정 미지정으로 묶는다', () => {
    const orphan = member({ id: 'o', full_name: '고아', household_id: 'gone' });
    const groups = groupRoster([orphan], households, none);
    expect(groups.at(-1)).toEqual({ household: null, members: [orphan] });
  });

  it('상태 필터: 걸린 구성원만, 걸린 구성원이 없는 가정은 제외', () => {
    const groups = groupRoster(members, households, { ...none, activeStatus: 'new_member' });
    expect(groups).toHaveLength(1);
    expect(groups[0].household?.id).toBe('h1');
    expect(groups[0].members.map((m) => m.id)).toEqual(['c']);
  });

  it('성별 필터', () => {
    const groups = groupRoster(members, households, { ...none, gender: 'F' });
    expect(groups.map((g) => g.household?.id)).toEqual(['h1', 'h2']);
    expect(groups[0].members.map((m) => m.id)).toEqual(['b']);
  });

  it('이름 검색은 걸린 구성원만 보인다', () => {
    const groups = groupRoster(members, households, { ...none, search: '박영미' });
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.id)).toEqual(['b']);
  });

  it('가정 이름이나 주소로 검색하면 그 가정의 구성원 전체를 보인다', () => {
    const byName = groupRoster(members, households, { ...none, search: '김철수 가정' });
    expect(byName).toHaveLength(1);
    expect(byName[0].members.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    const byAddress = groupRoster(members, households, { ...none, search: '부산' });
    expect(byAddress.map((g) => g.household?.id)).toEqual(['h2']);
  });

  it('가정 검색에 걸려도 다른 필터는 구성원에 적용된다', () => {
    const groups = groupRoster(members, households, { ...none, search: '김철수 가정', gender: 'F' });
    expect(groups[0].members.map((m) => m.id)).toEqual(['b']);
  });

  it('구성원 0명 가정도 이름으로 검색하면 나온다', () => {
    const groups = groupRoster(members, households, { ...none, search: '가나다' });
    expect(groups.map((g) => g.household?.id)).toEqual(['h3']);
  });

  it('검색은 대소문자를 구분하지 않고 앞뒤 공백을 무시한다', () => {
    const m = member({ id: 'z', full_name: 'Alice' });
    expect(groupRoster([m], [], { ...none, search: '  ALI ' })).toEqual([{ household: null, members: [m] }]);
  });
});
