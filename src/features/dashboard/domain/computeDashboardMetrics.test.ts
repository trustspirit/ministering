import { describe, expect, it } from 'vitest';
import { computeDashboardMetrics } from './computeDashboardMetrics';
import type { Member } from '@/features/members/types';
import type { Household } from '@/features/households/types';

const m = (p: Partial<Member>): Member => ({
  id: 'm', full_name: 'X', gender: 'M', birth_date: '1990-01-01',
  address: null, lat: null, lng: null, active_status: 'active',
  personality: 'moderate', memo: null, household_id: null,
  household_role: 'other', is_deleted: false,
  created_at: '2026-01-01', updated_at: '2026-01-01',
  ...p,
});

const h = (p: Partial<Household>): Household => ({
  id: 'h', name: 'X', address: null, lat: null, lng: null,
  created_at: '2026-01-01', updated_at: '2026-01-01',
  ...p,
});

describe('computeDashboardMetrics', () => {
  it('빈 데이터 → 0 & 활동률 0%', () => {
    const metrics = computeDashboardMetrics({
      members: [], households: [],
      rsMinistryCount: 0, eqMinistryCount: 0,
      rsRecipientMemberIds: new Set(),
      eqRecipientHouseholdIds: new Set(),
    });
    expect(metrics.rsMinistryCount).toBe(0);
    expect(metrics.eqMinistryCount).toBe(0);
    expect(metrics.totalMembers).toBe(0);
    expect(metrics.activeMembersPct).toBe(0);
    expect(metrics.unassignedSisterCount).toBe(0);
    expect(metrics.unassignedHouseholdCount).toBe(0);
  });

  it('활동률 = 활동 / 전체', () => {
    const metrics = computeDashboardMetrics({
      members: [
        m({ id: '1', active_status: 'active' }),
        m({ id: '2', active_status: 'active' }),
        m({ id: '3', active_status: 'less_active' }),
        m({ id: '4', active_status: 'less_active' }),
      ],
      households: [],
      rsMinistryCount: 0, eqMinistryCount: 0,
      rsRecipientMemberIds: new Set(),
      eqRecipientHouseholdIds: new Set(),
    });
    expect(metrics.activeMembersPct).toBe(50);
    expect(metrics.totalMembers).toBe(4);
  });

  it('미배정 자매 = 전체 자매 - RS recipient 자매', () => {
    const metrics = computeDashboardMetrics({
      members: [
        m({ id: 's1', gender: 'F' }),
        m({ id: 's2', gender: 'F' }),
        m({ id: 's3', gender: 'F' }),
        m({ id: 'b1', gender: 'M' }),
      ],
      households: [],
      rsMinistryCount: 1, eqMinistryCount: 0,
      rsRecipientMemberIds: new Set(['s1']),
      eqRecipientHouseholdIds: new Set(),
    });
    expect(metrics.unassignedSisterCount).toBe(2);
    expect(metrics.totalSisterCount).toBe(3);
  });

  it('미배정 가정 = 전체 - EQ recipient', () => {
    const metrics = computeDashboardMetrics({
      members: [],
      households: [h({ id: 'h1' }), h({ id: 'h2' }), h({ id: 'h3' })],
      rsMinistryCount: 0, eqMinistryCount: 1,
      rsRecipientMemberIds: new Set(),
      eqRecipientHouseholdIds: new Set(['h1']),
    });
    expect(metrics.unassignedHouseholdCount).toBe(2);
    expect(metrics.totalHouseholdCount).toBe(3);
  });

  it('조 수 반영', () => {
    const metrics = computeDashboardMetrics({
      members: [], households: [],
      rsMinistryCount: 5, eqMinistryCount: 3,
      rsRecipientMemberIds: new Set(),
      eqRecipientHouseholdIds: new Set(),
    });
    expect(metrics.rsMinistryCount).toBe(5);
    expect(metrics.eqMinistryCount).toBe(3);
  });

  it('활동률은 반올림', () => {
    const metrics = computeDashboardMetrics({
      members: [
        m({ id: '1', active_status: 'active' }),
        m({ id: '2', active_status: 'active' }),
        m({ id: '3', active_status: 'less_active' }),
      ],
      households: [],
      rsMinistryCount: 0, eqMinistryCount: 0,
      rsRecipientMemberIds: new Set(),
      eqRecipientHouseholdIds: new Set(),
    });
    expect(metrics.activeMembersPct).toBe(67);
  });
});
